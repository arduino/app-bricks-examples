# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.tts import TextToSpeech

tts = TextToSpeech()

with tts.synthesize_pcm_stream("Hello, Arduino world!") as stream, open("synthesized_speech.pcm", "wb") as f:
    for chunk in stream:
        f.write(chunk)

App.run()
