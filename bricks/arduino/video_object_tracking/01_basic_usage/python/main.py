# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_object_tracking import VideoObjectTracking

# Initialize the tracker with custom confidence and debounce settings
tracker = VideoObjectTracking(confidence=0.4, debounce_sec=1.5)


# Callback when a "person" is tracked: one dict argument with the details of the person, once per person in the frame
def on_person_tracked(details: dict):
    # Example: {"object_id": 7, "confidence": 0.87, "bounding_box_xyxy": (10, 20, 110, 220)}
    print(f"🚶 Person #{details['object_id']} at {details['bounding_box_xyxy']}")


tracker.on_detect("person", on_person_tracked)


# Callback for all tracked objects of a frame (must take one dict argument)
def on_all_tracked(objects: dict):
    # Example: {"person": [{"object_id": 7, "confidence": 0.87, "bounding_box_xyxy": (10, 20, 110, 220)}]}
    print("Tracked objects:", objects)


tracker.on_detect_all(on_all_tracked)

# Run the application (keeps the video tracking loop active)
# Open http://<board>:4912/ in a browser to watch the video with the boxes and the IDs of the tracked objects
App.run()
