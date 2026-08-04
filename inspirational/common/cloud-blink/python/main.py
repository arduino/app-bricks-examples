# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

#

# EXAMPLE_NAME = "Arduino Cloud LED Blink Example"

from arduino.app_bricks.arduino_cloud import ArduinoCloud
from arduino.app_utils import App, Bridge

# The connection to Arduino Cloud is handled by the on-board arduino-cloud-connector daemon,
# no credentials are needed here: the board just needs to be connected to the Cloud from App Lab.
iot_cloud = ArduinoCloud()


def led_callback(client: object, value: bool):
    """Callback function to handle LED blink updates from cloud."""
    print(f"LED blink value updated from cloud: {value}")
    # Call a function in the sketch, using the Bridge helper library, to control the state of the LED connected to the microcontroller.
    # This performs a RPC call and allows the Python code and the Sketch code to communicate.
    Bridge.call("set_led_state", value)

iot_cloud.register("led", value=False, on_write=led_callback)

App.run()
