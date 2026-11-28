// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! GPU / NPU discovery. Where the kernel exposes them depends on the board and its
//! kernel: Adreno through kgsl (Qualcomm vendor kernels) or msm DRM + devfreq (mainline),
//! the Hexagon NPU through remoteproc + fastrpc, other accelerators through /dev/accel.

use std::env;
use std::path::PathBuf;

use serde_json::{json, Value};

use crate::sys::{read_f64, Sys};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Kind {
    Gpu,
    Npu,
}

#[derive(Debug)]
pub struct Freq {
    pub cur: PathBuf,
    pub max: Option<PathBuf>,
    /// Divides the raw value to get MHz.
    pub divisor: f64,
}

impl Freq {
    pub fn cur_mhz(&self) -> Option<f64> {
        read_f64(&self.cur).map(|v| v / self.divisor).filter(|v| *v > 0.0)
    }

    pub fn max_mhz(&self) -> Option<f64> {
        self.max.as_ref().and_then(|p| read_f64(p)).map(|v| v / self.divisor).filter(|v| *v > 0.0)
    }
}

#[derive(Debug, Default)]
pub struct Device {
    pub name: Option<String>,
    pub busy_file: Option<PathBuf>,
    pub freq: Option<Freq>,
    /// Relative sysfs path of the remoteproc running the accelerator firmware.
    pub remoteproc: Option<String>,
    pub present: bool,
}

impl Device {
    pub fn read_busy(&self) -> Option<f64> {
        let text = std::fs::read_to_string(self.busy_file.as_ref()?).ok()?;
        crate::parse::parse_busy(&text)
    }

    pub fn state(&self, sys: &Sys) -> Option<String> {
        sys.read_trim(&format!("{}/state", self.remoteproc.as_ref()?))
    }
}

/// Classifies an open file descriptor target: (kind, has DRM usage stats in fdinfo).
pub fn classify_fd(target: &str) -> Option<(Kind, bool)> {
    if target.starts_with("/dev/dri/") {
        Some((Kind::Gpu, true))
    } else if target.starts_with("/dev/kgsl") {
        Some((Kind::Gpu, false))
    } else if target.starts_with("/dev/accel/") {
        Some((Kind::Npu, true))
    } else if let Some(rest) = target.strip_prefix("/dev/fastrpc-") {
        is_npu_dsp(rest).then_some((Kind::Npu, false))
    } else {
        None
    }
}

fn is_npu_dsp(name: &str) -> bool {
    let n = name.to_lowercase();
    ["cdsp", "nsp", "gdsp", "npu"].iter().any(|k| n.contains(k))
}

fn env_path(var: &str) -> Option<PathBuf> {
    env::var_os(var).filter(|v| !v.is_empty()).map(PathBuf::from)
}

fn hz_freq(sys: &Sys, cur: &str, max: &str) -> Option<Freq> {
    sys.exists(cur).then(|| Freq {
        cur: sys.p(cur),
        max: sys.exists(max).then(|| sys.p(max)),
        divisor: 1e6,
    })
}

/// First devfreq device whose name contains one of `keys`, as (name, frequency).
fn devfreq_match(sys: &Sys, keys: &[&str]) -> Option<(String, Freq)> {
    sys.list("sys/class/devfreq").into_iter().find_map(|name| {
        let lower = name.to_lowercase();
        if !keys.iter().any(|k| lower.contains(k)) {
            return None;
        }
        let base = format!("sys/class/devfreq/{name}");
        hz_freq(sys, &format!("{base}/cur_freq"), &format!("{base}/max_freq")).map(|f| (name, f))
    })
}

pub fn remoteprocs(sys: &Sys) -> Vec<Value> {
    sys.list("sys/class/remoteproc")
        .into_iter()
        .map(|rp| {
            let base = format!("sys/class/remoteproc/{rp}");
            json!({
                "id": rp,
                "name": sys.read_trim(&format!("{base}/name")),
                "firmware": sys.read_trim(&format!("{base}/firmware")),
                "state": sys.read_trim(&format!("{base}/state")),
            })
        })
        .collect()
}

pub fn detect_gpu(sys: &Sys) -> Device {
    let mut d = Device::default();
    let kgsl = "sys/class/kgsl/kgsl-3d0";
    if sys.exists(kgsl) {
        d.present = true;
        d.name = sys.read_trim(&format!("{kgsl}/gpu_model")).or_else(|| Some("Adreno (kgsl)".into()));
    }

    let mut busy_candidates = vec![format!("{kgsl}/gpu_busy_percentage"), format!("{kgsl}/gpubusy")];
    for card in sys.list("sys/class/drm") {
        if card.starts_with("card") && !card.contains('-') {
            busy_candidates.push(format!("sys/class/drm/{card}/device/gpu_busy_percent"));
        }
    }
    d.busy_file = env_path("SYSMON_GPU_BUSY_FILE")
        .or_else(|| busy_candidates.iter().find(|c| sys.exists(c)).map(|c| sys.p(c)));

    d.freq = env_path("SYSMON_GPU_FREQ_FILE")
        .map(|cur| Freq { cur, max: None, divisor: 1e6 })
        .or_else(|| hz_freq(sys, &format!("{kgsl}/devfreq/cur_freq"), &format!("{kgsl}/devfreq/max_freq")))
        .or_else(|| hz_freq(sys, &format!("{kgsl}/gpuclk"), &format!("{kgsl}/max_gpuclk")))
        .or_else(|| {
            let (name, f) = devfreq_match(sys, &["gpu", "kgsl", "adreno", "mali"])?;
            d.name.get_or_insert_with(|| format!("GPU ({name})"));
            Some(f)
        });

    if d.name.is_none() {
        d.name = sys.list("sys/class/drm").into_iter().find_map(|card| {
            let driver = sys.link_name(&format!("sys/class/drm/{card}/device/driver"))?;
            let l = driver.to_lowercase();
            (l.contains("adreno") || l == "msm" || l.contains("gpu")).then(|| format!("GPU ({driver})"))
        });
    }

    d.present |= d.busy_file.is_some()
        || d.freq.is_some()
        || sys.list("dev/dri").iter().any(|n| n.starts_with("renderD"));
    d
}

pub fn detect_npu(sys: &Sys) -> Device {
    let mut d = Device::default();
    d.busy_file = env_path("SYSMON_NPU_BUSY_FILE");
    d.freq = env_path("SYSMON_NPU_FREQ_FILE")
        .map(|cur| Freq { cur, max: None, divisor: 1e6 })
        .or_else(|| devfreq_match(sys, &["npu", "nsp", "cdsp", "qaic", "accel"]).map(|(_, f)| f));

    for rp in sys.list("sys/class/remoteproc") {
        let base = format!("sys/class/remoteproc/{rp}");
        let name = sys.read_trim(&format!("{base}/name")).unwrap_or_default();
        let fw = sys.read_trim(&format!("{base}/firmware")).unwrap_or_default();
        if is_npu_dsp(&name) || is_npu_dsp(&fw) {
            d.name = Some(format!("Hexagon NPU / cDSP ({})", if name.is_empty() { &rp } else { &name }));
            d.remoteproc = Some(base);
            break;
        }
    }

    let accel = sys.list("dev/accel");
    if d.name.is_none() && !accel.is_empty() {
        d.name = Some(format!("Accelerator ({})", accel.join(", ")));
    }
    let fastrpc = sys.list("dev").into_iter().any(|n| n.strip_prefix("fastrpc-").is_some_and(is_npu_dsp));
    if d.name.is_none() && fastrpc {
        d.name = Some("Hexagon NPU / cDSP (fastrpc)".into());
    }
    d.present = d.busy_file.is_some() || d.freq.is_some() || d.remoteproc.is_some() || !accel.is_empty() || fastrpc;
    d
}

/// Everything found that may be useful to tune the GPU / NPU / thermal sources of a board.
pub fn probe(sys: &Sys) -> Value {
    let describe = |d: &Device| {
        json!({
            "present": d.present,
            "name": d.name,
            "busy_file": d.busy_file.as_ref().map(|p| p.display().to_string()),
            "busy_now": d.read_busy(),
            "freq_file": d.freq.as_ref().map(|f| f.cur.display().to_string()),
            "freq_mhz": d.freq.as_ref().and_then(Freq::cur_mhz),
            "freq_max_mhz": d.freq.as_ref().and_then(Freq::max_mhz),
            "remoteproc": d.remoteproc,
        })
    };
    let devfreq: Vec<Value> = sys
        .list("sys/class/devfreq")
        .into_iter()
        .map(|name| {
            let base = format!("sys/class/devfreq/{name}");
            json!({
                "name": name,
                "cur_freq": sys.read_trim(&format!("{base}/cur_freq")),
                "max_freq": sys.read_trim(&format!("{base}/max_freq")),
                "governor": sys.read_trim(&format!("{base}/governor")),
            })
        })
        .collect();
    let drm: Vec<Value> = sys
        .list("sys/class/drm")
        .into_iter()
        .filter(|c| !c.contains('-') && c != "version")
        .map(|c| json!({ "card": c, "driver": sys.link_name(&format!("sys/class/drm/{c}/device/driver")) }))
        .collect();
    let thermal: Vec<Value> = sys
        .list("sys/class/thermal")
        .into_iter()
        .filter(|z| z.starts_with("thermal_zone"))
        .map(|z| {
            json!({
                "zone": z,
                "type": sys.read_trim(&format!("sys/class/thermal/{z}/type")),
                "temp": sys.read_trim(&format!("sys/class/thermal/{z}/temp")),
            })
        })
        .collect();
    let dev_nodes: Vec<String> = sys
        .list("dev")
        .into_iter()
        .filter(|n| n.starts_with("fastrpc") || n.starts_with("kgsl") || n == "dri" || n == "accel")
        .chain(sys.list("dev/dri").into_iter().map(|n| format!("dri/{n}")))
        .chain(sys.list("dev/accel").into_iter().map(|n| format!("accel/{n}")))
        .collect();

    json!({
        "gpu": describe(&detect_gpu(sys)),
        "npu": describe(&detect_npu(sys)),
        "kgsl_files": sys.list("sys/class/kgsl/kgsl-3d0"),
        "devfreq": devfreq,
        "drm": drm,
        "remoteproc": remoteprocs(sys),
        "thermal_zones": thermal,
        "hwmon": sys.list("sys/class/hwmon").into_iter()
            .map(|h| json!({ "id": h.clone(), "name": sys.read_trim(&format!("sys/class/hwmon/{h}/name")) }))
            .collect::<Vec<_>>(),
        "dev_nodes": dev_nodes,
        "overrides": {
            "SYSMON_GPU_BUSY_FILE": env::var("SYSMON_GPU_BUSY_FILE").ok(),
            "SYSMON_GPU_FREQ_FILE": env::var("SYSMON_GPU_FREQ_FILE").ok(),
            "SYSMON_NPU_BUSY_FILE": env::var("SYSMON_NPU_BUSY_FILE").ok(),
            "SYSMON_NPU_FREQ_FILE": env::var("SYSMON_NPU_FREQ_FILE").ok(),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_fds() {
        assert_eq!(classify_fd("/dev/dri/renderD128"), Some((Kind::Gpu, true)));
        assert_eq!(classify_fd("/dev/kgsl-3d0"), Some((Kind::Gpu, false)));
        assert_eq!(classify_fd("/dev/accel/accel0"), Some((Kind::Npu, true)));
        assert_eq!(classify_fd("/dev/fastrpc-cdsp"), Some((Kind::Npu, false)));
        assert_eq!(classify_fd("/dev/fastrpc-adsp"), None);
        assert_eq!(classify_fd("/dev/null"), None);
    }
}
