# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App

player = SoundGenerator(bpm=120, sound_effects=[SoundEffect.adsr()])

# Two tracks played simultaneously: melody + bass line
melody = [
    ("E5", 1 / 4),
    ("D5", 1 / 4),
    ("C5", 1 / 4),
    ("D5", 1 / 4),
    ("E5", 1 / 4),
    ("E5", 1 / 4),
    ("E5", 1 / 2),
]

bass = [
    ("C3", 1 / 2),
    ("G3", 1 / 2),
    ("C3", 1 / 2),
    ("G3", 1 / 2),
]

player.play_polyphonic([melody, bass], block=True)

App.run()
