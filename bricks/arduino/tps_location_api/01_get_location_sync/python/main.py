# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.tps_location_api import TPSLocationAPI

location_api = TPSLocationAPI()

# Blocking lookup: scans the nearby Wi-Fi access points and waits for the location
result = location_api.locate()
location = result["location"]
print(f"Location: lat={location['lat']}, lng={location['lng']}")
print(f"Accuracy: {result['accuracy']}m from {result['nap']} access points")

App.run()
