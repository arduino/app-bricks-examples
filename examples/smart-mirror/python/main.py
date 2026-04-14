# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time
from threading import Lock
from fastapi.responses import StreamingResponse
import prompt
from arduino.app_bricks.vlm import VisionLanguageModel
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.camera import Camera
from arduino.app_utils import App, Logger
from arduino.app_utils.image import compressed_to_jpeg


logger = Logger("SmartMirror")

SYSTEM_PROMPT, USER_PROMPT_TEMPLATE = prompt.load_prompts()

frame_lock = Lock()
current_frame: bytes | None = None

ui = WebUI()
vlm = VisionLanguageModel(
    system_prompt=SYSTEM_PROMPT,
    temperature=0.4,
    max_tokens=120,
)


def generate_frames():
    while True:
        with frame_lock:
            frame = current_frame

        if frame is None:
            time.sleep(0.1)
            continue

        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        time.sleep(0.05)


def video_stream():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


def scan_look(sid, _data):
    with frame_lock:
        frame = current_frame

    try:
        if frame is None:
            raise RuntimeError("No camera frame available")

        result = vlm.chat(
            message=prompt.build_user_prompt(USER_PROMPT_TEMPLATE),
            images=[frame],
        ).strip()
        if not result:
            result = "I can't scan the look yet. Step into view and try again."
    except Exception as exc:
        logger.exception(f"Smart mirror scan failed: {exc}")
        result = "I can't scan the look right now. Please try again in a moment."

    ui.send_message("analysis_result", result, room=sid)

camera = Camera(fps=30, adjustments=compressed_to_jpeg())


def loop():
    global current_frame

    frame = camera.capture()
    if frame is None:
        return

    frame_bytes = frame.tobytes()
    with frame_lock:
        current_frame = frame_bytes


ui.expose_api("GET", "/stream", video_stream)
ui.on_message("start_scan", scan_look)

with camera:
    App.run(user_loop=loop)
