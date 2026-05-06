# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App, Logger, Bridge
from arduino.app_bricks.video_imageclassification import VideoImageClassification
import time

# Example app to detect people in a video stream, log the results to the console and trigger an action on the MCU
logger = Logger("VideoPersonClassificationApp")                                                 # Initialize a logger for the application
CONFIDENCE_THRESHOLD = 0.5                                                                      # Confidence threshold for object detection

detection_stream = VideoImageClassification(confidence=CONFIDENCE_THRESHOLD, debounce_sec=1.0)  # Initialize the VideoImageClassification brick with the specified confidence threshold and debounce time

# Variable to keep track of the previous state of person detection, used to avoid triggering the animation repeatedly when the state hasn't changed
previous_state : bool = False 

# Function to turn on or off the LED matrix animation based on the detection of a person. 
# It checks if the new state is different from the previous state to avoid unnecessary triggers to the LED matrix.
def turn_on_off_animation(new_state: bool):
    global previous_state                                          # Use the global variable to keep track of the previous state of person detection
    if new_state != previous_state:            
        previous_state = new_state                                 # Update the previous state to the new state
        if new_state == True:
           Bridge.call("turn_led_matrix", True)                    # Call the "turn_led_matrix" function defined in the sketch to turn on the LED matrix animation
        else:
           logger.info("No person detected, stopping animation.")  # Log a message when no person is detected
           Bridge.call("turn_led_matrix", False)                   # Call the "turn_led_matrix" function defined in the sketch to turn off the LED matrix animation
        


# Define the callback function for when a person is detected
def person_detected():
  logger.info("Person detected!")  # Log a message when a person is detected
  turn_on_off_animation(True)       # Call the function to turn on the LED matrix animation

# Define the callback function for when all objects are detected
def on_all_detections(classifications: dict):
  if len(classifications) == 0:
      return
  for key, _ in classifications.items():
    if key != "person":
        turn_on_off_animation(False)      # Call the function to turn off the LED matrix animation if no person is detected among the classifications

detection_stream.on_detect("person", person_detected) # Register the callback function to be called when a person is detected in the video stream

detection_stream.on_detect_all(on_all_detections)     # Register the callback function to be called at any object detected in the video stream

App.run()
