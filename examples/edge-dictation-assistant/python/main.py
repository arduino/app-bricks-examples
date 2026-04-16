# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.asr import AutomaticSpeechRecognition
from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App


mic = Microphone()
mic.start()

asr = AutomaticSpeechRecognition()
ui = WebUI()

stream = None


def start_dictation(session_id, data):
    global stream
    stream = asr.transcribe_mic_stream(mic)
    for chunk in stream:
        ui.send_message("transcription", {"type": chunk.type, "text": chunk.data})
    stream = None


def stop_dictation(session_id, data):
    global stream
    if stream:
        stream.close()
        stream = None


def new_recording(session_id, data):
    stop_dictation(session_id, data)
    ui.send_message("recording_reset", {})


ui.on_message("start_dictation", start_dictation)
ui.on_message("stop_dictation", stop_dictation)
ui.on_message("new_recording", new_recording)

App.run()
