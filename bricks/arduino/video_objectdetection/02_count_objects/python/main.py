# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_objectdetection import VideoObjectDetection

# Initialize detector with custom confidence and debounce settings
video_detector = VideoObjectDetection(confidence=0.4, debounce_sec=1.5)


# Callback for all detections (must take one dict argument)
def on_all_detections(detections: dict):
    count = {}
    for label, boxes in detections.items():
        # Boxes is a list of bounding boxes for the given label, containig all the detections of that label in the current frame
        count[label] = len(boxes)

    print("Object counts:", count)


video_detector.on_detect_all(on_all_detections)

# Run the application (keeps the video detection loop active)
App.run()
