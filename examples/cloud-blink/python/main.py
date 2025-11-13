# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

# EXAMPLE_NAME = "Arduino Cloud LED Blink Example"
from arduino.app_bricks.arduino_cloud import ArduinoCloud
from arduino.app_utils import App, Bridge

# If secrets are not provided in the class initialization, they will be read from environment variables
iot_cloud = ArduinoCloud()


def led_callback(client: object, value: bool):
    """Callback function to handle LED blink updates from cloud."""
    print(f"LED blink value updated from cloud: {value}")
    # Call a function in the sketch, using the Bridge helper library, to control the state of the LED connected to the microcontroller.
    # This performs a RPC call and allows the Python code and the Sketch code to communicate.
    Bridge.call("set_led_state", value)

iot_cloud.register("led", value=False, on_write=led_callback)

App.run()
