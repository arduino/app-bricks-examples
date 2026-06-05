# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to demonstrate how to receive requests from the Web UI using the WebUI brick.
# In this example, is defined a WebSocket message handler and an HTTP API endpoint that
# will be called when the user clicks a button in the Web UI and, the Python code will
# log a message in the console.
from arduino.app_utils import *
from arduino.app_utils import Logger
from arduino.app_bricks.web_ui import WebUI

logger = Logger("WebUIButtonAction")
ui = WebUI()

# Define a function to handle incoming messages from the Web UI, both via WebSocket and HTTP POST requests.
def print_message(source: str):
    logger.info(f"Button clicked! Message received from {source}") # Log a message in the console when the button is clicked, indicating the source of the message

# Define a callback function to be called when a 'print_message' message is received from the Web UI via WebSocket.
def wss_print_message(client, data):
    print_message("WebSocket")

# Define a function to be called when the 'print_message' API endpoint is called via an HTTP POST request from the Web UI.
def http_print_message():
    print_message("HTTP POST")
    return {}  # Return a JSON response indicating that the message was received successfully


# Register the wss_print_message function to be called when the "print_message" event is received from the Web UI via websocket.
ui.on_message("print_message", wss_print_message)

# Expose the http_print_message function as an HTTP RESTful API endpoint that can be called from the Web UI using a POST request
ui.expose_api(method="POST", path="/print_message", function=http_print_message)

App.run()
