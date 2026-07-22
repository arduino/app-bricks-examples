# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.tts import TextToSpeech

tts = TextToSpeech()

wav = tts.synthesize_wav("Hello, Arduino world!")
with open("synthesized_speech.wav", "wb") as f:
    f.write(wav)

App.run()
