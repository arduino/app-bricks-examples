# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.asr import WAVAutomaticSpeechRecognition


with open("assets/recording_01.wav", "rb") as wav_file:
    asr = WAVAutomaticSpeechRecognition(wav_file.read())
    App.start_brick(asr)
    with asr.transcribe_stream() as stream:
        for chunk in stream:
            match chunk.type:
                case "partial_text":
                    print(f"Partial: {chunk.data}")
                case "full_text":
                    print(f"Final: {chunk.data}")
                    break

App.run()
