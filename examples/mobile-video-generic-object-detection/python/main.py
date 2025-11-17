# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

import time
import secrets
import string

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.video_objectdetection import VideoObjectDetection
from arduino.app_peripherals.camera import Camera
from datetime import datetime, UTC

def generate_secret() -> str:
  characters = string.ascii_letters + string.digits
  password = ''.join(secrets.choice(characters) for i in range(5))
  return password

password = generate_secret()

camera = Camera("ws://0.0.0.0:8080")
detection_stream = VideoObjectDetection(camera, confidence=0.5, debounce_sec=0.0)

ui = WebUI(use_ssl=True)
ui.on_message("override_th", lambda sid, threshold: detection_stream.override_threshold(threshold))
ui.on_connect(lambda sid: ui.send_message("secret", message=password))

# Register a callback for when all objects are detected
def send_detections_to_ui(detections: dict):
  for key, value in detections.items():
    entry = {
      "content": key,
      "confidence": value.get("confidence"),
      "timestamp": datetime.now(UTC).isoformat()
    }
    ui.send_message("detection", message=entry)

detection_stream.on_detect_all(send_detections_to_ui)

def user_loop():
  # WIP: Simulate webcam connection and streaming events
  time.sleep(10)
  ui.send_message("webcam_connected", message="")
  time.sleep(10)
  ui.send_message("webcam_streaming_started", message="")
  time.sleep(30)
  ui.send_message("webcam_streaming_stopped", message="")
  time.sleep(10)
  ui.send_message("webcam_streaming_started", message="")
  time.sleep(30)
  ui.send_message("webcam_streaming_stopped", message="")
  time.sleep(10)
  ui.send_message("webcam_disconnected", message="")

App.run(user_loop=user_loop)
