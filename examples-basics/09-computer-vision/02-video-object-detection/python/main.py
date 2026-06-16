# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to detect objects in a video stream from the camera and log the results to the console.

from arduino.app_utils import App, Logger
from arduino.app_bricks.video_objectdetection import VideoObjectDetection
from arduino.app_peripherals.camera import Camera

CONFIDENCE_THRESHOLD = 0.5 # Confidence threshold for object detection
logger = Logger("VideoObjectDetectionApp")

# List of camera configurations available, choose the one uncomment it and comment the others.
camera = Camera(resolution=(640, 480), fps=30)
#camera = Camera("csi:0", resolution=(640, 480), fps=30) # CSI camera with positional source identifier
#camera = Camera("usb:0", resolution=(640, 480), fps=30) # USB camera with positional source identifier
#camera = Camera("rtsp://<RTSP_URL>", username="<USERNAME>", password="<PASSWORD>") # RTSP camera stream

# List of video object detection configurations available, choose the one uncomment it and comment the others.
detection_stream = VideoObjectDetection(camera=camera, confidence=CONFIDENCE_THRESHOLD, debounce_sec=0.0) # Initialize the VideoObjectDetection brick with the specified confidence threshold and debounce time
#detection_stream = VideoObjectDetection(camera=camera, confidence=0.7, debounce_sec=0.0) # Use a stricter confidence threshold
#detection_stream = VideoObjectDetection(camera=camera, confidence=CONFIDENCE_THRESHOLD, debounce_sec=1.0) # Debounce repeated detections of the same object

# Define a callback to be called every time the VideoObjectDetection brick detects objects
def send_detections_to_console(detections: dict):
  for key, values in detections.items():
    for value in values:
      logger.info(f"Detected {key} with confidence {value.get('confidence', 'N/A')}")

detection_stream.on_detect_all(send_detections_to_console) # Register the callback function to be called when objects are detected in the video stream

App.run()
