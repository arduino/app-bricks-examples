# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import datetime
import math
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App, Bridge

db = TimeSeriesStore()

def on_get_samples(resource: str, start: str, aggr_window: str):
    samples = db.read_samples(measure=resource, start_from=start, aggr_window=aggr_window, aggr_func="mean", limit=100)
    return [{"ts": s[1], "value": s[2]} for s in samples]

ui = WebUI()
ui.expose_api("GET", "/get_samples/{resource}/{start}/{aggr_window}", on_get_samples)

def record_sensor_samples(celsius: float, humidity: float):
    """Callback invoked by the board sketch via Bridge.notify to send sensor samples.
    Stores temperature and humidity samples in the time-series DB and forwards them to the Web UI.
    """
    if celsius is None or humidity is None:
        print("Received invalid sensor samples: celsius=%s, humidity=%s" % (celsius, humidity))
        return

    ts = int(datetime.datetime.now().timestamp() * 1000)
    # Write samples to time-series DB
    db.write_sample("temperature", float(celsius), ts)
    db.write_sample("humidity", float(humidity), ts)

    # Push realtime updates to the UI
    ui.send_message('temperature', {"value": float(celsius), "ts": ts})
    ui.send_message('humidity', {"value": float(humidity), "ts": ts})

    # --- Derived metrics ---
    T = float(celsius)
    RH = float(humidity)

    # Dew point (Magnus formula) - compute only when RH > 0 to avoid math.log(0)
    a = 17.27
    b = 237.7
    dew_point = None
    if RH > 0.0:
        # clamp RH into (0,100] and avoid exact zero
        rh_frac = max(min(RH, 100.0), 1e-6)
        gamma = (a * T) / (b + T) + math.log(rh_frac / 100.0)
        dew_point = (b * gamma) / (a - gamma)

    # Heat Index (using Rothfusz regression). Convert to Fahrenheit and back to Celsius.
    T_f = T * 9.0 / 5.0 + 32.0
    R = max(min(RH, 100.0), 0.0)
    HI_f = (-42.379 + 2.04901523 * T_f + 10.14333127 * R - 0.22475541 * T_f * R
            - 0.00683783 * T_f * T_f - 0.05481717 * R * R
            + 0.00122874 * T_f * T_f * R + 0.00085282 * T_f * R * R
            - 0.00000199 * T_f * T_f * R * R)
    heat_index = (HI_f - 32.0) * 5.0 / 9.0

    # Absolute humidity (g/m^3)
    absolute_humidity = None
    if RH is not None and RH >= 0.0:
        es = 6.112 * math.exp((17.67 * T) / (T + 243.5))
        absolute_humidity = es * (R / 100.0) * 2.1674 / (273.15 + T)


    # Store and forward derived metrics if computed
    if dew_point is not None:
        db.write_sample("dew_point", float(dew_point), ts)
        ui.send_message('dew_point', {"value": float(dew_point), "ts": ts})
    if heat_index is not None:
        db.write_sample("heat_index", float(heat_index), ts)
        ui.send_message('heat_index', {"value": float(heat_index), "ts": ts})
    if absolute_humidity is not None:
        db.write_sample("absolute_humidity", float(absolute_humidity), ts)
        ui.send_message('absolute_humidity', {"value": float(absolute_humidity), "ts": ts})

print("Registering 'record_sensor_samples' callback.")
Bridge.provide("record_sensor_samples", record_sensor_samples)

print("Starting App...")
App.run()
