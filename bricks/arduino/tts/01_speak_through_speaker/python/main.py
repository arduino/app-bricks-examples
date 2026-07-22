# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.tts import TextToSpeech
from arduino.app_utils import App


tts = TextToSpeech()


def runner():
    tts.speak("Hello world, Arduino!")
    raise StopIteration  # This ends the user loop


App.run(user_loop=runner)
