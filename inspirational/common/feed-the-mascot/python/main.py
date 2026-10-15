# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.video_object_tracking import VideoObjectTracking
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.camera import Camera
from arduino.app_utils import App, Logger
from arduino.app_utils.image import cropped_to_aspect_ratio, flipped_h, resized

FEED_ZONE = (952, 239, 1250, 537)  # x1, y1, x2, y2 in the 1280x720 camera frame
BITES_TO_GROW_UP = 9
SAME_CLASS_PAUSE = 2.0  # seconds before an object of the class just eaten counts again: the tracker may see it twice

logger = Logger("FeedTheMascot")

bites = 0
first_bite = 0.0
grown_in: float | None = None  # seconds from the first bite to the last one
last_bite_of: dict[str, float] = {}

ui = WebUI()
tracker = VideoObjectTracking(
    camera=Camera(
        resolution=(1280, 720),
        codec="MJPG",
        adjustments=cropped_to_aspect_ratio((16, 9)) | resized((1280, 720)) | flipped_h(),
    ),
    labels_to_ignore=["person"],
)
tracker.set_rectangular_area(*FEED_ZONE)


def game_state() -> dict:
    return {"bites": bites, "won": bites >= BITES_TO_GROW_UP, "elapsed": grown_in, "zone": FEED_ZONE}


def on_enter(event: dict) -> None:
    """Count an object entering the feed zone as a bite, unless the mascot is fully grown or ate an object of the
    class just now."""
    global bites, first_bite, grown_in
    label = event["label"]
    now = time.monotonic()
    if bites >= BITES_TO_GROW_UP or now - last_bite_of.get(label, -SAME_CLASS_PAUSE) < SAME_CLASS_PAUSE:
        return
    last_bite_of[label] = now
    bites += 1
    if bites == 1:
        first_bite = now
    if bites == BITES_TO_GROW_UP:
        grown_in = now - first_bite
    logger.info(f"Bite {bites}: {label} #{event['object_id']}")
    ui.send_message("bite", {"bites": bites})
    ui.send_message("state", game_state())


def on_play_again(_sid: str, _data: dict) -> None:
    global bites, grown_in
    bites = 0
    grown_in = None
    last_bite_of.clear()
    ui.send_message("state", game_state())


tracker.on_area_enter(on_enter)
ui.on_message("confidence", lambda _sid, percent: tracker.override_threshold(percent / 100))
ui.on_message("play_again", on_play_again)
ui.on_connect(lambda sid: ui.send_message("state", game_state(), room=sid))

App.run()
