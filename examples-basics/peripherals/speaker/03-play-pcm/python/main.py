# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to generate audio directly in Python with numpy and stream it to
# a USB speaker as raw PCM data, without using a WAV file.
#
# It shows how to feed the Speaker peripheral with samples produced at runtime,
# which is the typical pattern for tones, beeps, generated voice samples and
# sensor sonification.

import numpy as np

from arduino.app_utils import App
from arduino.app_peripherals.speaker import Speaker

# Audio parameters used both to generate the samples and to configure the speaker.
SAMPLE_RATE = Speaker.RATE_16K   # 16000 Hz
CHANNELS = Speaker.CHANNELS_MONO # 1 channel
FORMAT = np.int16                # 16-bit signed PCM

# A simple C major scale (C4 -> C5). Each note lasts NOTE_DURATION_S seconds.
SCALE_HZ = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
NOTE_DURATION_S = 0.4


def make_tone(freq_hz: float, duration_s: float) -> np.ndarray:
    """Return an int16 numpy array containing a sine wave at the given frequency."""
    n_samples = int(SAMPLE_RATE * duration_s)
    t = np.arange(n_samples, dtype=np.float32) / SAMPLE_RATE
    # 0.3 amplitude keeps the signal well below clipping (max int16 = 32767).
    wave = 0.3 * np.sin(2 * np.pi * freq_hz * t)
    # Convert from [-1, 1] floats to int16 to match the speaker format.
    return (wave * 32767).astype(FORMAT)


def main():
    # Create the speaker: first USB speaker, mono, 16 kHz, 16-bit signed PCM.
    speaker = Speaker(sample_rate=SAMPLE_RATE, channels=CHANNELS, format=FORMAT)

    print("Playing a C major scale generated as raw PCM...")

    # Use the speaker as a context manager to handle start()/stop() automatically.
    with speaker:
        for freq in SCALE_HZ:
            samples = make_tone(freq, NOTE_DURATION_S)
            # play_pcm() splits the array in buffer_size chunks and writes them
            # one by one to the speaker, blocking until ALSA accepts the data.
            speaker.play_pcm(samples)

    print("Playback finished")


main()
App.run()
