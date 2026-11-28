// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! End-to-end check against a fake /proc + /sys tree shaped like an Arduino UNO Q.

use std::fs;
use std::path::{Path, PathBuf};

use crate::{info, metrics::Collector, sys::Sys};

fn write(root: &Path, rel: &str, content: &str) {
    let p = root.join(rel);
    fs::create_dir_all(p.parent().unwrap()).unwrap();
    fs::write(p, content).unwrap();
}

fn fake_uno_q() -> PathBuf {
    let root = std::env::temp_dir().join(format!("sysmon-fixture-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    write(&root, "sys/firmware/devicetree/base/model", "Arduino UNO Q\0");
    write(&root, "sys/devices/soc0/machine", "QRB2210\n");
    write(&root, "sys/devices/soc0/revision", "1.0\n");
    write(&root, "proc/sys/kernel/osrelease", "6.16.7-arduino\n");
    write(&root, "proc/sys/kernel/version", "#1 SMP PREEMPT Tue Oct  7 10:00:00 UTC 2025\n");
    write(&root, "proc/version", "Linux version 6.16.7-arduino (b@h) (aarch64-linux-gnu-gcc (GCC) 14.2.0, GNU ld 2.44) #1 SMP PREEMPT\n");
    write(&root, "proc/cmdline", "root=/dev/mmcblk0p68 androidboot.bootloader=UEFI-2.1\n");
    write(&root, "proc/cpuinfo", "processor\t: 0\nCPU implementer\t: 0x41\nCPU part\t: 0xd03\n\nprocessor\t: 1\nCPU implementer\t: 0x41\nCPU part\t: 0xd03\n");
    write(&root, "proc/stat", "cpu  100 0 100 800 0 0 0 0\ncpu0 50 0 50 400 0 0 0 0\ncpu1 50 0 50 400 0 0 0 0\n");
    write(&root, "proc/meminfo", "MemTotal: 2000 kB\nMemFree: 500 kB\nMemAvailable: 1000 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n");
    write(&root, "proc/loadavg", "0.50 0.40 0.30 1/100 1234\n");
    write(&root, "sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq", "1804800\n");
    write(&root, "sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq", "2016000\n");
    write(&root, "sys/devices/system/cpu/cpu1/cpufreq/scaling_cur_freq", "1209600\n");
    write(&root, "sys/class/thermal/thermal_zone0/type", "cpuss-0-thermal\n");
    write(&root, "sys/class/thermal/thermal_zone0/temp", "48500\n");
    write(&root, "sys/class/thermal/thermal_zone1/type", "gpu-thermal\n");
    write(&root, "sys/class/thermal/thermal_zone1/temp", "51200\n");
    write(&root, "sys/class/kgsl/kgsl-3d0/gpu_model", "Adreno702v1\n");
    write(&root, "sys/class/kgsl/kgsl-3d0/gpu_busy_percentage", "37 %\n");
    write(&root, "sys/class/kgsl/kgsl-3d0/devfreq/cur_freq", "845000000\n");
    write(&root, "sys/class/kgsl/kgsl-3d0/devfreq/max_freq", "1123000000\n");
    write(&root, "sys/class/remoteproc/remoteproc0/name", "cdsp\n");
    write(&root, "sys/class/remoteproc/remoteproc0/firmware", "qcom/qcm2290/cdsp.mbn\n");
    write(&root, "sys/class/remoteproc/remoteproc0/state", "running\n");
    write(&root, "sys/bus/mmc/devices/mmc0-0001/type", "MMC\n");
    write(&root, "sys/bus/mmc/devices/mmc0-0001/name", "DG4016\n");
    write(&root, "sys/bus/mmc/devices/mmc0-0001/fwrev", "0x0300000000000000\n");
    root
}

#[test]
fn uno_q_fixture() {
    let root = fake_uno_q();
    let sys = Sys::new(root.to_str().unwrap());

    let i = info::collect(&sys);
    assert_eq!(i["board"]["model"], "Arduino UNO Q");
    assert_eq!(i["board"]["family"], "UNO Q");
    assert_eq!(i["board"]["soc"], "QRB2210");
    assert_eq!(i["kernel"]["release"], "6.16.7-arduino");
    assert_eq!(i["kernel"]["compiler"], "aarch64-linux-gnu-gcc (GCC) 14.2.0, GNU ld 2.44");
    assert_eq!(i["cpu"]["types"][0]["name"], "Cortex-A53");
    assert_eq!(i["cpu"]["max_mhz"], 2016.0);
    let fw = i["firmware"].as_array().unwrap();
    let find = |kind: &str| fw.iter().find(|e| e["kind"] == kind).cloned().unwrap();
    let cdsp = find("coprocessor");
    assert_eq!(cdsp["name"], "cdsp");
    assert_eq!(cdsp["version"], "qcom/qcm2290/cdsp.mbn");
    assert_eq!(cdsp["state"], "running");
    assert_eq!(find("boot")["version"], "UEFI-2.1");
    assert_eq!(find("storage")["name"], "MMC DG4016");
    assert_eq!(find("storage")["version"], "0x0300000000000000");
    assert_eq!(find("gpu")["version"], "Adreno702v1");

    let mut c = Collector::new(sys, 5);
    c.sample(0);
    write(&root, "proc/stat", "cpu  200 0 200 1500 100 0 0 0\ncpu0 150 0 50 500 0 0 0 0\ncpu1 50 0 150 1000 100 0 0 0\n");
    std::thread::sleep(std::time::Duration::from_millis(20));
    let m = c.sample(1);
    assert_eq!(m["cpu"]["usage"], 20.0);
    assert_eq!(m["cpu"]["cores"][0]["usage"], 50.0);
    assert_eq!(m["cpu"]["cores"][0]["mhz"], 1805.0);
    assert_eq!(m["mem"]["percent"], 50.0);
    assert_eq!(m["temps"]["max"], 51.2);
    assert_eq!(m["gpu"]["busy"], 37.0);
    assert_eq!(m["gpu"]["freq_mhz"], 845.0);
    assert_eq!(m["gpu"]["freq_max_mhz"], 1123.0);
    assert_eq!(m["npu"]["present"], true);
    assert_eq!(m["npu"]["state"], "running");
    assert!(m["npu"]["name"].as_str().unwrap().contains("cdsp"));

    let _ = fs::remove_dir_all(&root);
}
