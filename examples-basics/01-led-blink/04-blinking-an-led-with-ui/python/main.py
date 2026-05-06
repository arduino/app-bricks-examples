# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to blink the built-in LED on the board by calling a function defined in the sketch from Python, 
# and providing a simple Web UI to control it.
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI # Import the WebUI class to manage the Web UI server

led_is_on = False # Define a global variable to keep track of the LED state and set it to off (False)

def get_led_status():
    """Get current LED status for API."""
    return {
        "led_is_on": led_is_on,
        "status_text": "LED IS ON" if led_is_on else "LED IS OFF"
    }

# Callback function to toggle the LED state when receiving the socket message 'toggle_led' from the Web UI
def toggle_led_state(client, data):
    """Toggle the LED state when receiving socket message."""
    global led_is_on
    led_is_on = not led_is_on

    # Call a function in the sketch, using the Bridge helper library, to control the state of the LED connected to the microcontroller.
    # This performs a RPC call and allows the Python code and the Sketch code to communicate.
    Bridge.call("set_led_state", led_is_on)

    ui.send_message('led_status_update', get_led_status()) # Send updated status to all connected clients

# Callback function to handle the socket message 'get_initial_state' from the Web UI.
def on_get_initial_state(client, data):
    """Handle client request for initial LED state."""
    ui.send_message('led_status_update', get_led_status(), client)

ui = WebUI()                                               # Initialize WebUI

ui.on_message('toggle_led', toggle_led_state)              # Register callback for 'toggle_led' message to toggle the LED state
ui.on_message('get_initial_state', on_get_initial_state)   # Register callback for 'get_initial_state' message to send initial LED state

App.run()                                                  # Start the application
