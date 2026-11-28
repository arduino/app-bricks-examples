// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

//! sysmon-collector: reads /proc and /sys and prints JSON for the App Lab app.
//!
//! Default mode streams one JSON object per line on stdout:
//!   {"info": {...}}      at start and every `--info-every` samples
//!   {"metrics": {...}}   every `--interval` seconds

mod accel;
mod info;
mod metrics;
mod parse;
mod sys;

#[cfg(test)]
mod fixture_tests;

use std::io::Write;
use std::path::PathBuf;
use std::process::ExitCode;
use std::thread::sleep;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde_json::{json, Value};

const USAGE: &str = "sysmon-collector [options]

  --interval SECS   seconds between samples (default 5)
  --top N           number of processes listed (default 8)
  --root DIR        read /proc and /sys under DIR (default /)
  --info-every N    re-emit the static info every N samples (default 60)
  --once            print one {\"info\",\"metrics\"} object and exit
  --info            print the static info and exit
  --probe           print the GPU/NPU/thermal sources found and exit
  --out FILE        write {\"info\",\"metrics\"} to FILE (atomically) instead of stdout
  --version         print the version";

struct Args {
    interval: f64,
    top: usize,
    root: String,
    info_every: u64,
    once: bool,
    info: bool,
    probe: bool,
    out: Option<PathBuf>,
}

fn parse_args() -> Result<Args, String> {
    let mut a = Args { interval: 5.0, top: 8, root: "/".into(), info_every: 60, once: false, info: false, probe: false, out: None };
    let mut it = std::env::args().skip(1);
    while let Some(arg) = it.next() {
        let mut value = |name: &str| it.next().ok_or_else(|| format!("{name} expects a value"));
        match arg.as_str() {
            "--interval" => a.interval = value("--interval")?.parse().map_err(|_| "invalid --interval")?,
            "--top" => a.top = value("--top")?.parse().map_err(|_| "invalid --top")?,
            "--root" => a.root = value("--root")?,
            "--info-every" => a.info_every = value("--info-every")?.parse().map_err(|_| "invalid --info-every")?,
            "--out" => a.out = Some(PathBuf::from(value("--out")?)),
            "--once" => a.once = true,
            "--info" => a.info = true,
            "--probe" => a.probe = true,
            "--version" | "-V" => {
                println!("sysmon-collector {}", env!("CARGO_PKG_VERSION"));
                std::process::exit(0);
            }
            "--help" | "-h" => {
                println!("{USAGE}");
                std::process::exit(0);
            }
            other => return Err(format!("unknown option: {other}\n\n{USAGE}")),
        }
    }
    if a.interval.is_nan() || a.interval < 0.5 {
        return Err("--interval must be >= 0.5".into());
    }
    Ok(a)
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn write_atomic(path: &PathBuf, value: &Value) -> std::io::Result<()> {
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, serde_json::to_vec(value)?)?;
    std::fs::rename(&tmp, path)
}

/// Returns false when stdout is closed (the parent process went away).
fn emit(value: &Value) -> bool {
    let mut out = std::io::stdout().lock();
    writeln!(out, "{value}").and_then(|_| out.flush()).is_ok()
}

fn main() -> ExitCode {
    let args = match parse_args() {
        Ok(a) => a,
        Err(e) => {
            eprintln!("{e}");
            return ExitCode::from(2);
        }
    };
    let sys = sys::Sys::new(&args.root);

    if args.probe {
        emit(&accel::probe(&sys));
        return ExitCode::SUCCESS;
    }
    if args.info {
        emit(&info::collect(&sys));
        return ExitCode::SUCCESS;
    }

    let mut collector = metrics::Collector::new(sys.clone(), args.top);
    // Rates need two readings: the first one only primes the counters.
    collector.sample(now_ms());
    sleep(Duration::from_secs(1));

    if args.once {
        emit(&json!({ "info": info::collect(&sys), "metrics": collector.sample(now_ms()) }));
        return ExitCode::SUCCESS;
    }

    let mut info_value = info::collect(&sys);
    let mut n: u64 = 0;
    loop {
        let info_due = n == 0 || (args.info_every > 0 && n.is_multiple_of(args.info_every));
        if info_due && n > 0 {
            info_value = info::collect(&sys);
        }
        let m = collector.sample(now_ms());
        match &args.out {
            Some(path) => {
                if let Err(e) = write_atomic(path, &json!({ "info": info_value, "metrics": m, "written_ms": now_ms() })) {
                    eprintln!("cannot write {}: {e}", path.display());
                }
            }
            None => {
                let ok = (!info_due || emit(&json!({ "info": info_value }))) && emit(&json!({ "metrics": m }));
                if !ok {
                    return ExitCode::SUCCESS;
                }
            }
        }
        n += 1;
        sleep(Duration::from_secs_f64(args.interval));
    }
}
