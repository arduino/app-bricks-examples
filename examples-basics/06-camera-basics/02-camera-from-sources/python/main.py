# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to capture an image from the different camera sources and it stores it to the local storage.
import numpy as np
from arduino.app_peripherals.camera import Camera
from arduino.app_utils.image import compress_to_jpeg

# List of camera sources available, choose the one uncomment it and comment the others.

camera = Camera("csi:0", resolution=(640, 480), fps=30) # CSI camera with positional source identifier ('0' for the first CSI camera, '1' for the second, and so on)
#camera = Camera("csi:CAMERA1", resolution=(640, 480), fps=30) # CSI camera with label identifier printed on the sourface of the Arduino Media Carrier
#camera = Camera("usb:0", resolution=(640, 480), fps=30)   # USB camera with positional source identifier ('0' for the first USB camera, '1' for the second, and so on)
#camera = Camera("/dev/video1", resolution=(640, 480), fps=30) # USB camera with full source identifier

#camera = Camera("rtsp://<RTSP_URL>", username="<USERNAME>", password="<PASSWORD>")  # RTSP camera, replace with the actual RTSP URL (e.g. rtsp://192.168.1.100:554/stream), USERNAME, and PASSWORD of the camera to get the stream
#camera = Camera("http://<IP_ADDRESS>/video.mp4")  # HTTP camera, replace with the actual HTTP URL of the camera to get thestream

camera.start()
image: np.ndarray = camera.capture()
imageJpeg = compress_to_jpeg(frame=image, quality=100)

if imageJpeg is not None:
    imageBytes = imageJpeg.tobytes()
    with open("captured_image.jpg", "wb") as f:
        f.write(imageBytes)

camera.stop()
