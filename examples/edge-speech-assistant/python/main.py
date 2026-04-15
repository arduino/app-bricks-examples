# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import re
import threading

from arduino.app_bricks.tts import TextToSpeech
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.speaker import Speaker
from arduino.app_utils import App

speaker = Speaker(sample_rate=Speaker.RATE_44K)
speaker.start()

tts = TextToSpeech()
ui = WebUI()

stop_event = threading.Event()


def speak(session_id, data):
    text = data.get("text", "")
    language = data.get("language", "en")
    if not text:
        return

    stop_event.clear()
    chunks = re.split(r"(?<=[.!?])\s+|\n+", text.strip())

    ui.send_message("speaking", {"status": "started"})
    for chunk in chunks:
        if stop_event.is_set():
            break
        if chunk.strip():
            tts.speak(chunk, language=language, speaker=speaker)
    ui.send_message("speaking", {"status": "finished"})


def stop(session_id, data):
    stop_event.set()


ui.on_message("speak", speak)
ui.on_message("stop", stop)

App.run()
