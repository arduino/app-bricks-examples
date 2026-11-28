// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! Periodic sampling. Rates (CPU %, bytes/s, process CPU) are computed between two calls.

use std::collections::{HashMap, HashSet};
use std::time::Instant;

use serde_json::{json, Value};

use crate::accel::{self, classify_fd, Device, Freq, Kind};
use crate::info::is_cpu_dir;
use crate::parse::{self, CpuTimes};
use crate::sys::{self, Sys};

const SECTOR: u64 = 512;

pub struct Collector {
    sys: Sys,
    top: usize,
    clk_tck: f64,
    page_size: u64,
    gpu: Device,
    npu: Device,
    prev_at: Option<Instant>,
    prev_cpu: Option<CpuTimes>,
    prev_cores: HashMap<usize, CpuTimes>,
    prev_net: HashMap<String, (u64, u64)>,
    prev_disk: HashMap<String, (u64, u64)>,
    prev_procs: HashMap<u32, u64>,
    /// Cumulated engine time (ns) per (kind, driver, client id, engine).
    prev_drm: HashMap<(Kind, String, String, String), u64>,
}

fn rate(cur: u64, prev: Option<u64>, dt: Option<f64>) -> Option<f64> {
    let dt = dt?;
    Some(cur.checked_sub(prev?)? as f64 / dt)
}

fn round1(v: f64) -> f64 {
    (v * 10.0).round() / 10.0
}

/// Whole disks only: partitions, loop, ram and zram devices are skipped.
pub fn is_whole_disk(name: &str) -> bool {
    let digits_after = |p: &str| name.strip_prefix(p).is_some_and(|r| !r.is_empty() && r.bytes().all(|b| b.is_ascii_digit()));
    if digits_after("mmcblk") {
        return true;
    }
    if let Some(r) = name.strip_prefix("nvme") {
        // nvme0n1 but not nvme0n1p1
        return r.contains('n') && !r.contains('p');
    }
    ["sd", "vd", "hd"].iter().any(|p| name.strip_prefix(p).is_some_and(|r| !r.is_empty() && r.bytes().all(|b| b.is_ascii_lowercase())))
}

impl Collector {
    pub fn new(sys: Sys, top: usize) -> Self {
        Collector {
            gpu: accel::detect_gpu(&sys),
            npu: accel::detect_npu(&sys),
            sys,
            top,
            clk_tck: sys::clk_tck(),
            page_size: sys::page_size(),
            prev_at: None,
            prev_cpu: None,
            prev_cores: HashMap::new(),
            prev_net: HashMap::new(),
            prev_disk: HashMap::new(),
            prev_procs: HashMap::new(),
            prev_drm: HashMap::new(),
        }
    }

    pub fn sample(&mut self, ts_ms: u64) -> Value {
        let now = Instant::now();
        let dt = self.prev_at.map(|p| now.duration_since(p).as_secs_f64()).filter(|d| *d > 0.0);
        self.prev_at = Some(now);

        let cpu = self.cpu();
        let (procs, accel_users, drm_busy) = self.processes(dt);
        json!({
            "ts": ts_ms,
            "scope": self.sys.detect_scope(),
            "uptime_s": self.sys.read("proc/uptime").and_then(|u| u.split_whitespace().next()?.parse::<f64>().ok()),
            "cpu": cpu,
            "load": self.sys.read("proc/loadavg").as_deref().and_then(parse::parse_loadavg),
            "mem": self.mem(),
            "temps": self.temps(),
            "net": self.net(dt),
            "wifi": self.wifi(),
            "disk": { "io": self.disk_io(dt), "usage": self.disk_usage() },
            "gpu": self.accel_value(Kind::Gpu, drm_busy.get(&Kind::Gpu).copied(), &accel_users),
            "npu": self.accel_value(Kind::Npu, drm_busy.get(&Kind::Npu).copied(), &accel_users),
            "procs": procs,
        })
    }

    fn cpu(&mut self) -> Value {
        let (total, cores) = parse::parse_proc_stat(&self.sys.read("proc/stat").unwrap_or_default());
        let (usage, iowait) = match (total, self.prev_cpu) {
            (Some(t), Some(p)) => t.usage_since(&p).map_or((None, None), |(u, io)| (Some(round1(u)), Some(round1(io)))),
            _ => (None, None),
        };
        if let Some(t) = total {
            self.prev_cpu = Some(t);
        }
        let freq = |id: usize, f: &str| self.sys.read_num::<f64>(&format!("sys/devices/system/cpu/cpu{id}/cpufreq/{f}")).map(|k| (k / 1000.0).round());
        let mut per_core = Vec::new();
        for (id, t) in &cores {
            let u = self.prev_cores.get(id).and_then(|p| t.usage_since(p)).map(|(u, _)| round1(u));
            per_core.push(json!({ "id": id, "usage": u, "mhz": freq(*id, "scaling_cur_freq"), "max_mhz": freq(*id, "cpuinfo_max_freq") }));
        }
        self.prev_cores = cores.into_iter().collect();
        let online = self.sys.list("sys/devices/system/cpu").iter().filter(|n| is_cpu_dir(n)).count();
        let freqs: Vec<f64> = per_core.iter().filter_map(|c| c["mhz"].as_f64()).collect();
        json!({
            "usage": usage,
            "iowait": iowait,
            "cores": per_core,
            "count": online.max(freqs.len()),
            "freq_avg_mhz": (!freqs.is_empty()).then(|| (freqs.iter().sum::<f64>() / freqs.len() as f64).round()),
            "freq_max_mhz": freqs.iter().cloned().fold(None, |a: Option<f64>, v| Some(a.map_or(v, |a| a.max(v)))),
        })
    }

    fn mem(&self) -> Value {
        let m = parse::parse_meminfo(&self.sys.read("proc/meminfo").unwrap_or_default());
        let g = |k: &str| m.get(k).copied().unwrap_or(0);
        let total = g("MemTotal");
        let available = m.get("MemAvailable").copied().unwrap_or_else(|| g("MemFree") + g("Buffers") + g("Cached"));
        let used = total.saturating_sub(available);
        let swap_total = g("SwapTotal");
        let swap_used = swap_total.saturating_sub(g("SwapFree"));
        let pct = |a: u64, b: u64| (b > 0).then(|| round1(a as f64 / b as f64 * 100.0));
        json!({
            "total": total,
            "used": used,
            "available": available,
            "free": g("MemFree"),
            "cached": g("Cached") + g("SReclaimable"),
            "buffers": g("Buffers"),
            "shared": g("Shmem"),
            "percent": pct(used, total),
            "swap_total": swap_total,
            "swap_used": swap_used,
            "swap_percent": pct(swap_used, swap_total),
            "zram": self.sys.list("sys/block").iter().any(|b| b.starts_with("zram")),
        })
    }

    fn temps(&self) -> Value {
        let mut zones = Vec::new();
        for z in self.sys.list("sys/class/thermal") {
            if !z.starts_with("thermal_zone") {
                continue;
            }
            let base = format!("sys/class/thermal/{z}");
            let Some(raw) = self.sys.read_num::<f64>(&format!("{base}/temp")) else { continue };
            let c = if raw.abs() > 1000.0 { raw / 1000.0 } else { raw };
            if !(-40.0..=150.0).contains(&c) || c == 0.0 {
                continue;
            }
            zones.push(json!({ "name": self.sys.read_trim(&format!("{base}/type")).unwrap_or(z), "c": round1(c) }));
        }
        let max = zones.iter().filter_map(|z| z["c"].as_f64()).fold(None, |a: Option<f64>, v| Some(a.map_or(v, |a| a.max(v))));
        json!({ "zones": zones, "max": max })
    }

    fn net(&mut self, dt: Option<f64>) -> Value {
        let mut out = Vec::new();
        let mut next = HashMap::new();
        let (mut rx_sum, mut tx_sum, mut any) = (0.0, 0.0, false);
        for (iface, rx, tx) in parse::parse_net_dev(&self.sys.read("proc/net/dev").unwrap_or_default()) {
            if iface == "lo" {
                continue;
            }
            let prev = self.prev_net.get(&iface).copied();
            let rx_bps = rate(rx, prev.map(|p| p.0), dt);
            let tx_bps = rate(tx, prev.map(|p| p.1), dt);
            if let (Some(r), Some(t)) = (rx_bps, tx_bps) {
                rx_sum += r;
                tx_sum += t;
                any = true;
            }
            let up = self.sys.read_trim(&format!("sys/class/net/{iface}/operstate"));
            out.push(json!({ "iface": iface, "rx_bps": rx_bps.map(f64::round), "tx_bps": tx_bps.map(f64::round), "rx_total": rx, "tx_total": tx, "state": up }));
            next.insert(iface, (rx, tx));
        }
        self.prev_net = next;
        json!({ "ifaces": out, "rx_bps": any.then_some(rx_sum.round()), "tx_bps": any.then_some(tx_sum.round()) })
    }

    fn wifi(&self) -> Value {
        let list: Vec<Value> = parse::parse_wireless(&self.sys.read("proc/net/wireless").unwrap_or_default())
            .into_iter()
            .map(|(iface, quality, signal)| json!({ "iface": iface, "quality": quality, "signal_dbm": signal }))
            .collect();
        Value::Array(list)
    }

    fn disk_io(&mut self, dt: Option<f64>) -> Value {
        let mut out = Vec::new();
        let mut next = HashMap::new();
        for (dev, rd, wr) in parse::parse_diskstats(&self.sys.read("proc/diskstats").unwrap_or_default()) {
            if !is_whole_disk(&dev) {
                continue;
            }
            let prev = self.prev_disk.get(&dev).copied();
            let r = rate(rd * SECTOR, prev.map(|p| p.0 * SECTOR), dt).map(f64::round);
            let w = rate(wr * SECTOR, prev.map(|p| p.1 * SECTOR), dt).map(f64::round);
            out.push(json!({ "dev": dev, "read_bps": r, "write_bps": w, "read_total": rd * SECTOR, "write_total": wr * SECTOR }));
            next.insert(dev, (rd, wr));
        }
        self.prev_disk = next;
        Value::Array(out)
    }

    fn disk_usage(&self) -> Value {
        let mut points = vec![("/".to_string(), String::new(), String::new())];
        for line in self.sys.read("proc/self/mounts").unwrap_or_default().lines() {
            let f: Vec<&str> = line.split_whitespace().collect();
            if f.len() < 3 || !f[0].starts_with("/dev/") || f[0].starts_with("/dev/loop") || f[2] == "squashfs" {
                continue;
            }
            points.push((f[1].replace("\\040", " "), f[0].to_string(), f[2].to_string()));
        }
        let mut seen = HashSet::new();
        let mut out = Vec::new();
        for (mount, source, fstype) in points {
            let path = self.sys.p(&mount);
            let Some((total, used, avail)) = path.to_str().and_then(sys::disk_usage) else { continue };
            if total == 0 || !seen.insert((total, used / (1 << 20))) {
                continue;
            }
            out.push(json!({
                "mount": mount,
                "source": (!source.is_empty()).then_some(source),
                "fstype": (!fstype.is_empty()).then_some(fstype),
                "total": total,
                "used": used,
                "available": avail,
                "percent": round1(used as f64 / (used + avail).max(1) as f64 * 100.0),
            }));
        }
        Value::Array(out)
    }

    /// Top processes by CPU, accelerator users, and accelerator busy % derived from DRM fdinfo.
    fn processes(&mut self, dt: Option<f64>) -> (Value, Vec<Value>, HashMap<Kind, f64>) {
        let mut rows = Vec::new();
        let mut next = HashMap::new();
        let mut users = Vec::new();
        let mut drm_now: HashMap<(Kind, String, String, String), u64> = HashMap::new();
        let (mut count, mut threads) = (0usize, 0u64);
        for entry in self.sys.list("proc") {
            let Ok(pid) = entry.parse::<u32>() else { continue };
            let Some(st) = self.sys.read(&format!("proc/{pid}/stat")).as_deref().and_then(parse::parse_pid_stat) else { continue };
            count += 1;
            threads += self.sys.list(&format!("proc/{pid}/task")).len().max(1) as u64;
            let cpu = match (self.prev_procs.get(&pid), dt) {
                (Some(prev), Some(dt)) => Some(round1(st.ticks.saturating_sub(*prev) as f64 / self.clk_tck / dt * 100.0)),
                _ => None,
            };
            next.insert(pid, st.ticks);

            let mut kinds = HashSet::new();
            for fd in self.sys.list(&format!("proc/{pid}/fd")) {
                let Ok(target) = std::fs::read_link(self.sys.p(&format!("proc/{pid}/fd/{fd}"))) else { continue };
                let Some((kind, has_stats)) = classify_fd(&target.to_string_lossy()) else { continue };
                kinds.insert(kind);
                if !has_stats {
                    continue;
                }
                let Some(info) = self.sys.read(&format!("proc/{pid}/fdinfo/{fd}")).as_deref().and_then(parse::parse_fdinfo) else { continue };
                for (engine, ns) in info.engines {
                    // Several fds may share one DRM client: keep it once.
                    drm_now.insert((kind, info.driver.clone(), info.client_id.clone(), engine), ns);
                }
            }
            let name = self.sys.read_trim(&format!("proc/{pid}/comm")).unwrap_or(st.comm);
            for kind in kinds {
                users.push(json!({ "pid": pid, "name": name, "kind": if kind == Kind::Gpu { "gpu" } else { "npu" } }));
            }
            rows.push((pid, name, cpu, st.rss_pages * self.page_size));
        }
        self.prev_procs = next;

        let mut busy: HashMap<Kind, f64> = HashMap::new();
        if let Some(dt) = dt {
            let mut per_engine: HashMap<(Kind, String, String), u64> = HashMap::new();
            for (key, ns) in &drm_now {
                if let Some(prev) = self.prev_drm.get(key) {
                    *per_engine.entry((key.0, key.1.clone(), key.3.clone())).or_default() += ns.saturating_sub(*prev);
                }
            }
            for ((kind, _, _), ns) in per_engine {
                let pct = (ns as f64 / (dt * 1e9) * 100.0).clamp(0.0, 100.0);
                let e = busy.entry(kind).or_insert(0.0);
                *e = e.max(round1(pct));
            }
        }
        self.prev_drm = drm_now;

        rows.sort_by(|a, b| {
            b.2.unwrap_or(0.0).partial_cmp(&a.2.unwrap_or(0.0)).unwrap_or(std::cmp::Ordering::Equal).then(b.3.cmp(&a.3))
        });
        let top: Vec<Value> = rows
            .into_iter()
            .take(self.top)
            .map(|(pid, name, cpu, rss)| json!({ "pid": pid, "name": name, "cpu": cpu, "rss": rss }))
            .collect();
        (json!({ "count": count, "threads": threads, "top": top }), users, busy)
    }

    fn accel_value(&self, kind: Kind, drm_busy: Option<f64>, users: &[Value]) -> Value {
        let d = if kind == Kind::Gpu { &self.gpu } else { &self.npu };
        let tag = if kind == Kind::Gpu { "gpu" } else { "npu" };
        let users: Vec<&Value> = users.iter().filter(|u| u["kind"] == tag).collect();
        let (busy, source) = match d.read_busy() {
            Some(b) => (Some(round1(b)), Some("sysfs")),
            None => (drm_busy, drm_busy.map(|_| "fdinfo")),
        };
        json!({
            "present": d.present || !users.is_empty(),
            "name": d.name,
            "busy": busy,
            "busy_source": source,
            "freq_mhz": d.freq.as_ref().and_then(Freq::cur_mhz).map(f64::round),
            "freq_max_mhz": d.freq.as_ref().and_then(Freq::max_mhz).map(f64::round),
            "state": d.state(&self.sys),
            "users": users,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whole_disks() {
        for d in ["mmcblk0", "nvme0n1", "sda", "vdb"] {
            assert!(is_whole_disk(d), "{d}");
        }
        for d in ["mmcblk0p1", "mmcblk0boot0", "nvme0n1p2", "sda1", "loop0", "zram0", "ram0", "dm-0"] {
            assert!(!is_whole_disk(d), "{d}");
        }
    }

    #[test]
    fn rates() {
        assert_eq!(rate(300, Some(100), Some(2.0)), Some(100.0));
        assert_eq!(rate(100, Some(300), Some(2.0)), None);
        assert_eq!(rate(100, None, Some(2.0)), None);
    }
}
