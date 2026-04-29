# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to demonstrate how to stream the camera video feed to the Web UI using
# the WebUI brick and the Camera peripheral.
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI # Import the WebUI class to manage the Web UI server
from arduino.app_peripherals.camera import Camera # Import the Camera class to manage the camera peripheral

camera = Camera(resolution=(640, 480), fps = 15) # Initialize the camera peripheral with a resolution of 640x480 and a frame rate of 15 frames per second
ui = WebUI() # Initialize WebUI, by default it will serve the contet in the "assets" folder of the App
# Expose the camera stream on the "/camera" endpoint of the Web UI, allowing it to be accessed from the UI using an <img> tag with the source set to "/camera"
ui.expose_camera("/camera", camera)
App.run() # Start the application
