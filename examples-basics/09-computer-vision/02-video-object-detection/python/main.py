# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to detect objects in a video stream from the camera and log the results to the console.

from arduino.app_utils import App, Logger # Import the App and Logger classes to create an App Lab application and log messages
from arduino.app_bricks.video_objectdetection import VideoObjectDetection # Import the VideoObjectDetection class to perform object detection on a video stream
from arduino.app_peripherals.camera import Camera # Import the Camera class to configure the video source

CONFIDENCE_THRESHOLD = 0.5                                                                 # Confidence threshold for object detection
logger = Logger("VideoObjectDetectionApp")                                                 # Initialize a logger for the application

# List of camera configurations available, choose the one uncomment it and comment the others.
camera = Camera(resolution=(640, 480), fps=30)
#camera = Camera("csi:0", resolution=(640, 480), fps=30) # CSI camera with positional source identifier
#camera = Camera("usb:0", resolution=(640, 480), fps=30) # USB camera with positional source identifier
#camera = Camera("rtsp://<RTSP_URL>", username="<USERNAME>", password="<PASSWORD>") # RTSP camera stream

# List of video object detection configurations available, choose the one uncomment it and comment the others.
detection_stream = VideoObjectDetection(camera=camera, confidence=CONFIDENCE_THRESHOLD, debounce_sec=0.0) # Initialize the VideoObjectDetection brick with the specified confidence threshold and debounce time
#detection_stream = VideoObjectDetection(camera=camera, confidence=0.7, debounce_sec=0.0) # Use a stricter confidence threshold
#detection_stream = VideoObjectDetection(camera=camera, confidence=CONFIDENCE_THRESHOLD, debounce_sec=1.0) # Debounce repeated detections of the same object

# Define a callback for when all objects are detected
# This function will be called every time the VideoObjectDetection brick detects objects in the video stream, 
# and it will log the detected objects and their confidence scores to the console.
def send_detections_to_console(detections: dict):
  for key, values in detections.items():                                              # iterate through the detected objects and log their labels and confidence scores
    for value in values:
      logger.info(f"Detected {key} with confidence {value.get('confidence', 'N/A')}") # Log the label and confidence score of each detected object

detection_stream.on_detect_all(send_detections_to_console)                                 # Register the callback function to be called when objects are detected in the video stream

App.run()
