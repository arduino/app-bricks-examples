# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_objectdetection import VideoObjectDetection

# Initialize detector with custom confidence and debounce settings
video_detector = VideoObjectDetection(confidence=0.4, debounce_sec=1.5)


# Callback when a "person" is detected (no arguments allowed)
def on_person_detected():
    print("🚨 Person detected in the video stream!")


video_detector.on_detect("person", on_person_detected)


# Callback for all detections (must take one dict argument)
def on_all_detections(detections: dict):
    # Example: {"person": 0.87, "bicycle": 0.66}
    print("All detections:", detections)


video_detector.on_detect_all(on_all_detections)

# Run the application (keeps the video detection loop active)
App.run()
