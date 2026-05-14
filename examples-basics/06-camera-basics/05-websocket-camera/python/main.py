# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to capture an image from a WebSocket camera and store it to the local storage.
from arduino.app_peripherals.camera import WebSocketCamera # Import the WebSocketCamera class to receive frames from a remote client
from arduino.app_utils.image import compress_to_jpeg # Import the compress_to_jpeg function to compress images to JPEG format

# Instantiate and initialize a WebSocket camera server on port 8080.
# A client can stream raw JPEG, PNG, WebP, BMP, or TIFF frames to ws://<board-ip>:8080?raw=true.
# List of WebSocket camera configurations available, choose the one uncomment it and comment the others.

camera = WebSocketCamera(port=8080, resolution=(640, 480), fps=15)
#camera = WebSocketCamera(port=8080, resolution=(1280, 720), fps=15) # Higher resolution WebSocket camera
#camera = WebSocketCamera(port=8080, resolution=(640, 480), fps=30) # Higher frame rate WebSocket camera
#camera = WebSocketCamera(port=8080, resolution=(640, 480), fps=15, secret="123456") # Authenticated WebSocket camera
#camera = WebSocketCamera(port=8080, resolution=(640, 480), fps=15, secret="123456", encrypt=True) # Authenticated and encrypted WebSocket camera

camera.start()                                  # Start the WebSocket server and wait for incoming frames

image = None
while image is None:                            # Keep waiting until a client sends the first valid frame
    image = camera.capture()

imageJpeg = compress_to_jpeg(image, 100)        # Convert the raw image to JPEG format at highest quality (100)

if imageJpeg is not None:                       # Check if the image was successfully captured and compressed
    imageBytes = imageJpeg.tobytes()            # Get the JPEG image bytes
    with open("captured_websocket_image.jpg", "wb") as f:
        f.write(imageBytes)                     # Write the JPEG image bytes to the file

camera.stop()                                   # Stop the WebSocket camera server
