# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()

def on_set_color(ledid: int, message: dict):
    print(f"Received set_color message: {message}")
    try:
        color = message.get("color")

        Leds.set_led_color(ledid, color)

    except Exception as e:
        ui.send_message("error", f"LED color set error: {e}")

#Initialize LEDs to off state
on_set_color(1, {"led": 1, "color": {"r": 0, "g": 0, "b": 0}})
on_set_color(2, {"led": 2, "color": {"r": 0, "g": 0, "b": 0}})
on_set_color(3, {"led": 3, "color": {"r": 0, "g": 0, "b": 0}})
on_set_color(4, {"led": 4, "color": {"r": 0, "g": 0, "b": 0}})

ui.on_message("set_color", on_set_color)

App.run()
