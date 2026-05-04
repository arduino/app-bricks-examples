# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to play a WAV file through a USB speaker connected to the Arduino UNO Q.
# It opens "assets/audio/sample.wav", reads the PCM frames and pushes them to the
# Speaker peripheral, which forwards them to the ALSA audio subsystem.

import os
import time
import wave

from arduino.app_utils import App
from arduino.app_peripherals.speaker import Speaker

# Path to the WAV file shipped with the example
WAV_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "sample.wav")


def play_wav():
    # Open the WAV file in read-binary mode and inspect its parameters
    with wave.open(WAV_PATH, "rb") as wav:
        sample_rate = wav.getframerate()      # samples per second (e.g. 16000)
        channels = wav.getnchannels()         # 1 = mono, 2 = stereo
        sample_width = wav.getsampwidth()     # bytes per sample (2 = 16 bit)
        frames = wav.readframes(wav.getnframes())  # raw PCM bytes for the whole file

    # Speaker only supports a fixed format per instance, so we configure it
    # to match the WAV file. "S16_LE" means signed 16-bit, little-endian.
    if sample_width != 2:
        raise RuntimeError("This example expects a 16-bit PCM WAV file.")

    # Create the Speaker. Auto-selects the first USB speaker (USB_SPEAKER_1).
    speaker = Speaker(sample_rate=sample_rate, channels=channels, format="S16_LE")

    speaker.start()             # open the ALSA device and start the playback thread
    speaker.play(frames)        # enqueue all the PCM bytes; play() returns immediately
    time.sleep(len(frames) / (sample_rate * channels * sample_width) + 0.5)  # wait for playback
    speaker.stop()              # release the ALSA device

    print("Playback finished")


# Run the playback once and then keep the App alive so App Lab can manage the lifecycle.
play_wav()
App.run()
