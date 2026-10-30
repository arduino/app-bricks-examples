# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_object_tracking import VideoObjectTracking

# Track only people: every other label is left out of the callbacks, the counters and the video
# The debounce runs the callback at most once a second; the counters are updated on every frame anyway
tracker = VideoObjectTracking(confidence=0.4, debounce_sec=1.0, labels_to_track=["person"])


# Callback for all tracked objects of a frame (must take one dict argument)
def on_all_tracked(objects: dict):
    # The list of a label holds its objects in the current frame, each with the ID the tracker gave it
    in_view = len(objects.get("person", []))
    # An object is counted once, the first time its ID appears, so a person standing in view counts as one
    distinct = tracker.get_unique_objects_count().get("person", 0)
    print(f"People in view: {in_view}, distinct people seen so far: {distinct}")


tracker.on_detect_all(on_all_tracked)

# Run the application (keeps the video tracking loop active)
App.run()
