# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.asr import AutomaticSpeechRecognition

asr = AutomaticSpeechRecognition()

print("Please start speaking for transcription...")


def transcribe():
    text = asr.transcribe(duration=5)
    print(f"Transcription: {text}")


App.run(user_loop=transcribe)
