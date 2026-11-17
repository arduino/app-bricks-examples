# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import threading

from arduino.app_bricks.video_object_tracking import VideoObjectTracking
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.camera import Camera
from arduino.app_utils import App
from arduino.app_utils.image import cropped_to_aspect_ratio, flipped_h

WHOLE_FRAME = (0, 0, 1, 1)  # x1, y1, x2, y2 as fractions of the camera frame

ui = WebUI()
tracker = VideoObjectTracking(
    camera=Camera(
        resolution=(1280, 720),
        fps=30,
        codec="MJPG",
        adjustments=cropped_to_aspect_ratio((16, 9)) | flipped_h(),
    ),
    labels_to_track=["person"],
    keep_grace=35,
    min_detections=1,
    iou_threshold=0.05,
    min_detections_to_count=25,
)
tracker.set_rectangular_area(*WHOLE_FRAME, relative=True, visible=False)
counts_lock = threading.Lock()  # the events arrive on several threads: the last message sent carries the latest counts


def counts() -> dict:
    return {
        "counted": tracker.get_unique_objects_count().get("person", 0),
        "in_view": tracker.get_objects_in_area().get("person", 0),
    }


def send_counts(_event: dict) -> None:
    with counts_lock:
        ui.send_message("counts", counts())


tracker.on_area_enter(send_counts)
tracker.on_area_exit(send_counts)
ui.on_connect(lambda sid: ui.send_message("counts", counts(), room=sid))

App.run()
