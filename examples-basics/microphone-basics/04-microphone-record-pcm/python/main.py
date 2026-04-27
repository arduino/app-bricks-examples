# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import numpy as np

from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App

# PCM recording settings used by this example.
PCM_DURATION_SECONDS = 3.0


def print_pcm_summary(audio: np.ndarray, sample_rate: int, channels: int):
    # Print a short summary of the raw PCM data returned by record_pcm().
    expected_samples = int(PCM_DURATION_SECONDS * sample_rate * channels)

    print("PCM recording summary:")
    print(f"- samples: {len(audio)}")
    print(f"- expected_samples: {expected_samples}")
    print(f"- dtype: {audio.dtype.name}")
    print(f"- duration_seconds: {len(audio) / (sample_rate * channels):.2f}")
    print(f"- min: {audio.min()}")
    print(f"- max: {audio.max()}")
    print(f"- first_10_samples: {audio[:10].tolist()}")


microphone = Microphone(shared=False)

microphone.start()
pcm_audio = microphone.record_pcm(PCM_DURATION_SECONDS)
print_pcm_summary(pcm_audio, microphone.sample_rate, microphone.channels)
microphone.stop()

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab
# to start and stop the app.
App.run()
