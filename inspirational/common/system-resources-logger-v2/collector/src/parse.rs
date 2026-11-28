// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! Pure parsers for the text files exposed by Linux in /proc and /sys.

use std::collections::HashMap;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct CpuTimes {
    pub total: u64,
    pub idle: u64,
    pub iowait: u64,
}

impl CpuTimes {
    /// Returns (busy %, iowait %) between two readings.
    pub fn usage_since(&self, prev: &CpuTimes) -> Option<(f64, f64)> {
        let dt = self.total.checked_sub(prev.total)?;
        if dt == 0 {
            return None;
        }
        let didle = self.idle.saturating_sub(prev.idle);
        let dio = self.iowait.saturating_sub(prev.iowait);
        let busy = dt.saturating_sub(didle) as f64 / dt as f64 * 100.0;
        let io = dio as f64 / dt as f64 * 100.0;
        Some((busy.clamp(0.0, 100.0), io.clamp(0.0, 100.0)))
    }
}

/// Parses /proc/stat into the aggregated CPU line and the per-core lines (core id, times).
pub fn parse_proc_stat(text: &str) -> (Option<CpuTimes>, Vec<(usize, CpuTimes)>) {
    let mut total = None;
    let mut cores = Vec::new();
    for line in text.lines() {
        let mut it = line.split_whitespace();
        let Some(label) = it.next() else { continue };
        let Some(suffix) = label.strip_prefix("cpu") else { continue };
        // user nice system idle iowait irq softirq steal; guest time is already part of user.
        let v: Vec<u64> = it.take(8).filter_map(|x| x.parse().ok()).collect();
        if v.len() < 4 {
            continue;
        }
        let iowait = v.get(4).copied().unwrap_or(0);
        let t = CpuTimes { total: v.iter().sum(), idle: v[3] + iowait, iowait };
        if suffix.is_empty() {
            total = Some(t);
        } else if let Ok(id) = suffix.parse() {
            cores.push((id, t));
        }
    }
    (total, cores)
}

/// Parses /proc/meminfo, values converted to bytes.
pub fn parse_meminfo(text: &str) -> HashMap<String, u64> {
    let mut map = HashMap::new();
    for line in text.lines() {
        let Some((key, rest)) = line.split_once(':') else { continue };
        let mut it = rest.split_whitespace();
        let Some(Ok(value)) = it.next().map(str::parse::<u64>) else { continue };
        let mult = if it.next() == Some("kB") { 1024 } else { 1 };
        map.insert(key.trim().to_string(), value * mult);
    }
    map
}

/// Parses /proc/net/dev into (interface, rx bytes, tx bytes).
pub fn parse_net_dev(text: &str) -> Vec<(String, u64, u64)> {
    text.lines()
        .filter_map(|line| {
            let (name, rest) = line.split_once(':')?;
            let f: Vec<u64> = rest.split_whitespace().filter_map(|x| x.parse().ok()).collect();
            if f.len() < 9 {
                return None;
            }
            Some((name.trim().to_string(), f[0], f[8]))
        })
        .collect()
}

/// Parses /proc/net/wireless into (interface, link quality, signal level dBm).
pub fn parse_wireless(text: &str) -> Vec<(String, f64, f64)> {
    text.lines()
        .filter_map(|line| {
            let (name, rest) = line.split_once(':')?;
            let f: Vec<&str> = rest.split_whitespace().collect();
            let num = |s: &str| s.trim_end_matches('.').parse::<f64>().ok();
            Some((name.trim().to_string(), num(f.get(1)?)?, num(f.get(2)?)?))
        })
        .collect()
}

/// Parses /proc/diskstats into (device, sectors read, sectors written).
pub fn parse_diskstats(text: &str) -> Vec<(String, u64, u64)> {
    text.lines()
        .filter_map(|line| {
            let f: Vec<&str> = line.split_whitespace().collect();
            if f.len() < 10 {
                return None;
            }
            Some((f[2].to_string(), f[5].parse().ok()?, f[9].parse().ok()?))
        })
        .collect()
}

pub fn parse_loadavg(text: &str) -> Option<[f64; 3]> {
    let f: Vec<f64> = text.split_whitespace().take(3).filter_map(|x| x.parse().ok()).collect();
    Some([*f.first()?, *f.get(1)?, *f.get(2)?])
}

#[derive(Debug, PartialEq)]
pub struct PidStat {
    pub comm: String,
    pub ticks: u64,
    pub rss_pages: u64,
}

/// Parses /proc/<pid>/stat. The command name may contain spaces and parentheses.
pub fn parse_pid_stat(text: &str) -> Option<PidStat> {
    let open = text.find('(')?;
    let close = text.rfind(')')?;
    let comm = text.get(open + 1..close)?.to_string();
    let rest: Vec<&str> = text.get(close + 1..)?.split_whitespace().collect();
    // Index 0 is field 3 (state): utime = field 14, stime = field 15, rss = field 24.
    let utime: u64 = rest.get(11)?.parse().ok()?;
    let stime: u64 = rest.get(12)?.parse().ok()?;
    let rss_pages = rest.get(21).and_then(|x| x.parse::<i64>().ok()).unwrap_or(0).max(0) as u64;
    Some(PidStat { comm, ticks: utime + stime, rss_pages })
}

/// Parses a busy file: either "NN" / "NN %" (percent) or "busy total" (ratio).
pub fn parse_busy(text: &str) -> Option<f64> {
    let nums: Vec<f64> = text
        .split(|c: char| c.is_whitespace() || c == '%')
        .filter(|t| !t.is_empty())
        .filter_map(|t| t.parse().ok())
        .collect();
    match nums.as_slice() {
        [p] => Some(p.clamp(0.0, 100.0)),
        [busy, total, ..] if *total > 0.0 => Some((busy / total * 100.0).clamp(0.0, 100.0)),
        [_, _, ..] => Some(0.0),
        _ => None,
    }
}

#[derive(Debug, Default, PartialEq)]
pub struct FdInfo {
    pub driver: String,
    pub client_id: String,
    pub engines: Vec<(String, u64)>,
}

/// Parses the DRM usage stats of /proc/<pid>/fdinfo/<fd> (drm-usage-stats.rst).
pub fn parse_fdinfo(text: &str) -> Option<FdInfo> {
    let mut info = FdInfo::default();
    for line in text.lines() {
        let Some((key, value)) = line.split_once(':') else { continue };
        let value = value.trim();
        match key.trim() {
            "drm-driver" => info.driver = value.to_string(),
            "drm-client-id" => info.client_id = value.to_string(),
            k => {
                if let Some(engine) = k.strip_prefix("drm-engine-") {
                    if engine.starts_with("capacity-") {
                        continue;
                    }
                    if let Some(Ok(ns)) = value.split_whitespace().next().map(str::parse::<u64>) {
                        info.engines.push((engine.to_string(), ns));
                    }
                }
            }
        }
    }
    (!info.driver.is_empty() && !info.client_id.is_empty()).then_some(info)
}

pub fn parse_os_release(text: &str) -> HashMap<String, String> {
    text.lines()
        .filter_map(|line| {
            let (k, v) = line.split_once('=')?;
            Some((k.trim().to_string(), v.trim().trim_matches('"').to_string()))
        })
        .collect()
}

/// Lists the distinct CPU cores of /proc/cpuinfo as ("Cortex-A53", count).
pub fn parse_cpu_types(text: &str) -> Vec<(String, usize)> {
    let mut out: Vec<(String, usize)> = Vec::new();
    let mut implementer = String::new();
    for line in text.lines() {
        let Some((key, value)) = line.split_once(':') else { continue };
        let value = value.trim();
        match key.trim() {
            "CPU implementer" => implementer = value.to_lowercase(),
            "CPU part" => {
                let name = arm_core_name(&implementer, &value.to_lowercase());
                match out.iter_mut().find(|(n, _)| *n == name) {
                    Some((_, count)) => *count += 1,
                    None => out.push((name, 1)),
                }
            }
            _ => {}
        }
    }
    out
}

fn arm_core_name(implementer: &str, part: &str) -> String {
    let arm = match part {
        "0xd03" => "Cortex-A53",
        "0xd04" => "Cortex-A35",
        "0xd05" => "Cortex-A55",
        "0xd07" => "Cortex-A57",
        "0xd08" => "Cortex-A72",
        "0xd09" => "Cortex-A73",
        "0xd0a" => "Cortex-A75",
        "0xd0b" => "Cortex-A76",
        "0xd0d" => "Cortex-A77",
        "0xd41" => "Cortex-A78",
        "0xd44" => "Cortex-X1",
        "0xd46" => "Cortex-A510",
        "0xd47" => "Cortex-A710",
        "0xd48" => "Cortex-X2",
        "0xd4b" => "Cortex-A78C",
        "0xd4d" => "Cortex-A715",
        "0xd4e" => "Cortex-X3",
        "0xd80" => "Cortex-A520",
        "0xd81" => "Cortex-A720",
        "0xd82" => "Cortex-X4",
        _ => "",
    };
    if implementer == "0x41" && !arm.is_empty() {
        arm.to_string()
    } else if implementer == "0x51" {
        format!("Qualcomm Kryo ({part})")
    } else {
        format!("CPU {implementer}:{part}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proc_stat_and_usage() {
        let a = "cpu  100 0 100 800 0 0 0 0 0 0\ncpu0 50 0 50 400 0 0 0 0 0 0\ncpu1 50 0 50 400 0 0 0 0 0 0\nintr 1 2\n";
        let b = "cpu  200 0 200 1500 100 0 0 0 0 0\ncpu0 150 0 50 500 0 0 0 0 0 0\ncpu1 50 0 150 1000 100 0 0 0 0 0\n";
        let (ta, ca) = parse_proc_stat(a);
        let (tb, cb) = parse_proc_stat(b);
        assert_eq!(ca.len(), 2);
        assert_eq!(cb[1].0, 1);
        let (busy, io) = tb.unwrap().usage_since(&ta.unwrap()).unwrap();
        assert!((busy - 20.0).abs() < 1e-9, "{busy}");
        assert!((io - 10.0).abs() < 1e-9, "{io}");
        let (core0, _) = cb[0].1.usage_since(&ca[0].1).unwrap();
        assert!((core0 - 50.0).abs() < 1e-9);
        assert_eq!(ta.unwrap().usage_since(&ta.unwrap()), None);
    }

    #[test]
    fn meminfo_in_bytes() {
        let m = parse_meminfo("MemTotal:        2000 kB\nMemAvailable:     500 kB\nHugePages_Total:       0\n");
        assert_eq!(m["MemTotal"], 2000 * 1024);
        assert_eq!(m["MemAvailable"], 500 * 1024);
        assert_eq!(m["HugePages_Total"], 0);
    }

    #[test]
    fn net_dev_and_wireless() {
        let dev = "Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n    lo:    100       1    0    0    0     0          0         0      100       1    0    0    0     0       0          0\n wlan0:123456   10    0    0    0     0          0         0   654321      20    0    0    0     0       0          0\n";
        let v = parse_net_dev(dev);
        assert_eq!(v, vec![("lo".into(), 100, 100), ("wlan0".into(), 123456, 654321)]);

        let wl = "Inter-| sta-|   Quality        |   Discarded packets               | Missed | WE\n face | tus | link level noise |  nwid  crypt   frag  retry   misc | beacon | 22\n wlan0: 0000   54.  -56.  -256        0      0      0      0      0        0\n";
        assert_eq!(parse_wireless(wl), vec![("wlan0".into(), 54.0, -56.0)]);
    }

    #[test]
    fn diskstats_and_loadavg() {
        let d = " 179       0 mmcblk0 1000 0 2048 10 500 0 4096 20 0 30 30\n 179       1 mmcblk0p1 1 0 8 0 0 0 0 0 0 0 0\n";
        assert_eq!(parse_diskstats(d)[0], ("mmcblk0".into(), 2048, 4096));
        assert_eq!(parse_loadavg("0.10 0.20 0.30 1/123 456"), Some([0.1, 0.2, 0.3]));
        assert_eq!(parse_loadavg(""), None);
    }

    #[test]
    fn pid_stat_with_tricky_name() {
        let s = "1234 (my (weird) app) S 1 1234 1234 0 -1 4194560 100 0 0 0 250 50 0 0 20 0 3 0 12345 1000000 777 18446744073709551615";
        let p = parse_pid_stat(s).unwrap();
        assert_eq!(p.comm, "my (weird) app");
        assert_eq!(p.ticks, 300);
        assert_eq!(p.rss_pages, 777);
    }

    #[test]
    fn busy_formats() {
        assert_eq!(parse_busy("42 %\n"), Some(42.0));
        assert_eq!(parse_busy("17"), Some(17.0));
        assert_eq!(parse_busy("250 1000"), Some(25.0));
        assert_eq!(parse_busy("0 0"), Some(0.0));
        assert_eq!(parse_busy("n/a"), None);
    }

    #[test]
    fn fdinfo_drm_stats() {
        let s = "pos:\t0\nflags:\t02100002\ndrm-driver:\tmsm\ndrm-client-id:\t14\ndrm-engine-gpu:\t123456789 ns\ndrm-engine-capacity-gpu:\t1\ndrm-cycles-gpu:\t999\n";
        let f = parse_fdinfo(s).unwrap();
        assert_eq!(f.driver, "msm");
        assert_eq!(f.client_id, "14");
        assert_eq!(f.engines, vec![("gpu".into(), 123456789)]);
        assert_eq!(parse_fdinfo("pos:\t0\nflags:\t0\n"), None);
    }

    #[test]
    fn os_release_and_cpu_types() {
        let o = parse_os_release("PRETTY_NAME=\"Debian GNU/Linux 13 (trixie)\"\nVERSION_ID=\"13\"\n");
        assert_eq!(o["PRETTY_NAME"], "Debian GNU/Linux 13 (trixie)");
        let c = "processor\t: 0\nCPU implementer\t: 0x41\nCPU part\t: 0xd03\n\nprocessor\t: 1\nCPU implementer\t: 0x41\nCPU part\t: 0xd03\n\nprocessor\t: 2\nCPU implementer\t: 0x41\nCPU part\t: 0xd41\n";
        assert_eq!(parse_cpu_types(c), vec![("Cortex-A53".into(), 2), ("Cortex-A78".into(), 1)]);
    }
}
