# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI

# Global state
led_is_on = False

def get_led_status():
    """Get current LED status for API."""
    return {
        "led_is_on": led_is_on,
        "status_text": "LED IS ON" if led_is_on else "LED IS OFF"
    }

def toggle_led_state(client, data):
    """Toggle the LED state when receiving socket message."""
    global led_is_on
    led_is_on = not led_is_on

    # Call a function in the sketch, using the Bridge helper library, to control the state of the LED connected to the microcontroller.
    # This performs a RPC call and allows the Python code and the Sketch code to communicate.
    Bridge.call("set_led_state", led_is_on)

    # Send updated status to all connected clients
    ui.send_message('led_status_update', get_led_status())

def on_get_initial_state(client, data):
    """Handle client request for initial LED state."""
    ui.send_message('led_status_update', get_led_status(), client)

# Initialize WebUI
ui = WebUI()

# Handle socket messages (like in Code Scanner example)
ui.on_message('toggle_led', toggle_led_state)
ui.on_message('get_initial_state', on_get_initial_state)

# Start the application
App.run()
