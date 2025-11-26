# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

import secrets
import string

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.video_objectdetection import VideoObjectDetection
from arduino.app_peripherals.camera import Camera
from datetime import datetime, UTC

def generate_secret() -> str:
  characters = string.ascii_letters + string.digits
  return ''.join(secrets.choice(characters) for i in range(5))

secret = generate_secret()

ui = WebUI(use_ssl=True)
camera = Camera("ws://0.0.0.0:8080", secret=secret, enable_encryption=True)

ui.on_connect(lambda sid: ui.send_message("welcome", {"secret": secret, "status": camera.status, "protocol": camera.protocol, "ip": camera.ip, "port": camera.port}))
camera.on_status_changed(lambda evt_type, data: ui.send_message(evt_type, data))

detection = VideoObjectDetection(camera, confidence=0.5, debounce_sec=0.0)

ui.on_message("override_th", lambda sid, threshold: detection.override_threshold(threshold))

# Register a callback for when all objects are detected
def send_detections_to_ui(detections: dict):
  for key, value in detections.items():
    entry = {
      "content": key,
      "confidence": value.get("confidence"),
      "timestamp": datetime.now(UTC).isoformat()
    }
    ui.send_message("detection", entry)

detection.on_detect_all(send_detections_to_ui)

App.run()
