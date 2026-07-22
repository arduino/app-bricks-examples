# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time
from arduino.app_bricks.wave_generator import WaveGenerator
from arduino.app_utils import App

wave_gen = WaveGenerator()
wave_gen.frequency = 440.0
wave_gen.amplitude = 0.6


def cycle_waveforms():
    """Cycle through different waveform types."""
    for wave_type in ["sine", "square", "sawtooth", "triangle"]:
        wave_gen.wave_type = wave_type
        time.sleep(3)

    wave_gen.amplitude = 0.0  # Silence
    time.sleep(2)


App.run(user_loop=cycle_waveforms)
