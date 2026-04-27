# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App

# In this example, we demonstrate how to use the Microphone peripheral to stream audio data in real-time.
# The Microphone peripheral provides a `stream()` method that yields audio chunks as they are captured from the mic.
# We print a summary of each received audio chunk, and we stop the stream after receiving a certain number of chunks
# for demonstration purposes.
STREAM_CHUNK_LIMIT = 5


# This helper function prints a summary of the received audio chunk
def print_chunk_summary(chunk_index: int, audio_chunk):
    print(f"Chunk {chunk_index}:")
    print(f"- samples: {len(audio_chunk)}")
    print(f"- dtype: {audio_chunk.dtype.name}")
    print(f"- min: {audio_chunk.min()}")
    print(f"- max: {audio_chunk.max()}")


microphone = Microphone(shared=False)

microphone.start()

# We use a simple loop to read audio chunks from the microphone stream.
# In a real application, you would likely process the audio data in some way.
# For this example, we just print out a summary of each chunk and stop after a few chunks to keep it concise.
received_chunks = 0
for audio_chunk in microphone.stream():
    received_chunks += 1
    print_chunk_summary(received_chunks, audio_chunk)

    # Stop after a small number of chunks so the example stays short and readable.
    if received_chunks >= STREAM_CHUNK_LIMIT:
        microphone.stop()

print(f"Stream ended after {received_chunks} chunks.")

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab
# to start and stop the app.
App.run()
