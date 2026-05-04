# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to play a WAV file through a specific USB speaker, after
# inspecting the volume and adjusting it.
#
# It demonstrates three Speaker features that are useful in real applications:
#  1. listing the USB speakers connected to the board
#  2. picking a specific device (USB_SPEAKER_1, USB_SPEAKER_2, ...)
#  3. reading and setting the playback volume via the ALSA mixer.

import os
import time
import wave

from arduino.app_utils import App
from arduino.app_peripherals.speaker import Speaker

WAV_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "sample.wav")

# Target volume in percent (0-100). Tweak to taste.
TARGET_VOLUME = 60


def main():
    # 1) Discover available USB speakers. Useful when more than one is connected.
    available = Speaker.list_usb_devices()
    print(f"Available USB speakers: {available}")
    if not available:
        raise RuntimeError("No USB speaker detected. Plug one into the Arduino UNO Q.")

    # 2) Open the WAV file to read its parameters and PCM frames.
    with wave.open(WAV_PATH, "rb") as wav:
        sample_rate = wav.getframerate()
        channels = wav.getnchannels()
        frames = wav.readframes(wav.getnframes())

    # 3) Create a Speaker bound to the first USB speaker. The Speaker class
    #    exposes USB_SPEAKER_1 / USB_SPEAKER_2 macros to select by enumeration
    #    order without hard-coding the ALSA device string.
    speaker = Speaker(
        device=Speaker.USB_SPEAKER_1,
        sample_rate=sample_rate,
        channels=channels,
        format="S16_LE",
    )

    # 4) Read the current volume (returns -1 if the device has no mixer).
    current_volume = speaker.get_volume()
    print(f"Current volume: {current_volume}%")

    # 5) Adjust the volume to a known level before playing.
    speaker.set_volume(TARGET_VOLUME)
    print(f"Volume set to {TARGET_VOLUME}%")

    # 6) Play the WAV file.
    speaker.start()
    speaker.play(frames)
    time.sleep(len(frames) / (sample_rate * channels * 2) + 0.5)  # 2 bytes per sample (S16_LE)
    speaker.stop()

    print("Playback finished")


main()
App.run()
