# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time
from arduino.app_bricks.wave_generator import WaveGenerator
from arduino.app_utils import App

wave_gen = WaveGenerator()
App.start_brick(wave_gen)

wave_gen.frequency = 440.0
wave_gen.volume = 80
wave_gen.glide = 0.0
wave_gen.amplitude = 0.0


def envelope_demo():
    """Demonstrate different envelope settings."""
    # Fast attack, fast release (percussive)
    wave_gen.attack = 0.01
    wave_gen.release = 0.01
    wave_gen.amplitude = 0.8
    time.sleep(1)

    wave_gen.amplitude = 0.0
    time.sleep(1)

    # Slow attack, fast release (pad-like)
    wave_gen.attack = 0.3
    wave_gen.release = 0.05
    wave_gen.amplitude = 0.8
    time.sleep(1)

    wave_gen.amplitude = 0.0
    time.sleep(1)

    # Fast attack, slow release (sustained)
    wave_gen.attack = 0.05
    wave_gen.release = 0.3
    wave_gen.amplitude = 0.8
    time.sleep(1)

    wave_gen.amplitude = 0.0
    time.sleep(1)

    # Medium attack and release (balanced)
    wave_gen.attack = 0.05
    wave_gen.release = 0.05
    wave_gen.amplitude = 0.8
    time.sleep(1)

    wave_gen.amplitude = 0.0
    time.sleep(2)


App.run(user_loop=envelope_demo)
