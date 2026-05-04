# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to play a WAV file through a USB speaker connected to the Arduino UNO Q.
# It uses Speaker.play_wav(), the simplest entry point: it auto-detects sample rate,
# channels and sample format from the WAV header, opens the first USB speaker, plays
# the audio and closes the device automatically.

import os
import numpy as np
import time

from arduino.app_peripherals.speaker import Speaker

# Path to the WAV file shipped with the example
WAV_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "sample.wav")


def play_wav():
    # Load the WAV file as raw bytes wrapped in a numpy array.
    # Speaker.play_wav() expects the whole file (header + PCM) as a uint8 array.
    wav_audio = np.fromfile(WAV_PATH, dtype=np.uint8)

    # One-shot playback on the first USB speaker available.
    # The static helper takes care of opening, writing and closing the ALSA device.
    Speaker.play_wav(wav_audio)


while True:
    play_wav()
    time.sleep(0.1)
