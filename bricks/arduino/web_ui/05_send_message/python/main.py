# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI


ui = WebUI()
ui.on_connect(lambda sid: ui.send_message("hello", {"message": f"Hello, {sid}!"}))

App.run()  # This will block until the app is stopped
