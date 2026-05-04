# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to play a WAV file through a specific USB speaker, after
# inspecting the available devices and adjusting the volume.
#
# It demonstrates three Speaker features that are useful in real applications:
#  1. listing the USB speakers connected to the board
#  2. picking a specific device (USB_SPEAKER_1, USB_SPEAKER_2, ...)
#  3. setting the playback volume via the `Speaker.volume` property.

import os
import numpy as np

from arduino.app_utils import App
from arduino.app_peripherals.speaker import Speaker, ALSASpeaker

WAV_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "sample.wav")

# Target software volume in percent (0 - 100). Tweak to taste.
TARGET_VOLUME = 60


def main():
    # 1) Discover available USB speakers. Useful when more than one is connected.
    #    `list_usb_devices` is exposed on the concrete ALSASpeaker class
    #    (`Speaker` itself is only a factory that returns an ALSASpeaker instance).
    available = ALSASpeaker.list_usb_devices()
    print(f"Available USB speakers: {available}")
    if not available:
        raise RuntimeError("No USB speaker detected. Plug one into the Arduino UNO Q.")

    # 2) Load the WAV file as raw bytes wrapped in a numpy array
    #    (header + PCM, as expected by speaker.play_wav()).
    wav_audio = np.fromfile(WAV_PATH, dtype=np.uint8)

    # 3) Create a Speaker bound to the first USB speaker. The Speaker class exposes
    #    USB_SPEAKER_1 / USB_SPEAKER_2 macros to select by enumeration order without
    #    hard-coding the underlying ALSA device string.
    #    Format must be a numpy dtype: np.int16 corresponds to 16-bit signed PCM,
    #    which is the format used by the WAV file shipped with this example.
    speaker = Speaker(
        device=Speaker.USB_SPEAKER_1,
        sample_rate=Speaker.RATE_16K,
        channels=Speaker.CHANNELS_MONO,
        format=np.int16,
    )

    # 4) Set the volume BEFORE playing. The `volume` property accepts 0-100.
    print(f"Current volume: {speaker.volume}%")
    speaker.volume = TARGET_VOLUME
    print(f"Volume set to {speaker.volume}%")

    # 5) Play the WAV file using the speaker as a context manager
    #    so start() / stop() are called automatically.
    with speaker:
        speaker.play_wav(wav_audio)

    print("Playback finished")


main()
App.run()
