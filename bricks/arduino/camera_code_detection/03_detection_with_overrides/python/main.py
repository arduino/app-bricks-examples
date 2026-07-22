# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from PIL.Image import Image
from arduino.app_utils.app import App
from arduino.app_peripherals.usb_camera import Camera
from arduino.app_bricks.camera_code_detection import CameraCodeDetection, Detection


def on_code_detected(frame: Image, detection: Detection):
    """Callback function that handles a detected code."""
    print(f"Detected {detection.type} with content: {detection.content}")
    # Here you can add your code to process the detected code,
    # e.g., draw a bounding box, save it to a database or log it.


# Select another source to use different cameras
camera = Camera(source=0, resolution=(640, 360), fps=10)
detector = CameraCodeDetection(camera)
detector.on_detect(on_code_detected)

App.run()
