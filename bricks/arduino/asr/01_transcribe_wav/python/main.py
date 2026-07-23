# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.asr import WAVAutomaticSpeechRecognition


with open("assets/recording_01.wav", "rb") as wav_file:
    audio_bytes = wav_file.read()
    asr = WAVAutomaticSpeechRecognition(audio_bytes)
    App.start_brick(asr)
    text = asr.transcribe()
    print(f"Transcription: {text}")

App.run()
