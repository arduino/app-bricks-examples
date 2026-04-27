# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App


# This function is a helper to print the main properties of a microphone instance in the Python console.
def print_microphone_properties(microphone: Microphone):
    print(f"- resolved_device: {microphone.device_stable_ref}")
    print(f"- name: {microphone.name}")
    print(f"- sample_rate: {microphone.sample_rate} Hz")
    print(f"- channels: {microphone.channels}")
    print(f"- format: {microphone.format.name}")
    print(f"- buffer_size: {microphone.buffer_size} frames")
    print(f"- volume: {microphone.volume}%")
    print(f"- is_started: {microphone.is_started()}")
    print(f"- shared: {microphone.shared}")

# 1. === The simplest case to create a Microhone instance with default settings =======================================

# The default configuration uses the default system microphone and automatically resolves the best
# settings for sample rate, channels, format, and buffer size. This is the recommended way to use
# the Microphone class in most cases, as it provides a good balance between simplicity and performance.

default_microphone = Microphone()  # Create a microphone instance
default_microphone.start()  # Start the microphone
print_microphone_properties(default_microphone)  # Print the main properties in the Python console using the helper function.
default_microphone.stop()  # Stop the microphone when done to free system resources.
print(f"- is_started_after_stop: {default_microphone.is_started()}")  # Verify that the microphone is stopped, as expected.


# 2. === Create a Microphone instance with custom settings ============================================================

# Users can also create a Microphone instance with custom settings by specifying the desired properties
# in the constructor. This allows for more control over the microphone configuration,
# such as selecting a specific device, sample rate, audio format, and buffer size.
# Shared mode is True by default, which allows the microphone to be shared with other Apps or Bricks, even different threads.
# Setting it to False will make the microphone exclusive to this instance and allows for lower latency,
# but it may cause conflicts if other Apps or Bricks are trying to use the microphone at the same time.

MIC_DEVICE = Microphone.USB_MIC_1  # Use the first USB microphone.
MIC_SAMPLE_RATE = Microphone.RATE_44K  # Use 44.1 kHz, a common choice for high-quality audio.
MIC_CHANNELS = Microphone.CHANNELS_MONO  # Use a single audio channel.
MIC_FORMAT = "float32"  # Use 32-bit floating point audio samples.
MIC_BUFFER_SIZE = Microphone.BUFFER_SIZE_BALANCED  # Use a balanced buffer size.
MIC_SHARED = False  # Use the microphone in exclusive mode

# Create a second microphone instance using explicit settings.
custom_microphone = Microphone(
    device=MIC_DEVICE,
    sample_rate=MIC_SAMPLE_RATE,
    channels=MIC_CHANNELS,
    format=MIC_FORMAT,
    buffer_size=MIC_BUFFER_SIZE,
    shared=MIC_SHARED
)

# Volume is a writable property, so it can be set any time after construction.
# We set the software volume to 80%.
custom_microphone.volume = 80

custom_microphone.start()
print_microphone_properties(custom_microphone)  # Print the properties as before to compare them
custom_microphone.stop()
print(f"- is_started_after_stop: {custom_microphone.is_started()}")  # Verify that the microphone is stopped, as expected.


# 3. == Access the microphone with context manager syntax =============================================================

# We can also use the Microphone class with context manager syntax, which automatically starts the microphone 
# when entering the block and stops it when exiting the block, even if an error occurs.
# This is a convenient way to ensure that the microphone is properly released after use.

with Microphone() as mic:
    print_microphone_properties(mic)

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab
# to start and stop the app.
App.run()
