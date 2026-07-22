# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI


ui = WebUI()
ui.expose_api("GET", "/hello", lambda: {"message": "Hello, world!"})

App.run()  # This will block until the app is stopped
