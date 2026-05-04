# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to generate a sine wave directly in Python and stream it to a USB
# speaker as raw PCM data.
#
# It shows how to feed the Speaker peripheral with arbitrary samples produced
# at runtime, instead of reading them from a WAV file.

import time
import numpy as np

from arduino.app_utils import App
from arduino.app_peripherals.speaker import Speaker

# Audio parameters used both to generate the samples and to configure the speaker.
SAMPLE_RATE = 16000   # Hz
CHANNELS = 1          # mono
FORMAT = "S16_LE"     # signed 16-bit little-endian, matches np.int16

# A small musical scale (C4 -> C5) — each note is 0.4 s long.
SCALE_HZ = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
NOTE_DURATION_S = 0.4


def make_tone(freq_hz: float, duration_s: float) -> np.ndarray:
    """Return an int16 numpy array containing a sine wave of the given frequency."""
    n_samples = int(SAMPLE_RATE * duration_s)
    t = np.arange(n_samples, dtype=np.float32) / SAMPLE_RATE
    # 0.3 amplitude keeps the signal well below clipping (max int16 = 32767)
    wave = 0.3 * np.sin(2 * np.pi * freq_hz * t)
    # Convert from [-1, 1] floats to signed 16-bit integers (the S16_LE format)
    return (wave * 32767).astype(np.int16)


def main():
    speaker = Speaker(sample_rate=SAMPLE_RATE, channels=CHANNELS, format=FORMAT)
    speaker.start()

    print("Playing a C major scale generated as raw PCM...")
    for freq in SCALE_HZ:
        samples = make_tone(freq, NOTE_DURATION_S)
        # Speaker.play() accepts both bytes and numpy arrays. With a numpy array
        # the conversion to the configured format is done internally.
        speaker.play(samples)

    # Wait for the queue to drain before closing the device.
    time.sleep(NOTE_DURATION_S * len(SCALE_HZ) + 0.5)
    speaker.stop()
    print("Playback finished")


main()
App.run()
