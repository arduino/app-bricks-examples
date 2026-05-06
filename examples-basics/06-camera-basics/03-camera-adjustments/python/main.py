# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to capture an image from the camera, apply basic transformations, and store it to the local storage.
import numpy as np
from arduino.app_peripherals.camera import Camera # Import the Camera class to interact with the camera peripheral
from arduino.app_utils.image import compress_to_jpeg # Import the compress_to_jpeg function to compress images to JPEG format
from arduino.app_utils.image.adjustments import greyscaled, flipped_h  # Import the greyscaled and flipped_h functions to apply image adjustments

# Instantiate and initialize the camera with resolution 640x480. The first camera 
# found in order of priority (CSI > USB ) will be used. 
# If no camera is found, an exception will be raised.
# The camera is initialized with basic adjustments: greyscaled and flipped horizontally.
# The adjustments are added in a transformation pipeline that is applied directly 
# to the stream video from the camera.
# Multiple adjustments can be combined together using the pipe operator (|) to create a transformation pipeline
# all the available adjustments can be found in the arduino.app_utils.image.adjustments module.
camera = Camera(resolution=(640, 480), adjustments=greyscaled() | flipped_h()) # Initialize the camera with basic adjustments: greyscaled and flipped horizontally
camera.start()                                  # Start the camera to begin capturing images
image: np.ndarray = camera.capture()            # Capture a raw image from the camera
imageJpeg = compress_to_jpeg(image, 100)        # Convert the raw image to JPEG format at highest quality (100)

if imageJpeg is not None:                       # Check if the image was successfully captured and compressed
    imageBytes = imageJpeg.tobytes()            # Get the JPEG image bytes
    with open("captured_image.jpg", "wb") as f: # Open a file in binary write mode to save the captured image
        f.write(imageBytes)                     # Write the JPEG image bytes to the file

camera.stop()                                   # Stop the camera 
