# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_object_tracking import VideoObjectTracking

tracker = VideoObjectTracking(confidence=0.4)

# A vertical line in the middle of the frame, as a fraction of its width so it fits any camera resolution
# Other lines: set_horizontal_crossing_line(y) and set_crossing_line_coordinates(x1, y1, x2, y2)
tracker.set_vertical_crossing_line(0.5, relative=True)


# Callback for every object crossing the line (must take one dict argument)
def on_crossing(crossing: dict):
    # Example: {"label": "person", "object_id": 7, "direction": "left"}
    print(f"{crossing['label']} #{crossing['object_id']} went {crossing['direction']}")
    # The crossings since the start, per label and direction, with their total
    # Example: {"person": {"left": 3, "right": 2, "all": 5}}
    print("Line crossings:", tracker.get_line_crossing_counts())


tracker.on_line_crossing(on_crossing)

# Run the application (keeps the video tracking loop active)
# Open http://<board>:4912/ in a browser to watch the video with the line and the tracked objects
App.run()
