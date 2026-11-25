# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.video_object_tracking import VideoObjectTracking
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.camera import Camera
from arduino.app_utils import App, Logger
from arduino.app_utils.image import cropped_to_aspect_ratio, flipped_h

FEED_ZONE = (0.744, 0.332, 0.977, 0.746)  # x1, y1, x2, y2 as fractions of the camera frame
BITES_TO_GROW_UP = 9
DEFAULT_CONFIDENCE_PERCENT = 30
TOO_BIG_TO_CARRY = [
    "refrigerator", "oven", "microwave", "sink", "toilet", "bed", "couch", "chair", "dining table", "tv",
    "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
]

logger = Logger("FeedTheMascot")

bites = 0
first_bite = 0.0
grown_in: float | None = None  # seconds from the first bite to the last one
confidence_percent = DEFAULT_CONFIDENCE_PERCENT
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
    confidence=confidence_percent / 100,
    labels_to_ignore=["person", *TOO_BIG_TO_CARRY],
    keep_grace=4,
    min_detections=2,
)
tracker.set_rectangular_area(*FEED_ZONE, relative=True)


def game_state() -> dict:
    return {
        "bites": bites,
        "goal": BITES_TO_GROW_UP,
        "won": bites >= BITES_TO_GROW_UP,
        "elapsed": grown_in,
        "zone": FEED_ZONE,
        "confidence": confidence_percent,
        "default_confidence": DEFAULT_CONFIDENCE_PERCENT,
    }


def on_enter(event: dict) -> None:
    """Count an object entering the feed zone as a bite, unless the mascot is fully grown."""
    global bites, first_bite, grown_in
    if bites >= BITES_TO_GROW_UP:
        return
    now = time.monotonic()
    bites += 1
    if bites == 1:
        first_bite = now
    if bites == BITES_TO_GROW_UP:
        grown_in = now - first_bite
    logger.info(f"Bite {bites}: {event['label']} #{event['object_id']}")
    ui.send_message("bite", {"bites": bites})
    ui.send_message("state", game_state())


def on_play_again(_sid: str, _data: dict) -> None:
    global bites, grown_in
    bites = 0
    grown_in = None
    ui.send_message("state", game_state())


def on_confidence(_sid: str, percent: int) -> None:
    global confidence_percent
    tracker.override_threshold(percent / 100)
    confidence_percent = percent
    ui.send_message("state", game_state())


def on_camera_status(status: str, _data: dict) -> None:
    global camera_available
    camera_available = status != "disconnected"
    ui.send_message("camera", {"available": camera_available})


def on_connect(sid: str) -> None:
    ui.send_message("state", game_state(), room=sid)
    ui.send_message("camera", {"available": camera_available}, room=sid)


camera.on_status_changed(on_camera_status)
tracker.on_area_enter(on_enter)
ui.on_message("confidence", on_confidence)
ui.on_message("play_again", on_play_again)
ui.on_connect(on_connect)

App.run()
