# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to blink the built-in LED on the board by calling a function defined in the sketch from Python.
from arduino.app_utils import *
import time

led_state = False

# Define the loop function to toggle the LED state every second by calling the "set_led_state" function defined in the sketch.
# The "set_led_state" function can be called from Python using the Bridge.call method.
def loop():
    global led_state
    time.sleep(1)
    led_state = not led_state
    Bridge.call("set_led_state", led_state) # Call the "set_led_state" function defined in the sketch, passing the current LED state (True or False) to control the LED

# The loop function will be called repeatedly by the App.run() method.
App.run(user_loop=loop)