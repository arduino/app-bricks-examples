# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.asr import AutomaticSpeechRecognition


asr = AutomaticSpeechRecognition()


def transcribe():
    with asr.transcribe_stream(duration=5) as stream:
        for chunk in stream:
            match chunk.type:
                case "partial_text":
                    print(f"Partial: {chunk.data}")
                case "full_text":
                    print(f"Final: {chunk.data}")
                    break
    raise StopIteration


App.run(user_loop=transcribe)
