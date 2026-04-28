# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import re
import threading

from arduino.app_bricks.tts import TextToSpeech
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App

tts = TextToSpeech()
ui = WebUI()

stop_event = threading.Event()

TTS_MAX_BYTES = 1024


def speak(session_id, data):
    text = data.get("text", "")
    if not text:
        return

    stop_event.clear()
    original_text = text.strip()

    # Split at sentence and clause boundaries for fine-grained highlighting
    chunks = re.split(r"(?<=[.!?,;:])\s+", original_text)

    ui.send_message("speaking", {"status": "started"})
    search_from = 0
    for chunk in chunks:
        if stop_event.is_set():
            break
        if not chunk.strip():
            continue
        idx = original_text.find(chunk, search_from)
        if idx != -1:
            ui.send_message(
                "speaking",
                {"status": "progress", "start": idx, "end": idx + len(chunk)},
            )
            search_from = idx + len(chunk)
        # Handle chunks that exceed TTS byte limit
        remaining = chunk
        while remaining:
            if stop_event.is_set():
                break
            if len(remaining.encode("utf-8")) <= TTS_MAX_BYTES:
                tts.speak(remaining)
                break
            window = remaining.encode("utf-8")[:TTS_MAX_BYTES].decode(
                "utf-8", errors="ignore"
            )
            space_idx = window.rfind(" ")
            cut = space_idx if space_idx > 0 else len(window)
            tts.speak(remaining[:cut].strip())
            remaining = remaining[cut:].strip()
    if not stop_event.is_set():
        ui.send_message("speaking", {"status": "finished"})


def stop(session_id, data):
    stop_event.set()
    tts.stop()
    ui.send_message("speaking", {"status": "finished"})


ui.on_message("speak", speak)
ui.on_message("stop", stop)

App.run()
