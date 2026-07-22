# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.wave_generator import WaveGenerator
from arduino.app_utils import App

# Create wave generator with default settings
wave_gen = WaveGenerator()

# Set initial frequency and amplitude
wave_gen.frequency = 440.0  # A4 note (440 Hz)
wave_gen.amplitude = 0.7  # 70% amplitude
wave_gen.volume = 80  # 80% volume

App.run()
