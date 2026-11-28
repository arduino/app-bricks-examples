# System Resources Logger v2

**[Version française](README.fr.md)**

The **System Resources Logger v2** is a complete dashboard for the **Arduino UNO Q** and the
**Arduino VENTUNO Q**. Where the original example only shows CPU % and memory %, the v2 shows
everything the board exposes, stores it in a time series database and charts it over 1 hour,
24 hours and 7 days.

## What it shows

| Category | Metrics |
|---|---|
| **CPU** | global %, iowait, % and frequency **per core**, core types (Cortex-A53, Kryo…), governor, load average 1/5/15 min |
| **Memory** | used / available / cache / buffers / shared, swap (and zram) |
| **Temperatures** | every thermal zone, **grouped by area** (CPU clusters, NPU, GPU, RAM, multimedia, connectivity, power…) with the hottest value of each group; the full list is one click away |
| **GPU** | model (Adreno), utilization %, current / max frequency, processes using it |
| **NPU / DSP** | Hexagon cDSP / NSP (remoteproc), firmware state, utilization % when the kernel exposes it, processes using it |
| **Network** | ↓ / ↑ throughput per interface, totals, IP and MAC addresses, Wi-Fi signal |
| **Storage** | usage per mount point, read / write throughput per disk |
| **Processes** | process and thread count, top 8 by CPU with memory |
| **System** | board model, SoC and revision, serial number, uptime, OS |
| **Kernel** | release, build, architecture, preemption (PREEMPT / RT), compiler, loaded modules, taint, command line |
| **Firmware** | UEFI / BIOS, bootloader parameters, coprocessor firmware (DSP, modem…) and state, Wi-Fi / Ethernet firmware (ethtool), eMMC / NVMe / UFS firmware, GPU model |

History (1 h, 24 h, 7 days) is kept for CPU, RAM, swap, temperature, GPU, NPU, load, CPU / GPU
frequencies, network and disk.

The VENTUNO Q exposes 48 thermal zones (40 in the SoC, 8 on the power-management ICs) and the
UNO Q about 12: the dashboard shows them as 6 to 9 readable groups.

## Bricks used

- `dbstorage_tsstore`: stores the samples in a time series database (7 days retention) and
  aggregates them for the history charts.
- `web_ui`: serves the dashboard and streams the live metrics over WebSocket.

## Hardware requirements

- Arduino UNO Q (x1) or Arduino VENTUNO Q (x1)
- USB-C® cable (x1) _(UNO Q only)_

## How to use the example

1. Run the App from Arduino App Lab.
2. The dashboard opens in the browser; otherwise go to `<board-name>.local:7000`.
3. Tabs: **Live**, **1 h**, **24 h**, **7 d** and **System & firmware**.

To install it from a computer, import `system-resources-logger-v2.zip` in App Lab, or copy it to
the board and unzip it in `~/ArduinoApps/`.

## Languages

The app ships with **English** and **French**: the dashboard follows the browser language and
the **EN / FR** switch in the header changes it.

To keep the app small, the other languages are **optional packs** of about 6 KB each:
German (`de`), Spanish (`es`), Finnish (`fi`), Italian (`it`), Japanese (`ja`), Portuguese
(`pt`), Russian (`ru`), Ukrainian (`uk`) and Simplified Chinese (`zh`). Install only those you
need:

```sh
python3 -m zipfile -e sysmon-v2-lang-de.zip ~/ArduinoApps/system-resources-logger-v2/
```

A pack only adds `assets/lang/<code>.js`; reload the dashboard and its button appears. Delete
the file to remove it. `sysmon-v2-lang-all.zip` installs every pack at once.

## How it works

```
/proc, /sys ──► sysmon-collector (Rust, static aarch64 binary)
                    │  one JSON line every 5 s
                    ▼
               python/main.py ──► dbstorage_tsstore (history, 7 days)
                    │
                    └──────────► web_ui (WebSocket "metrics" / "info" + REST API)
                                     │
                                     ▼
                         assets/ (Chart.js dashboard)
```

- **`collector/`**: the Rust collector. It reads `/proc` and `/sys` directly (no system
  dependency, static musl binary of about 600 KB) and detects the board and its accelerators:
  Adreno through `kgsl` (Qualcomm kernels) or `msm` / DRM + devfreq (mainline kernels), NPU
  through remoteproc + fastrpc or `/dev/accel`. When no utilization file exists, GPU / NPU
  utilization is computed from the DRM `fdinfo` statistics.
- **`python/main.py`**: starts the collector, stores and streams the metrics. When the binary
  is missing or cannot start, a `psutil` fallback (CPU, RAM) takes over and the dashboard says
  so.
- **`host-agent/`**: **optional** agent running the same collector directly on the board
  (see below).

## Container view and host agent (optional)

App Lab runs `main.py` in a Docker container. From there the collector sees the CPU, RAM,
temperatures, GPU, NPU and disks of the board, but:

- only the **app processes** are visible;
- only the **container network interface** is visible (not the board Wi-Fi);
- the OS shown is the one of the **Python image**, not the board OS;
- some firmware versions (Wi-Fi through ethtool, UEFI) may be missing.

The badge under the title tells which view is used. For the full view, install the host agent
on the board once (over SSH or from the board terminal):

```sh
cd ~/ArduinoApps/system-resources-logger-v2/host-agent
sudo sh install.sh            # or: sudo sh install.sh <app-folder> <interval-in-s>
```

It installs a `sysmon-host` systemd service writing `data/host-metrics.json` in the app folder;
`main.py` uses this file as long as it is recent (less than 15 s old). The service runs as the
owner of the app with only the `CAP_SYS_PTRACE` and `CAP_DAC_READ_SEARCH` capabilities (to read
the processes). Uninstall with `sudo sh uninstall.sh`.

## Building the collector

Requirement: [Rust](https://rustup.rs). No C cross-toolchain is needed: the binary is linked
with the `rust-lld` shipped by rustup (see `collector/.cargo/config.toml`).

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File collector\build.ps1
```

```sh
# Linux, macOS, WSL or directly on the board
sh collector/build.sh
```

The scripts run the tests, then copy the binary to `python/bin/sysmon-collector`.
`python package.py` then builds the app archive and the language packs in the parent folder of the project.

The collector can also be run on its own on the board:

```sh
python/bin/sysmon-collector --once     # info + metrics, then exit
python/bin/sysmon-collector --info     # board, kernel, firmware
python/bin/sysmon-collector --probe    # GPU / NPU / thermal sources found
python/bin/sysmon-collector --help
```

## Settings

Environment variables read by `main.py` / the collector:

| Variable | Purpose | Default |
|---|---|---|
| `SYSMON_INTERVAL` | seconds between two samples | `5` |
| `SYSMON_TOP` | number of processes listed | `8` |
| `SYSMON_HOST_FILE` | file written by the host agent | `data/host-metrics.json` |
| `SYSMON_GPU_BUSY_FILE` | sysfs GPU utilization file to force | auto-detected |
| `SYSMON_GPU_FREQ_FILE` | sysfs GPU frequency file (Hz) to force | auto-detected |
| `SYSMON_NPU_BUSY_FILE` | NPU utilization file to force | auto-detected |
| `SYSMON_NPU_FREQ_FILE` | NPU frequency file (Hz) to force | auto-detected |

The **Run diagnostics** button of the *System & firmware* tab (or `--probe`) lists the files
found on the board to pick these values.

## API

| Route | Response |
|---|---|
| `GET /info` | board, kernel, OS, firmware, network, source of the metrics |
| `GET /get_samples/{measure}/{start}/{window}` | averaged history, e.g. `/get_samples/temp/-1d/15m` |
| `GET /probe` | GPU / NPU / thermal sources detected |
| WebSocket `metrics` | a full sample every `SYSMON_INTERVAL` seconds |
| WebSocket `info` | static information (at start, then every 5 min) |

Stored measures: `cpu`, `mem`, `swap`, `temp`, `gpu`, `npu`, `load1`, `cpu_freq`, `gpu_freq`,
`net_rx`, `net_tx`, `disk_r`, `disk_w` (throughputs in KB/s).

## Known limitations

- **NPU utilization**: current kernels do not always publish a utilization percentage for the
  Hexagon DSP. The v2 then shows its state (`running`…), its firmware and the processes using
  it; the percentage appears as soon as the kernel exposes it (`/dev/accel` + fdinfo, devfreq)
  or with `SYSMON_NPU_BUSY_FILE`.
- **Microcontroller firmware** (STM32): it is not visible from Linux.
- Without the host agent, see *Container view and host agent*.

## Structure

```
app.yaml                 app description and Bricks
python/main.py           storage, streaming, API
python/bin/              compiled collector (aarch64)
assets/                  dashboard (index.html, app.js, i18n.js, style.css, libs/)
lang-packs/              optional language packs (de, es, fi, it, ja, pt, ru, uk, zh)
collector/               Rust collector source, tests, build scripts
host-agent/              host agent install / uninstall
package.py               builds the app archive and the language packs
```
