# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
import time

def loop():
    time.sleep(1)
    # Send a list of three values to the sketch as a single structured payload
    Bridge.call("log_values", [10, 20, 30])

App.run(user_loop=loop)
