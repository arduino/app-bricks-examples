# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from datetime import datetime, UTC
import io
import base64
from PIL.Image import Image
from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.camera_code_detection import CameraCodeDetection, Detection, draw_bounding_box
from arduino.app_bricks.dbstorage_sqlstore import SQLStore

detected = False

def on_code_detected(frame: Image, detection: Detection):
    """Callback function that handles a detected code."""
    global detected
    if detected:
        # If a code has already been detected, ignore further detections
        return

    frame = draw_bounding_box(frame, detection)

    buffer = io.BytesIO()
    frame.save(buffer, format="JPEG", quality=100)
    b64_frame = base64.b64encode(buffer.getvalue()).decode("utf-8")

    entry = {
        "content": detection.content,
        "type": detection.type,
        "timestamp": datetime.now(UTC).isoformat(),
        "image": b64_frame,
        "image_type": "image/jpeg",
    }
    store.store("scan_log", entry)
    ui.send_message('code_detected', entry)
    detected = True

def on_frame(frame: Image):
    """Callback function that processes each frame from the camera."""
    global detected
    if detected:
        # If a code has already been detected, ignore further detections
        return

    buffer = io.BytesIO()
    frame.save(buffer, format="JPEG", quality=100)
    b64_frame = base64.b64encode(buffer.getvalue()).decode("utf-8")

    entry = {
        "timestamp": datetime.now(UTC).isoformat(),
        "image": b64_frame,
        "image_type": "image/jpeg",
    }

    ui.send_message('frame_detected', entry)

def on_list_scans():
    """Callback function that lists the latest 5 scanned codes."""
    scans = store.read("scan_log", order_by="timestamp DESC", limit=5)
    return {"scans": scans if scans else []}

def reset_detection(_, __):
    """Callback function to reset the detection state."""
    global detected
    detected = False

def on_error(e: Exception):
    """Callback function that handles exceptions from the detector."""
    ui.send_message('error', str(e))

store = SQLStore("code-scanner.db")

detector = CameraCodeDetection()  # This also initializes the camera
detector.on_detect(on_code_detected)
detector.on_frame(on_frame)
detector.on_error(on_error)

ui = WebUI()
ui.expose_api('GET', '/list_scans', on_list_scans)
ui.on_message('reset_detection', reset_detection)

App.run()
