# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.arduino_cloud import ArduinoCloud
from arduino.app_utils import App
import time

# If secrets are not provided in the class initialization, they will be read from environment variables
arduino_cloud = ArduinoCloud()


def led_callback(client: object, value: bool):
    """Callback function to handle LED blink updates from cloud."""
    print(f"LED blink value updated from cloud: {value}")


arduino_cloud.register("led", value=False, on_write=led_callback)


def blink():
    """Toggle the LED value and push it to the cloud once per iteration."""
    arduino_cloud.led = not arduino_cloud.led
    print(f"LED blink set to: {arduino_cloud.led}")
    time.sleep(3)


App.start_brick(arduino_cloud)
App.run(user_loop=blink)
