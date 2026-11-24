# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.video_object_tracking import VideoObjectTracking
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.camera import Camera
from arduino.app_utils import App
from arduino.app_utils.image import cropped_to_aspect_ratio, flipped_h

WHOLE_FRAME = (0, 0, 1, 1)  # x1, y1, x2, y2 as fractions of the camera frame

camera_available = True

ui = WebUI()
camera = Camera(
    resolution=(1280, 720),
    fps=30,
    codec="MJPG",
    adjustments=cropped_to_aspect_ratio((16, 9)) | flipped_h(),
)
tracker = VideoObjectTracking(
    camera=camera,
    labels_to_track=["person"],
    keep_grace=35,
    min_detections=1,
    iou_threshold=0.05,
    min_detections_to_count=25,
)
tracker.set_rectangular_area(*WHOLE_FRAME, relative=True, visible=False)


def counts() -> dict:
    return {
        "counted": tracker.get_unique_objects_count().get("person", 0),
        "in_view": tracker.get_objects_in_area().get("person", 0),
    }


def send_counts(_event: dict) -> None:
    ui.send_message("counts", counts())


def on_camera_status(status: str, _data: dict) -> None:
    global camera_available
    camera_available = status != "disconnected"
    ui.send_message("camera", {"available": camera_available})


def on_connect(sid: str) -> None:
    ui.send_message("counts", counts(), room=sid)
    ui.send_message("camera", {"available": camera_available}, room=sid)


camera.on_status_changed(on_camera_status)
tracker.on_area_enter(send_counts)
tracker.on_area_exit(send_counts)
ui.on_connect(on_connect)

App.run()
