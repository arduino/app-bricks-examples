# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from PIL.Image import Image
from arduino.app_utils import App
from arduino.app_bricks.camera_code_detection import CameraCodeDetection, Detection


def on_codes_detected(frame: Image, detections: list[Detection]):
    """Callback function that handles multiple detected codes."""
    print(f"Detected {len(detections)} codes")
    # Here you can add your code to process the detected codes,
    # e.g., draw bounding boxes, save them to a database or log them.


detector = CameraCodeDetection()
detector.on_detect(on_codes_detected)

App.run()
