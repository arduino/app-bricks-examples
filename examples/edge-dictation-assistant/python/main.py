# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.asr import AutomaticSpeechRecognition
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App


asr = AutomaticSpeechRecognition()
ui = WebUI()


def start_dictation(session_id, data):
    with asr.transcribe_stream() as stream:
        for chunk in stream:
            ui.send_message("transcription", {"type": chunk.type, "text": chunk.data})


def stop_dictation(session_id, data):
    asr.cancel()

def new_recording(session_id, data):
    stop_dictation(session_id, data)

ui.on_message("start_dictation", start_dictation)
ui.on_message("stop_dictation", stop_dictation)
ui.on_message("new_recording", new_recording)

App.run()
