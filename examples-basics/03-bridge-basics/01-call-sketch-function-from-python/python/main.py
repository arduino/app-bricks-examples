# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
import time

def loop():
    time.sleep(1)
    
    Bridge.call("say_hello", "Python") # Invoke the sketch function "say_hello" registered via Bridge.provide

App.run(user_loop=loop)
