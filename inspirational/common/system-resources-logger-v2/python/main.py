# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

"""System Resources Logger v2.

The metrics are read by the Rust collector (python/bin/sysmon-collector), which prints one
JSON object per line. This script stores them with the dbstorage_tsstore Brick and streams
them to the dashboard with the web_ui Brick.

When the optional host agent (host-agent/) is installed, it writes the metrics seen from the
board itself (all processes, Wi-Fi, host OS, firmware) to data/host-metrics.json, which is
then preferred over the view from inside the App Lab container.
"""

import json
import os
import platform
import shutil
import stat
import subprocess
import threading
import time
from typing import Any

from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App

INTERVAL = float(os.environ.get("SYSMON_INTERVAL", "5"))
TOP = int(os.environ.get("SYSMON_TOP", "8"))
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(APP_DIR, "python", "bin")
HOST_FILE = os.environ.get("SYSMON_HOST_FILE", os.path.join(APP_DIR, "data", "host-metrics.json"))
HOST_MAX_AGE_S = max(15.0, INTERVAL * 3)

# Measures stored in the database, extracted from a metrics sample.
MEASURES = {
    "cpu": lambda m: m["cpu"]["usage"],
    "mem": lambda m: m["mem"]["percent"],
    "swap": lambda m: m["mem"]["swap_percent"],
    "temp": lambda m: m["temps"]["max"],
    "gpu": lambda m: m["gpu"]["busy"],
    "npu": lambda m: m["npu"]["busy"],
    "load1": lambda m: m["load"][0],
    "cpu_freq": lambda m: m["cpu"]["freq_avg_mhz"],
    "gpu_freq": lambda m: m["gpu"]["freq_mhz"],
    "net_rx": lambda m: m["net"]["rx_bps"] / 1024,
    "net_tx": lambda m: m["net"]["tx_bps"] / 1024,
    "disk_r": lambda m: sum(d["read_bps"] or 0 for d in m["disk"]["io"]) / 1024,
    "disk_w": lambda m: sum(d["write_bps"] or 0 for d in m["disk"]["io"]) / 1024,
}
AGGR_WINDOWS = {"1m", "5m", "10m", "15m", "30m", "1h", "3h", "6h", "12h", "1d"}

db = TimeSeriesStore()
ui = WebUI()

state_lock = threading.Lock()
state: dict[str, Any] = {"info": None, "metrics": None, "source": None, "error": None}


def collector_path() -> str | None:
    """Returns an executable copy of the collector for this CPU, or None."""
    arch = platform.machine().lower()
    names = ["sysmon-collector"]
    if arch in ("x86_64", "amd64"):
        names.insert(0, "sysmon-collector-x86_64")
    for name in names:
        path = os.path.join(BIN_DIR, name)
        if not os.path.isfile(path):
            continue
        if os.access(path, os.X_OK):
            return path
        # Files copied by App Lab may lose the executable bit.
        try:
            os.chmod(path, os.stat(path).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            return path
        except OSError:
            tmp = os.path.join("/tmp", name)
            shutil.copyfile(path, tmp)
            os.chmod(tmp, 0o755)
            return tmp
    return None


def read_host_file():
    """Returns (info, metrics) from the host agent when its file is fresh."""
    try:
        if time.time() - os.path.getmtime(HOST_FILE) > HOST_MAX_AGE_S:
            return None
        with open(HOST_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("info"), data.get("metrics")
    except (OSError, ValueError):
        return None


def store(metrics: dict):
    ts = metrics.get("ts") or int(time.time() * 1000)
    for measure, extract in MEASURES.items():
        try:
            value = extract(metrics)
        except (KeyError, TypeError, IndexError):
            continue
        if value is None:
            continue
        try:
            db.write_sample(measure, float(value), ts)
        except Exception as e:
            print(f"write_sample({measure}) failed: {e}")


def publish(container_metrics: dict):
    host = read_host_file()
    if host and host[1]:
        info, metrics = host
        source = "host-agent"
    else:
        info, metrics = None, container_metrics
        source = "container"
    with state_lock:
        if info:
            state["info"] = info
        state["metrics"] = metrics
        state["source"] = source
        if not metrics.get("fallback"):
            state["error"] = None
        error = state["error"]
    store(metrics)
    ui.send_message("metrics", {"source": source, "error": error, **metrics})


def run_collector():
    """Streams the Rust collector forever, restarting it if it stops."""
    while True:
        path = collector_path()
        if path is None:
            fallback_loop({"code": "collector_missing"})
            continue
        try:
            proc = subprocess.Popen(
                [path, "--interval", str(INTERVAL), "--top", str(TOP)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
        except OSError as e:
            fallback_loop({"code": "collector_start", "detail": str(e)})
            continue
        for line in proc.stdout or []:
            try:
                msg = json.loads(line)
            except ValueError:
                continue
            if "info" in msg:
                with state_lock:
                    if state["source"] != "host-agent":
                        state["info"] = msg["info"]
                ui.send_message("info", get_info())
            elif "metrics" in msg:
                publish(msg["metrics"])
        err = proc.stderr.read().strip() if proc.stderr else ""
        code = proc.wait()
        detail = f"{code} {err}".strip()
        with state_lock:
            state["error"] = {"code": "collector_stopped", "detail": detail}
        print(f"collector stopped: {detail}")
        time.sleep(2)


def fallback_loop(reason: dict, rounds: int = 12):
    """Minimal psutil metrics used only when the Rust collector cannot run.

    `reason` is an error code ({"code", "detail"}) translated by the dashboard.
    """
    try:
        import psutil
    except ImportError:
        with state_lock:
            state["error"] = {"code": "no_psutil"}
        print(f"psutil is missing, no metrics: {reason}")
        time.sleep(30)
        return
    with state_lock:
        state["error"] = reason
        if state["info"] is None:
            u = platform.uname()
            state["info"] = {
                "board": {"model": None, "hostname": u.node},
                "kernel": {"release": u.release, "version": u.version, "arch": u.machine},
                "cpu": {"count": psutil.cpu_count()},
                "firmware": [],
                "scope": "container",
                "collector": None,
            }
    print(f"psutil fallback: {reason}")
    for _ in range(rounds):
        cpu = psutil.cpu_percent(interval=1)
        vm = psutil.virtual_memory()
        sw = psutil.swap_memory()
        load = os.getloadavg()
        metrics = {
            "ts": int(time.time() * 1000),
            "scope": "container",
            "cpu": {
                "usage": cpu,
                "cores": [{"id": i, "usage": u} for i, u in enumerate(psutil.cpu_percent(percpu=True))],
            },
            "mem": {
                "total": vm.total,
                "used": vm.total - vm.available,
                "available": vm.available,
                "percent": vm.percent,
                "swap_total": sw.total,
                "swap_used": sw.used,
                "swap_percent": sw.percent if sw.total else None,
            },
            "load": list(load),
            "temps": {"zones": [], "max": None},
            "net": {"ifaces": [], "rx_bps": None, "tx_bps": None},
            "disk": {"io": [], "usage": []},
            "gpu": {"present": False},
            "npu": {"present": False},
            "procs": {"count": len(psutil.pids()), "top": []},
            "fallback": True,
        }
        publish(metrics)
        time.sleep(max(0.0, INTERVAL - 1))


def get_info():
    with state_lock:
        return {
            "info": state["info"],
            "source": state["source"],
            "error": state["error"],
            "interval": INTERVAL,
            "measures": list(MEASURES),
        }


def on_get_samples(resource: str, start: str, aggr_window: str):
    if resource not in MEASURES:
        return {"error": f"unknown measure: {resource}"}
    if aggr_window not in AGGR_WINDOWS:
        return {"error": f"invalid aggregation window: {aggr_window}"}
    try:
        samples = db.read_samples(
            measure=resource, start_from=start, aggr_window=aggr_window, aggr_func="mean", limit=500
        )
    except Exception as e:
        return {"error": str(e)}
    return [{"ts": s[1], "value": s[2]} for s in samples if s[2] is not None]


def on_get_probe():
    path = collector_path()
    if path is None:
        return {"error": "collector not found"}
    out = subprocess.run([path, "--probe"], capture_output=True, text=True, timeout=20)
    return json.loads(out.stdout) if out.returncode == 0 else {"error": out.stderr}


def on_connect(sid: str):
    ui.send_message("info", get_info(), room=sid)
    with state_lock:
        last = state["metrics"]
        source = state["source"]
    if last:
        ui.send_message("metrics", {"source": source, **last}, room=sid)


ui.expose_api("GET", "/info", get_info)
ui.expose_api("GET", "/probe", on_get_probe)
ui.expose_api("GET", "/get_samples/{resource}/{start}/{aggr_window}", on_get_samples)
ui.on_connect(on_connect)

collector_thread = None


def user_loop():
    # Bricks are started by App.run(): the collector starts once they can store and stream.
    global collector_thread
    if collector_thread is None:
        collector_thread = threading.Thread(target=run_collector, name="sysmon-collector", daemon=True)
        collector_thread.start()
    time.sleep(1)


App.run(user_loop=user_loop)
