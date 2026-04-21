# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to blink the built-in LED on the board by calling a function defined in the sketch from Python.
from arduino.app_utils import *
import time

# Initialize the state of the LED as off (False)
led_state = False

# Define the loop function to toggle the LED state every second by calling the "set_led_state" function defined in the sketch
# The "set_led_state" function is provided by the sketch and can be called from Python using the Bridge.call method.
# The loop function will be called repeatedly by the App.run() method, allowing us to continuously toggle the LED state every second.
def loop():
    global led_state                        # Use the global variable, defined at line 10, to keep track of the LED state
    time.sleep(1)
    led_state = not led_state               # Toggle the LED state (True to False, or False to True)
    Bridge.call("set_led_state", led_state) # Call the "set_led_state" function defined in the sketch, passing the current LED state (True or False) to control the LED

App.run(user_loop=loop)