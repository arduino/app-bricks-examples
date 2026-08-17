# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import json
import secrets
import string
from collections import deque
from threading import Lock

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.remote_sensor import RemoteSensor


def generate_secret() -> str:
    characters = string.digits
    return ''.join(secrets.choice(characters) for _ in range(6))


secret = generate_secret()

ui = WebUI()  # set use_tls=True to enable TLS encryption for HTTPS
sensor = RemoteSensor(secret=secret)  # WebSocket server on port 8090, HMAC-authenticated with the secret

# Keep the most recent datapoints so a browser opened mid-stream catches up instantly.
HISTORY_MAX = 200
history: deque = deque(maxlen=HISTORY_MAX)
history_lock = Lock()


def pairing_payload() -> dict:
    return {
        "secret": secret,
        "status": sensor.status,
        "ip": sensor.ip,
        "port": sensor.port,
        "protocol": sensor.protocol,
    }


def on_ui_connect(sid):
    # Send connection details to the UI so it can draw the pairing QR code,
    # then replay the recent history so the dashboard fills up immediately.
    ui.send_message("welcome", pairing_payload())
    with history_lock:
        ui.send_message("history", list(history))


ui.on_connect(on_ui_connect)


def on_status_changed(status: str, info: dict):
    # Lifecycle events: "disconnected", "connected", "streaming", "paused".
    ui.send_message("sensor_status", {"status": status, "info": info})


sensor.on_status_changed(on_status_changed)


def on_datapoint(raw: bytes):
    # The peripheral delivers raw bytes; the phone sends one JSON object per message.
    try:
        data = json.loads(raw.decode())
    except Exception:
        return
    if not isinstance(data, dict):
        return
    with history_lock:
        history.append(data)
    ui.send_message("datapoint", data)


sensor.on_datapoint(on_datapoint)

sensor.start()

App.run()
