# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from pathlib import Path

from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App

# Save the generated files in a local folder relative to the app runtime directory.
OUTPUT_DIR = Path("recordings")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
WAV_OUTPUT_FILE = OUTPUT_DIR / "microphone-recording.wav"

# List of microphone configurations available, choose the one uncomment it and comment the others.
microphone = Microphone()
#microphone = Microphone(Microphone.USB_MIC_1) # Use the first USB microphone
#microphone = Microphone(sample_rate=Microphone.RATE_44K, channels=Microphone.CHANNELS_STEREO, shared=False) # Record stereo audio at 44.1 kHz
#microphone = Microphone(sample_rate=Microphone.RATE_16K, channels=Microphone.CHANNELS_MONO, buffer_size=Microphone.BUFFER_SIZE_SAFE, shared=False) # Use a larger buffer for safer recording
#microphone = Microphone("hw:0,0", sample_rate=Microphone.RATE_16K, channels=Microphone.CHANNELS_MONO, shared=False) # Use an explicit ALSA device name

microphone.start()  # Start the microphone before recording.

# Record a fixed-duration WAV buffer with record_wav() that returns the recorded audio data as a NumPy array.
wav_audio = microphone.record_wav(duration=3)
wav_audio_bytes = wav_audio.tobytes()  # Convert the NumPy array to bytes for saving to a file

with open(WAV_OUTPUT_FILE, "wb") as file:
    file.write(wav_audio_bytes)

print(f"WAV file saved in path: {WAV_OUTPUT_FILE}")

microphone.stop()  # Stop the microphone after recording is done.

App.run()
