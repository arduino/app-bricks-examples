# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_object_tracking import VideoObjectTracking

tracker = VideoObjectTracking(confidence=0.4)

# A rectangle in the centre of the frame, by two opposite corners as fractions of the frame to fit any camera resolution
# Any polygon works too, from its points along the border:
# tracker.set_area_coordinates([(0.2, 0.1), (0.8, 0.1), (0.9, 0.9), (0.1, 0.9)], relative=True)
tracker.set_rectangular_area(0.25, 0.25, 0.75, 0.75, relative=True)


# Callback for every object entering the area (must take one dict argument)
def on_enter(event: dict):
    # Example: {"label": "cup", "object_id": 3}
    print(f"{event['label']} #{event['object_id']} entered the area")
    # The objects inside the area now, per label. Example: {"cup": 1}
    print("Objects in the area:", tracker.get_objects_in_area())


# Callback for every object leaving the area, or disappearing inside it (must take one dict argument)
def on_exit(event: dict):
    print(f"{event['label']} #{event['object_id']} left the area")
    # The entries and exits since the start, per label. Example: {"cup": {"entered": 3, "exited": 2}}
    print("Area counts:", tracker.get_area_counts())


tracker.on_area_enter(on_enter)
tracker.on_area_exit(on_exit)

# Run the application (keeps the video tracking loop active)
# Open http://<board>:4912/ in a browser to watch the video with the area and the tracked objects
App.run()
