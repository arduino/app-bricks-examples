# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App

# In this example, we first capture one chunk explicitly with capture(),
# then we switch to stream() to receive chunks continuously, stopping after a few iterations.
STREAM_CHUNK_LIMIT = 5


# This helper function prints a summary of the received audio chunk.
def print_chunk_summary(chunk_name: str, audio_chunk):
    print(f"{chunk_name}:")
    print(f"- samples: {len(audio_chunk)}")
    print(f"- dtype: {audio_chunk.dtype.name}")
    print(f"- min: {audio_chunk.min()}")
    print(f"- max: {audio_chunk.max()}")

# List of microphone configurations available, choose the one uncomment it and comment the others.
microphone = Microphone()
#microphone = Microphone(Microphone.USB_MIC_1) # Use the first USB microphone
#microphone = Microphone(sample_rate=Microphone.RATE_48K, channels=Microphone.CHANNELS_MONO, buffer_size=Microphone.BUFFER_SIZE_REALTIME, shared=False) # Low-latency high quality mono stream
#microphone = Microphone(sample_rate=Microphone.RATE_16K, channels=Microphone.CHANNELS_MONO, buffer_size=Microphone.BUFFER_SIZE_SAFE, shared=False) # Safer stream with a larger buffer
#microphone = Microphone("hw:0,0", sample_rate=Microphone.RATE_16K, channels=Microphone.CHANNELS_MONO, shared=False) # Use an explicit ALSA device name

# Start the microphone before capturing or streaming.
microphone.start()

# capture() reads a single chunk from the microphone and returns it as a NumPy array.
# If no audio is available yet, capture() can return None.
captured_chunk = microphone.capture()

if captured_chunk is not None:
    print_chunk_summary("Single chunk captured with capture()", captured_chunk)
else:
    print("No audio chunk was available from capture().")

# stream() keeps reading chunks from the microphone until the microphone is stopped.
# For this example, we print a summary of each streamed chunk and stop after a few iterations.
received_chunks = 0
for audio_chunk in microphone.stream():
    received_chunks += 1
    print_chunk_summary(f"Stream chunk {received_chunks}", audio_chunk)

    # Stop after a small number of chunks so the example stays short and readable.
    if received_chunks >= STREAM_CHUNK_LIMIT:
        microphone.stop()

print(f"Stream ended after {received_chunks} chunks.")

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab
# to start and stop the app.
App.run()
