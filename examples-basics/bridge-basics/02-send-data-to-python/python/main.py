# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *

# Callback invoked by the sketch whenever it sends a new value
def on_tick(counter: int):
    print(f"Received counter from sketch: {counter}")

Bridge.provide("on_tick", on_tick) # Expose the callback to the sketch under the name "on_tick"

App.run()
