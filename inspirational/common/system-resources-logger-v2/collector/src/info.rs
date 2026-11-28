// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! Static description of the board: model, SoC, CPU, kernel, OS and firmware versions.

use serde_json::{json, Map, Value};

use crate::accel;
use crate::parse::{parse_cpu_types, parse_os_release};
use crate::sys::{ip_addresses, Sys};

pub fn collect(sys: &Sys) -> Value {
    json!({
        "board": board(sys),
        "cpu": cpu(sys),
        "kernel": kernel(sys),
        "os": os(sys),
        "firmware": firmware(sys),
        "network": network(sys),
        "scope": sys.detect_scope(),
        "collector": env!("CARGO_PKG_VERSION"),
    })
}

/// Detects the Arduino board from the device tree / SoC id: "UNO Q", "VENTUNO Q" or None.
pub fn board_family(model: &str, soc: &str) -> Option<&'static str> {
    let text = format!("{model} {soc}").to_lowercase();
    if text.contains("ventuno") || text.contains("qcs8275") || text.contains("qcs8300") || text.contains("iq8") {
        Some("VENTUNO Q")
    } else if text.contains("uno q") || text.contains("unoq") || text.contains("imola") || text.contains("qrb2210")
        || text.contains("qcm2290")
    {
        Some("UNO Q")
    } else {
        None
    }
}

fn board(sys: &Sys) -> Value {
    let model = sys
        .read_trim("sys/firmware/devicetree/base/model")
        .or_else(|| sys.read_trim("proc/device-tree/model"))
        .or_else(|| sys.read_trim("sys/class/dmi/id/product_name"));
    let compatible = sys
        .read_trim("sys/firmware/devicetree/base/compatible")
        .or_else(|| sys.read_trim("proc/device-tree/compatible"));
    let soc0 = |f: &str| sys.read_trim(&format!("sys/devices/soc0/{f}"));
    let soc = soc0("machine").or_else(|| compatible.as_ref().and_then(|c| c.split(' ').next_back().map(str::to_string)));
    let family = board_family(model.as_deref().unwrap_or(""), &format!("{} {}", soc.as_deref().unwrap_or(""), compatible.as_deref().unwrap_or("")));
    json!({
        "model": model,
        "family": family,
        "compatible": compatible,
        "soc": soc,
        "soc_family": soc0("family"),
        "soc_id": soc0("soc_id"),
        "soc_revision": soc0("revision"),
        "soc_vendor": soc0("vendor"),
        "serial": soc0("serial_number"),
        "hostname": sys.read_trim("proc/sys/kernel/hostname"),
    })
}

fn cpu(sys: &Sys) -> Value {
    let cores: Vec<Value> = parse_cpu_types(&sys.read("proc/cpuinfo").unwrap_or_default())
        .into_iter()
        .map(|(name, count)| json!({ "name": name, "count": count }))
        .collect();
    let online = sys.list("sys/devices/system/cpu").iter().filter(|n| is_cpu_dir(n)).count();
    let max_mhz = sys
        .list("sys/devices/system/cpu")
        .iter()
        .filter(|n| is_cpu_dir(n))
        .filter_map(|n| sys.read_num::<f64>(&format!("sys/devices/system/cpu/{n}/cpufreq/cpuinfo_max_freq")))
        .fold(None, |acc: Option<f64>, v| Some(acc.map_or(v, |a| a.max(v))))
        .map(|khz| khz / 1000.0);
    json!({
        "types": cores,
        "count": online,
        "max_mhz": max_mhz,
        "governor": sys.read_trim("sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
    })
}

pub fn is_cpu_dir(name: &str) -> bool {
    name.strip_prefix("cpu").is_some_and(|n| !n.is_empty() && n.bytes().all(|b| b.is_ascii_digit()))
}

/// Splits /proc/version into (compiler, build string).
pub fn parse_proc_version(text: &str) -> (Option<String>, Option<String>) {
    // Top-level parenthesized groups: "(builder@host)" then "(compiler, linker)".
    let mut groups = Vec::new();
    let (mut depth, mut start) = (0usize, 0usize);
    for (i, c) in text.char_indices() {
        match c {
            '(' => {
                if depth == 0 {
                    start = i + 1;
                }
                depth += 1;
            }
            ')' if depth > 0 => {
                depth -= 1;
                if depth == 0 {
                    groups.push(&text[start..i]);
                }
            }
            _ => {}
        }
    }
    let compiler = groups
        .into_iter()
        .find(|g| !g.contains('@') && (g.contains("gcc") || g.contains("clang") || g.contains("GCC")))
        .map(str::to_string);
    let build = text.find(" #").map(|i| text[i + 1..].trim().to_string());
    (compiler, build)
}

/// Keeps the kernel command line keys that describe the boot chain (bootloader, slot, versions).
pub fn boot_params(cmdline: &str) -> Map<String, Value> {
    cmdline
        .split_whitespace()
        .filter_map(|tok| tok.split_once('='))
        .filter(|(k, _)| {
            let k = k.to_lowercase();
            ["bootloader", "version", "slot_suffix", "baseband", "hardware", "revision", "boot.uuid"]
                .iter()
                .any(|w| k.contains(w))
        })
        .map(|(k, v)| (k.to_string(), Value::String(v.to_string())))
        .collect()
}

fn kernel(sys: &Sys) -> Value {
    let version_text = sys.read_trim("proc/version").unwrap_or_default();
    let (compiler, build) = parse_proc_version(&version_text);
    let cmdline = sys.read_trim("proc/cmdline").unwrap_or_default();
    let modules = sys.read("proc/modules").map(|m| m.lines().count());
    let tainted = sys.read_num::<u64>("proc/sys/kernel/tainted");
    json!({
        "release": sys.read_trim("proc/sys/kernel/osrelease"),
        "version": sys.read_trim("proc/sys/kernel/version").or(build),
        "arch": machine(),
        "compiler": compiler,
        "cmdline": (!cmdline.is_empty()).then_some(cmdline.clone()),
        "boot_params": boot_params(&cmdline),
        "modules": modules,
        "tainted": tainted,
        "preempt": version_text.contains("PREEMPT_RT").then_some("PREEMPT_RT")
            .or_else(|| version_text.contains("PREEMPT").then_some("PREEMPT")),
    })
}

#[cfg(unix)]
fn machine() -> String {
    let mut u: libc::utsname = unsafe { std::mem::zeroed() };
    if unsafe { libc::uname(&mut u) } == 0 {
        let raw: Vec<u8> = u.machine.iter().take_while(|c| **c != 0).map(|c| *c as u8).collect();
        if let Ok(s) = String::from_utf8(raw) {
            return s;
        }
    }
    std::env::consts::ARCH.to_string()
}

#[cfg(not(unix))]
fn machine() -> String {
    std::env::consts::ARCH.to_string()
}

fn os(sys: &Sys) -> Value {
    let o = parse_os_release(&sys.read("etc/os-release").or_else(|| sys.read("usr/lib/os-release")).unwrap_or_default());
    json!({
        "name": o.get("PRETTY_NAME").or_else(|| o.get("NAME")),
        "id": o.get("ID"),
        "version": o.get("VERSION_ID"),
        "build": o.get("BUILD_ID").or_else(|| o.get("IMAGE_VERSION")),
        // Inside the App Lab container this is the Python image, not the board's distribution.
        "is_container_image": sys.detect_scope() == "container",
    })
}

/// One firmware line. `kind` is a stable key (uefi, ec, boot, soc_image, coprocessor, wifi,
/// ethernet, storage, gpu) that the dashboard translates; the other fields are raw values.
#[derive(Default)]
struct Fw {
    kind: &'static str,
    name: Option<String>,
    version: Option<String>,
    detail: Option<String>,
    state: Option<String>,
    driver: Option<String>,
    source: &'static str,
}

impl Fw {
    fn new(kind: &'static str, source: &'static str) -> Self {
        Fw { kind, source, ..Default::default() }
    }

    fn into_value(self) -> Option<Value> {
        if self.version.is_none() && self.detail.is_none() && self.state.is_none() && self.driver.is_none() {
            return None;
        }
        Some(json!({
            "kind": self.kind,
            "name": self.name,
            "version": self.version,
            "detail": self.detail,
            "state": self.state,
            "driver": self.driver,
            "source": self.source,
        }))
    }
}

fn firmware(sys: &Sys) -> Vec<Value> {
    let mut out: Vec<Fw> = Vec::new();
    let dmi = |f: &str| sys.read_trim(&format!("sys/class/dmi/id/{f}"));

    // UEFI / bootloader, when the firmware publishes SMBIOS tables.
    let bios_detail = [dmi("bios_vendor"), dmi("bios_date")].into_iter().flatten().collect::<Vec<_>>().join(" ? ");
    out.push(Fw {
        version: dmi("bios_version"),
        detail: (!bios_detail.is_empty()).then_some(bios_detail),
        ..Fw::new("uefi", "dmi")
    });
    out.push(Fw { version: dmi("ec_firmware_release"), ..Fw::new("ec", "dmi") });

    for (k, v) in boot_params(&sys.read_trim("proc/cmdline").unwrap_or_default()) {
        if k.to_lowercase().contains("bootloader") || k.to_lowercase().contains("version") {
            out.push(Fw { name: Some(k), version: v.as_str().map(str::to_string), ..Fw::new("boot", "cmdline") });
        }
    }
    out.push(Fw { version: sys.read_trim("sys/devices/soc0/build_id"), ..Fw::new("soc_image", "socinfo") });

    // DSP / modem / NPU firmware loaded by the kernel through remoteproc.
    for rp in accel::remoteprocs(sys) {
        let name = rp["name"].as_str().or_else(|| rp["id"].as_str()).map(str::to_string);
        out.push(Fw {
            name,
            version: rp["firmware"].as_str().map(str::to_string),
            state: rp["state"].as_str().map(str::to_string),
            ..Fw::new("coprocessor", "remoteproc")
        });
    }

    // Network adapters (Wi-Fi, Ethernet): ethtool reports the firmware version.
    for iface in sys.list("sys/class/net") {
        if iface == "lo" {
            continue;
        }
        let driver = sys.link_name(&format!("sys/class/net/{iface}/device/driver"));
        let info = if sys.is_real_root() { ethtool_drvinfo(&iface) } else { None };
        let wireless = sys.exists(&format!("sys/class/net/{iface}/wireless")) || sys.exists(&format!("sys/class/net/{iface}/phy80211"));
        let (fw, drv) = match info {
            Some(i) => (i.fw_version, i.driver.or(driver)),
            None => (None, driver),
        };
        out.push(Fw {
            name: Some(iface),
            version: fw,
            driver: drv,
            ..Fw::new(if wireless { "wifi" } else { "ethernet" }, "ethtool")
        });
    }

    // Storage controllers.
    for dev in sys.list("sys/bus/mmc/devices") {
        let base = format!("sys/bus/mmc/devices/{dev}");
        let kind = sys.read_trim(&format!("{base}/type")).unwrap_or_else(|| "MMC".into());
        if kind == "SDIO" {
            continue;
        }
        let name = sys.read_trim(&format!("{base}/name")).unwrap_or(dev.clone());
        out.push(Fw {
            name: Some(format!("{kind} {name}")),
            version: sys.read_trim(&format!("{base}/fwrev")).or_else(|| sys.read_trim(&format!("{base}/firmware_version"))),
            ..Fw::new("storage", "mmc")
        });
    }
    for dev in sys.list("sys/class/nvme") {
        let base = format!("sys/class/nvme/{dev}");
        out.push(Fw {
            name: Some(format!("NVMe {}", sys.read_trim(&format!("{base}/model")).unwrap_or(dev.clone()))),
            version: sys.read_trim(&format!("{base}/firmware_rev")),
            ..Fw::new("storage", "nvme")
        });
    }
    for dev in sys.list("sys/class/block") {
        if !(dev.starts_with("sd") && dev[2..].bytes().all(|b| b.is_ascii_lowercase())) {
            continue;
        }
        let base = format!("sys/class/block/{dev}/device");
        let label = [sys.read_trim(&format!("{base}/vendor")), sys.read_trim(&format!("{base}/model"))]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(" ");
        out.push(Fw {
            name: Some(format!("{dev} {label}").trim().to_string()),
            version: sys.read_trim(&format!("{base}/rev")),
            ..Fw::new("storage", "scsi")
        });
    }

    let gpu = accel::detect_gpu(sys);
    if gpu.present {
        out.push(Fw { version: sys.read_trim("sys/class/kgsl/kgsl-3d0/gpu_model"), detail: gpu.name, ..Fw::new("gpu", "gpu") });
    }
    out.into_iter().filter_map(Fw::into_value).collect()
}

fn network(sys: &Sys) -> Value {
    let mut ifaces = Map::new();
    for (name, ip) in ip_addresses() {
        if let Value::Array(list) = ifaces.entry(name).or_insert_with(|| Value::Array(Vec::new())) {
            list.push(Value::String(ip));
        }
    }
    let macs: Map<String, Value> = sys
        .list("sys/class/net")
        .into_iter()
        .filter(|i| i != "lo")
        .filter_map(|i| Some((i.clone(), Value::String(sys.read_trim(&format!("sys/class/net/{i}/address"))?))))
        .collect();
    json!({ "addresses": ifaces, "mac": macs })
}

#[derive(Debug, Default)]
pub struct DrvInfo {
    pub driver: Option<String>,
    pub fw_version: Option<String>,
}

#[cfg(target_os = "linux")]
fn ethtool_drvinfo(iface: &str) -> Option<DrvInfo> {
    #[repr(C)]
    struct EthtoolDrvinfo {
        cmd: u32,
        driver: [u8; 32],
        version: [u8; 32],
        fw_version: [u8; 32],
        bus_info: [u8; 32],
        erom_version: [u8; 32],
        reserved2: [u8; 12],
        n_priv_flags: u32,
        n_stats: u32,
        testinfo_len: u32,
        eedump_len: u32,
        regdump_len: u32,
    }
    #[repr(C)]
    struct IfReq {
        name: [u8; 16],
        data: *mut libc::c_void,
        _pad: [u8; 16],
    }
    const SIOCETHTOOL: u64 = 0x8946;
    const ETHTOOL_GDRVINFO: u32 = 0x3;

    if iface.len() >= 16 {
        return None;
    }
    let mut info: EthtoolDrvinfo = unsafe { std::mem::zeroed() };
    info.cmd = ETHTOOL_GDRVINFO;
    let mut req = IfReq { name: [0; 16], data: &mut info as *mut _ as *mut libc::c_void, _pad: [0; 16] };
    req.name[..iface.len()].copy_from_slice(iface.as_bytes());
    let cstr = |b: &[u8]| {
        let s = String::from_utf8_lossy(&b[..b.iter().position(|c| *c == 0).unwrap_or(b.len())]).trim().to_string();
        (!s.is_empty() && s != "N/A").then_some(s)
    };
    unsafe {
        let fd = libc::socket(libc::AF_INET, libc::SOCK_DGRAM, 0);
        if fd < 0 {
            return None;
        }
        let rc = libc::ioctl(fd, SIOCETHTOOL as _, &mut req as *mut IfReq);
        libc::close(fd);
        if rc != 0 {
            return None;
        }
    }
    Some(DrvInfo { driver: cstr(&info.driver), fw_version: cstr(&info.fw_version) })
}

#[cfg(not(target_os = "linux"))]
fn ethtool_drvinfo(_iface: &str) -> Option<DrvInfo> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_boards() {
        assert_eq!(board_family("Arduino UNO Q", ""), Some("UNO Q"));
        assert_eq!(board_family("", "qcom,qrb2210 qcom,qcm2290"), Some("UNO Q"));
        assert_eq!(board_family("Arduino VENTUNO Q", ""), Some("VENTUNO Q"));
        assert_eq!(board_family("", "QCS8275"), Some("VENTUNO Q"));
        assert_eq!(board_family("Raspberry Pi 5", "bcm2712"), None);
    }

    #[test]
    fn proc_version_parts() {
        let v = "Linux version 6.16.7-g0bd6 (builder@host) (aarch64-linux-gnu-gcc (GCC) 13.2.0, GNU ld 2.41) #1 SMP PREEMPT Tue Oct 7 10:00:00 UTC 2025";
        let (compiler, build) = parse_proc_version(v);
        assert_eq!(compiler.as_deref(), Some("aarch64-linux-gnu-gcc (GCC) 13.2.0, GNU ld 2.41"));
        assert_eq!(build.as_deref(), Some("#1 SMP PREEMPT Tue Oct 7 10:00:00 UTC 2025"));
        let v2 = "Linux version 6.1.0 (root@x) (gcc (Debian 12.2.0-14) 12.2.0, GNU ld (GNU Binutils for Debian) 2.40) #1 SMP";
        assert_eq!(parse_proc_version(v2).0.as_deref(), Some("gcc (Debian 12.2.0-14) 12.2.0, GNU ld (GNU Binutils for Debian) 2.40"));
    }

    #[test]
    fn boot_params_filter() {
        let p = boot_params("root=/dev/mmcblk0p2 androidboot.bootloader=UEFI-1.2 quiet androidboot.slot_suffix=_a");
        assert_eq!(p.len(), 2);
        assert_eq!(p["androidboot.bootloader"], "UEFI-1.2");
    }

    #[test]
    fn cpu_dirs() {
        assert!(is_cpu_dir("cpu0"));
        assert!(is_cpu_dir("cpu12"));
        assert!(!is_cpu_dir("cpufreq"));
        assert!(!is_cpu_dir("cpu"));
    }
}
