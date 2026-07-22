# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App

player = SoundGenerator(sound_effects=[SoundEffect.adsr()])

fur_elise = [
    ("E5", 1 / 8),
    ("D#5", 1 / 8),
    ("E5", 1 / 8),
    ("D#5", 1 / 8),
    ("E5", 1 / 8),
    ("B4", 1 / 8),
    ("D5", 1 / 8),
    ("C5", 1 / 8),
    ("A4", 1 / 4),
    ("C4", 1 / 8),
    ("E4", 1 / 8),
    ("A4", 1 / 8),
    ("B4", 1 / 8),
    ("E4", 1 / 8),
    ("G#4", 1 / 8),
    ("B4", 1 / 8),
    ("C5", 1 / 8),
    ("E4", 1 / 8),
    ("E5", 1 / 8),
    ("D#5", 1 / 8),
    ("E5", 1 / 8),
    ("D#5", 1 / 8),
    ("E5", 1 / 8),
    ("B4", 1 / 8),
    ("D5", 1 / 8),
    ("C5", 1 / 8),
    ("A4", 1 / 4),
    ("C4", 1 / 8),
    ("E4", 1 / 8),
    ("A4", 1 / 8),
    ("B4", 1 / 4),
    ("E4", 1 / 8),
    ("C5", 1 / 8),
    ("B4", 1 / 8),
    ("A4", 1),
]


def user_lp():
    for note, duration in fur_elise:
        player.play(note, duration)


App.run(user_loop=user_lp)
