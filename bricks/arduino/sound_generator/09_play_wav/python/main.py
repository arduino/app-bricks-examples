# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.sound_generator import SoundGenerator
from arduino.app_utils import App

player = SoundGenerator()

# Provide the path to a WAV file in the app directory (e.g., "assets/sample.wav")
player.play_wav("assets/sample.wav", block=True)

App.run()
