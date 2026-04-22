# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to blink the LED 1 mounted on the board.
import time
from arduino.app_utils import App  # Import the App class to create an App Lab application
from arduino.app_utils import Leds # Import the Leds class to control the LEDs on the board

def loop():    
    # Please note that the Leds.set_led1_color function takes 
    # three parameters (R, G, B) to set the color of the LED
    Leds.set_led1_color(1,0,0) # Turn on the LED red segment(1, 0, 0)
    time.sleep(1)              # Wait for 1 second
    Leds.set_led1_color(0,0,0) # Turn off the LED (0, 0, 0)
    time.sleep(1)

App.run(user_loop=loop)