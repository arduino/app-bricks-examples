# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
import time

counter = 0

def loop():
    global counter
    counter += 1
    print(f"User loop iteration #{counter}")
    time.sleep(1)

App.run(user_loop=loop) # The App runs `loop` repeatedly on the main thread
