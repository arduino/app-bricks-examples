# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import datetime
import psutil
import time
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App

db = TimeSeriesStore()

def on_get_samples(resource: str, start: str, aggr_window: str):
    samples = db.read_samples(measure=resource, start_from=start, aggr_window=aggr_window, aggr_func="mean", limit=100)
    res = []
    for sample in samples:
        point = {
            "ts": sample[1],
            "value": sample[2],
        }
        res.append(point)
    return res

ui = WebUI()
ui.expose_api("GET", "/get_samples/{resource}/{start}/{aggr_window}", on_get_samples)

def get_events():
    ts = int(datetime.datetime.now().timestamp() * 1000)
    
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    db.write_sample('cpu', cpu_percent, ts)
    ui.send_message('cpu_usage', {
        "value": cpu_percent,
        "ts": ts
    })
    # Memory usage
    mem_percent = psutil.virtual_memory().percent
    db.write_sample('mem', mem_percent, ts)
    ui.send_message('memory_usage', {
        "value": mem_percent,
        "ts": ts
    })
    
    time.sleep(5)
            
App.run(user_loop=get_events)
