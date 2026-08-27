# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.pose_estimation import POSE_NAMES, PoseEstimation
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()
pose_estimation = PoseEstimation(
    confidence=0.45,
    draw_bboxes=True,
    bbox_padding=(0.15, 0.20, 0.15, 0.20),
    draw_low_confidence_points=False,
    count_debounce_sec=1.0,
    out_of_frame_tolerance=0.05
)

for pose_name in POSE_NAMES:
    pose_estimation.on_pose(pose_name, lambda pose: ui.send_message("pose", {"name": pose.name, "event": pose.event}))

pose_estimation.on_count_change(lambda count: ui.send_message("people", {"count": count}))
pose_estimation.on_readable_change(lambda readable: ui.send_message("readable", {"value": readable}))

def sync_state(client):
    ui.send_message("people", {"count": pose_estimation.people_count}, room=client)
    ui.send_message("readable", {"value": pose_estimation.readable}, room=client)


ui.on_connect(sync_state)

App.run()
