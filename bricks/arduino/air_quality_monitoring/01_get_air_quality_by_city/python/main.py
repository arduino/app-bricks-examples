# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.air_quality_monitoring import AirQualityMonitoring
from arduino.app_utils import App

# Enter a valid AQICN API token to use the Brick properly
my_token = "demo"

monitor = AirQualityMonitoring(token=my_token)

city = "Turin"
data = monitor.get_air_quality_by_city(city)
print(f"Air quality in {data.city}: AQI = {data.aqi}, dominant pollutant: {data.dominantpol}")

App.run()
