# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from pathlib import Path  # Used for handling file paths

from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App

# Save the generated files in a local folder relative to the app runtime directory.
OUTPUT_DIR = Path("recordings")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)  # Create the folder if it is missing
WAV_OUTPUT_FILE = OUTPUT_DIR / "microphone-recording.wav"  # Path for the output WAV file
WAV_OUTPUT_FILE_WITH_CONTEXT = OUTPUT_DIR / "microphone-recording-with-context.wav"  # Path for the second file-save variant
WAV_OUTPUT_FILE_WITH_DOUBLE_CONTEXT = OUTPUT_DIR / "microphone-recording-with-double-context.wav"  # Path for the third file-save variant
# === 1. Record audio from the microphone and save it to a WAV file ===
# Create and start the microphone before recording.
microphone = Microphone(shared=False)
microphone.start()

# Record a fixed-duration WAV buffer with record_wav() that returns the recorded audio data as a NumPy array.
wav_audio = microphone.record_wav(duration=3)  # Record for 3 seconds
wav_audio_bytes = wav_audio.tobytes()  # Convert the NumPy array to bytes for saving to a file
WAV_OUTPUT_FILE.write_bytes(wav_audio_bytes)  # Save the recorded bytes to a WAV file

print("WAV file saved:")
print(f"- path: {WAV_OUTPUT_FILE}")
print(f"- file_size: {WAV_OUTPUT_FILE.stat().st_size} bytes")  # Print the size of the saved WAV file in bytes

# === 2. Alternative file-saving method using Python file context manager syntax ===
# The same WAV data can also be saved using Python file context manager syntax.
with open(WAV_OUTPUT_FILE_WITH_CONTEXT, "wb") as file:
    file.write(wav_audio.tobytes())

print("WAV file saved with file context manager:")
print(f"- path: {WAV_OUTPUT_FILE_WITH_CONTEXT}")
print(f"- file_size: {WAV_OUTPUT_FILE_WITH_CONTEXT.stat().st_size} bytes")

# Stop the microphone after the recordings are complete.
microphone.stop()

# === 3. Alternative file-saving method using Microphone context manager syntax and python file context manager syntax ===
# we need to close the microphone before using the context manager syntax because the context manager will automatically
# handle the starting and stopping of the microphone.
# If we try to use the context manager while a non-shared microphone is already started, it may lead to conflicts or errors.
with Microphone(shared=False) as mic:
    mic.start()  # Start the microphone within the context manager
    wav_audio = mic.record_wav(duration=3)  # Record for 3 seconds
    with open(WAV_OUTPUT_FILE_WITH_DOUBLE_CONTEXT, "wb") as file:
        file.write(wav_audio.tobytes())  # Save the recorded bytes to a WAV file

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab
# to start and stop the app.
App.run()
