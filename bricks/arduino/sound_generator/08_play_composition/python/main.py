# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect, MusicComposition
from arduino.app_utils import App

# Define a composition as a data structure
comp = MusicComposition(
    composition=[
        [("C4", 1 / 16), ("E4", 1 / 16)],
        [("G4", 1 / 16)],
        [("A4", 1 / 16), ("C5", 1 / 16)],
        [],
        [("G4", 1 / 16)],
        [("F4", 1 / 16)],
        [("E4", 1 / 16), ("G4", 1 / 16)],
        [],
        [("D4", 1 / 16)],
        [("C4", 1 / 16)],
        [],
        [],
    ],
    bpm=140,
    waveform="square",
    volume=0.8,
    effects=[SoundEffect.adsr(), SoundEffect.tremolo(depth=0.4, rate=4.0)],
)

player = SoundGenerator()

# Choose how to play the composition:
# - "once": play it once and wait automatically until it finishes
# - "timed_loop": loop it for a fixed duration and wait automatically
# - "loop": loop forever until the app is stopped
PLAY_MODE = "timed_loop"
LOOP_DURATION_SECONDS = 10.0

if PLAY_MODE == "once":
    player.play_composition(comp)
elif PLAY_MODE == "timed_loop":
    player.play_composition(comp, loop=True, play_for=LOOP_DURATION_SECONDS)
elif PLAY_MODE == "loop":
    player.play_composition(comp, loop=True)
else:
    raise ValueError(f"Unsupported PLAY_MODE: {PLAY_MODE}")

App.run()
