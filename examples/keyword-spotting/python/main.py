# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.keyword_spotting import KeywordSpotting

def on_keyword_detected():
    """Callback function that handles a detected keyword."""
    Bridge.call("keyword_detected")

spotter = KeywordSpotting()
spotter.on_detect("hey_arduino", on_keyword_detected)

App.run()
