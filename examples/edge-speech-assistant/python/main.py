# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.tts import TextToSpeech
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App

tts = TextToSpeech()
ui = WebUI()


def speak(session_id, data):
    text = data.get("text", "").strip()
    if not text:
        return

    ui.send_message("speaking", {"status": "started"})
    tts.speak(text)
    ui.send_message("speaking", {"status": "finished"})


def stop(session_id, data):
    tts.cancel()
    ui.send_message("speaking", {"status": "finished"})


ui.on_message("speak", speak)
ui.on_message("stop", stop)

App.run()
