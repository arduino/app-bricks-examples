# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.video_imageclassification import VideoImageClassification
from datetime import datetime, UTC
import json

ui = WebUI()
detection_stream = VideoImageClassification(confidence=0.5, debounce_sec=0.0)

ui.on_message("override_th", lambda sid, threshold: detection_stream.override_threshold(threshold))

# Example usage: Register a callback for when a specific object is detected
def person_detected():
  pass  # Implement your logic here, e.g., send a notification

detection_stream.on_detect("person", person_detected)

# Example usage: Register a callback for when all objects are detected
def send_detections_to_ui(classifications: dict):
  if len(classifications) == 0:
      return
      
  entries = []
  for key, value in classifications.items():
    entry = {
      "content": key,
      "confidence": value,
      "timestamp": datetime.now(UTC).isoformat()
    }
    entries.append(entry)    
  
  if len(entries) > 0:
    msg = json.dumps(entries)
    ui.send_message("classifications", message=msg)

detection_stream.on_detect_all(send_detections_to_ui)

App.run()
