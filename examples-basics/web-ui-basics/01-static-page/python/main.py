# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to demonstrate how to expose a simple static web page using the WebUI brick.
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI # Import the WebUI class to manage the Web UI server

ui = WebUI()                                               # Initialize WebUI, by default it will serve the contet in the "assets" folder of the App

App.run()                                                  # Start the application
