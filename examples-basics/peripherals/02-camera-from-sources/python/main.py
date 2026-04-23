# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to capture an image from the different camera sources and it stores it to the local storage.
import numpy as np
from arduino.app_peripherals.camera import Camera # Import the Camera class to interact with the camera peripheral
from arduino.app_utils.image import compress_to_jpeg # Import the compress_to_jpeg function to compress images to JPEG format

# List of camera sources available, choose the one uncomment it and comment the others.

camera = Camera("csi:0", resolution=(640, 480), fps=30) # CSI camera with positional source identifier ('0' for the first CSI camera, '1' for the second, and so on)
#camera = Camera("csi:CAMERA1", resolution=(640, 480), fps=30) # CSI camera with label identifier printed on the sourface of the Arduino Media Carrier
#camera = Camera("usb:0", resolution=(640, 480), fps=30)   # USB camera with positional source identifier ('0' for the first USB camera, '1' for the second, and so on)
#camera = Camera("/dev/video1", resolution=(640, 480), fps=30) # USB camera with full source identifier

#camera = Camera("rtsp://<RTSP_URL>/stream", username="<USERNAME>", password="<PASSWORD>") # RTSP camera, replace with the actual RTSP URL, USERNAME, and PASSWORD of the camera to get the stream
#camera = Camera("http://<IP_ADDRESS>/video.mp4") # HTTP camera, replace with the actual HTTP URL of the camera to get thestream

camera.start()                                  # Start the camera to begin capturing images
image: np.ndarray = camera.capture()            # Capture a raw image from the camera
imageJpeg = compress_to_jpeg(image, 100)        # Convert the raw image to JPEG format at highest quality (100)

if imageJpeg is not None:                       # Check if the image was successfully captured and compressed
    imageBytes = imageJpeg.tobytes()            # Get the JPEG image bytes
    with open("captured_image.jpg", "wb") as f: # Open a file in binary write mode to save the captured image
        f.write(imageBytes)                     # Write the JPEG image bytes to the file

camera.stop()                                   # Stop the camera 
