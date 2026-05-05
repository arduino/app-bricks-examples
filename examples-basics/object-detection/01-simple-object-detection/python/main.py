# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_utils import Logger
from arduino.app_bricks.object_detection import ObjectDetection
from PIL import Image
import time

# Example app to detect objects in an image, log the results, and display them in a new output image with bounding boxes.

PATH_IMAGE = "assets"                                                                                       # Path to the directory containing the input image for object detection
IMAGE_FILE = "input_image.png"                                                                              # Name of the image file to be used for object detection
CONFIDENCE_THRESHOLD = 0.5                                                                                  # Confidence threshold for object detection

logger = Logger("ObjectDetectionApp")                                                                       # Initialize a logger for the application

object_detection = ObjectDetection()                                                                        # Initialize the ObjectDetection brick to perform object detection tasks

pil_image = Image.open(f"{PATH_IMAGE}/{IMAGE_FILE}")                                                        # Open the input image

def loop():
    start_time = time.time() * 1000                                                                         # Record the start time in milliseconds to measure the time taken for object detection
    results = object_detection.detect(pil_image, confidence=CONFIDENCE_THRESHOLD)                           # Perform object detection on the input image with the specified confidence threshold
    diff = time.time() * 1000 - start_time

    if results is None:                                                                                     # Check the results of object detection
        logger.info("No objects detected in the image.")
    else:
        logger.info(f"Detected {len(results.get('detection', []))} objects in the image in {diff:.2f} ms.") # Log the number of objects detected and the time taken for detection
        for idx, detection in enumerate(results.get("detection", [])):                                      # Iterate through the detected objects and log their labels and confidence scores
            label = detection.get("class_name", "unknown")                                                  # Get the label of the detected object, or "unknown" if not available
            confidence = detection.get("confidence", "0")                                                   # Get the confidence score of the detected object, or "0" if not available

            logger.info(f"Object {idx}: Label={label}, Confidence={confidence}")                            # Log the label and confidence score of each detected object
        
        img_with_boxes = object_detection.draw_bounding_boxes(pil_image, results)                           # Draw bounding boxes around the detected objects in the input image

        if img_with_boxes is not None:
            img_with_boxes.save("output_image.png", format="PNG")                                           # Save the image with bounding boxes to a file

    time.sleep(60)                                                                                          # Wait for 60 seconds before the next detection

App.run(user_loop=loop)
