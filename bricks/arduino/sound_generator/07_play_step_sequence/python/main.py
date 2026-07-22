# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time
from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App

player = SoundGenerator(wave_form="square", sound_effects=[SoundEffect.adsr()])

# Each step is a list of notes to play simultaneously; empty list = REST
sequence = [
    ["C4"],
    ["E4"],
    ["G4"],
    ["C5", "E5"],
    [],
    ["G4"],
    ["E4"],
    ["C4"],
]


def on_step(current_step, total_steps):
    print(f"Step {current_step + 1}/{total_steps}")


# Start looping playback at 160 BPM with 1/8 note steps
player.play_step_sequence(
    sequence,
    note_duration=1 / 8,
    bpm=160,
    loop=True,
    on_step_callback=on_step,
)

# Let it loop for 10 seconds, then stop
time.sleep(10)
player.stop_sequence()

App.run()
