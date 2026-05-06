# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *

def on_ping():
    print("Ping received from the sketch")

Bridge.provide("on_ping", on_ping)

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab to start
# and stop the app and the Bridge callbacks can be served
App.run()
