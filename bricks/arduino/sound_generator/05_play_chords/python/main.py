# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App

player = SoundGenerator(sound_effects=[SoundEffect.adsr()])

# C major chord progression: C -> F -> G -> C
player.play_chord(["C4", "E4", "G4"], note_duration=1 / 2, block=True)  # C major
player.play_chord(["F4", "A4", "C5"], note_duration=1 / 2, block=True)  # F major
player.play_chord(["G4", "B4", "D5"], note_duration=1 / 2, block=True)  # G major
player.play_chord(["C4", "E4", "G4"], note_duration=1, block=True)  # C major

App.run()
