# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()

def on_set_color(id, message: dict):
    ledid = message.get("led")
    rgb_color = message.get("color")
    # Led 1 and 2 are controlled by directly (MPU), while Led 3 and 4 are controlled via Bridge (MCU)
    try:
        if ledid not in (1, 2, 3, 4):
            raise ValueError(f"Unknown led '{ledid}'")

        if not rgb_color or not all(k in rgb_color for k in ("r", "g", "b")):
            raise ValueError("Color must be an object with 'r', 'g', 'b' keys")

        match ledid:
            case 1:
                Leds.set_led1_color(rgb_color["r"] != 0, rgb_color["g"] != 0, rgb_color["b"] != 0)
            case 2:
                Leds.set_led2_color(rgb_color["r"] != 0, rgb_color["g"] != 0, rgb_color["b"] != 0)
            case 3:
                Bridge.call("set_led3_color", rgb_color["r"], rgb_color["g"], rgb_color["b"])
            case 4:
                Bridge.call("set_led4_color", rgb_color["r"] != 0, rgb_color["g"] != 0, rgb_color["b"] != 0)

    except Exception as e:
        ui.send_message("error", f"LED color set error: {e}")

#Initialize LEDs to off state (only 1 and 2 here, 3 and 4 will be set in MCU setup)
on_set_color(1, {"led": 1, "color": {"r": 0, "g": 0, "b": 0}})
on_set_color(2, {"led": 2, "color": {"r": 0, "g": 0, "b": 0}})

ui.on_message("set_color", on_set_color)

App.run()
