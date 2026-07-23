# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

import numpy as np

from arduino.app_bricks.wave_generator import WaveGenerator
from arduino.app_peripherals.speaker import Speaker
from arduino.app_utils import App

# Create a Speaker with specific parameters
speaker = Speaker(
    device=Speaker.USB_SPEAKER_1,
    sample_rate=Speaker.RATE_48K,
    channels=Speaker.CHANNELS_MONO,
    format=np.float32,
    buffer_size=Speaker.BUFFER_SIZE_REALTIME,
    shared=False,  # Exclusive access for low latency
)

# Create WaveGenerator with the custom speaker
wave_gen = WaveGenerator(speaker)


def play_sequence():
    """Play a simple frequency sequence (C4 to C5)."""
    frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
    for freq in frequencies:
        wave_gen.frequency = freq
        wave_gen.amplitude = 0.7
        time.sleep(0.5)

    wave_gen.amplitude = 0.0  # Fade out
    time.sleep(2)


App.run(user_loop=play_sequence)
