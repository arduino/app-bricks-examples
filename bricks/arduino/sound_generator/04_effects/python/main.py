# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App

player = SoundGenerator()

tune_sequence = [
    ("A4", 0.25),
    ("C5", 0.25),
    ("E5", 0.25),
    ("C5", 0.25),
    ("A4", 0.25),
    ("C5", 0.25),
    ("E5", 0.25),
    ("REST", 0.25),
    ("G4", 0.25),
    ("B4", 0.25),
    ("D5", 0.25),
    ("B4", 0.25),
    ("G4", 0.25),
    ("B4", 0.25),
    ("D5", 0.25),
    ("REST", 0.25),
    ("A4", 0.25),
    ("A4", 0.25),
    ("C5", 0.25),
    ("E5", 0.25),
    ("F5", 0.5),
    ("E5", 0.25),
    ("REST", 0.25),
    ("D5", 0.25),
    ("C5", 0.25),
    ("B4", 0.25),
    ("A4", 0.25),
    ("G4", 0.5),
    ("B4", 0.5),
    ("REST", 1),
]

# Play as a retro-game sound
player.set_wave_form("square")
player.set_effects([SoundEffect.adsr()])  # For a more synththetic sound, add SoundEffect.bitcrusher() effect
for note, duration in tune_sequence:
    player.play_tone(note, duration)

# Play with distortion
player.set_wave_form("sine")
player.set_effects([SoundEffect.adsr(), SoundEffect.chorus(), SoundEffect.overdrive(drive=200.0)])
for note, duration in tune_sequence:
    player.play_tone(note, duration)

# Vibrato effect
player.set_effects([SoundEffect.adsr(), SoundEffect.vibrato()])
for note, duration in tune_sequence:
    player.play_tone(note, duration)

# Tremolo effect
player.set_wave_form("triangle")
player.set_effects([SoundEffect.adsr(), SoundEffect.tremolo(), SoundEffect.chorus()])
for note, duration in tune_sequence:
    player.play_tone(note, duration)

App.run()
