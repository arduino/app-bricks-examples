# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to demonstrate how to send messages from Python to the Web UI using the WebUI brick,
# and update the UI with dynamic content.
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI # Import the WebUI class to manage the Web UI server
import time

ui = WebUI() # Initialize WebUI, by default it will serve the contet in the "assets" folder of the App

connected = False
counter = 0

def loop():
    global counter, connected
    if connected:
        # Send a message to the Web UI with the current counter value every 10 seconds,
        # using the 'message' event to update the UI with dynamic content
        ui.send_message("message", {"content": f"Hello from Python! Counter: {counter}"})
        counter += 1
        time.sleep(10) # Wait for 10 seconds before sending the next message

# Define a callback function to be called when a new client connects to the WebUI brick.
# This function will set the "connected" variable to True, allowing the loop function
# to start sending messages to the UI.
def on_connect(connection):
    global connected
    connected = True

# Define a callback function to be called when a client disconnects from the WebUI brick.
# This function will set the "connected" variable to False, stopping the loop function
# from sending messages to the UI until a new client connects.
def on_disconnect(connection):
    global connected
    connected = False

ui.on_connect(on_connect) # Register the on_connect function to be called when a new client connects to the WebUI brick
ui.on_disconnect(on_disconnect) # Register the on_disconnect function to be called when a client disconnects from the WebUI brick

App.run(user_loop=loop) # Start the application
