# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_utils import App
from arduino.app_bricks.tps import TPS

tps = TPS()


def print_location():
    # Blocking lookup: scans the nearby Wi-Fi access points and waits for the location
    result = tps.locate()
    location = result["location"]
    print(f"Location: lat={location['lat']}, lng={location['lng']}")
    print(f"Accuracy: {result['accuracy']}m from {result['nap']} access points")
    time.sleep(30)

App.run(print_location)
