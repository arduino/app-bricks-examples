# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to capture an avi video of 5 seconds from the camera and it stores it to the local storage.
import numpy as np
from arduino.app_peripherals.camera import Camera # Import the Camera class to interact with the camera peripheral

# Instantiate and initialize the camera with resolution 640x480. The first camera 
# found in order of priority (CSI > USB ) will be used. 
# If no camera is found, an exception will be raised.
# List of camera configurations available, choose the one uncomment it and comment the others.

camera = Camera(resolution=(640, 480), fps=15)
#camera = Camera("csi:0", resolution=(640, 480), fps=30) # CSI camera with positional source identifier
#camera = Camera("usb:0", resolution=(640, 480), fps=15) # USB camera with positional source identifier
#camera = Camera(resolution=(1280, 720), fps=15) # Higher resolution recording
#camera = Camera("rtsp://<RTSP_URL>", username="<USERNAME>", password="<PASSWORD>") # RTSP camera stream

RECORDING_DURATION = 5
#RECORDING_DURATION = 10

camera.start()                                           # Start the camera to begin capturing images
recording: np.ndarray = camera.record_avi(duration=RECORDING_DURATION) # Capture an avi video from the camera

recordingBytes = recording.tobytes()                     # Get the AVI video bytes
with open("captured_video.avi", "wb") as f:              # Open a file in binary write mode to save the captured video
    f.write(recordingBytes)                              # Write the AVI video bytes to the file

camera.stop()                                            # Stop the camera 
