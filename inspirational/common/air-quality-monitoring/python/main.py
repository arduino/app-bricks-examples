# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.air_quality_monitoring import AirQualityLookupError, AirQualityMonitoring
from arduino.app_utils import App, Bridge


# Insert your API token here
API_TOKEN = "demo"

# Edit this variable to see your city data
city = "Torino"

monitor = AirQualityMonitoring(token=API_TOKEN)


def get_air_quality():
    """Fetch the air quality of the city from the AQICN API and return its AQI level."""
    try:
        data = monitor.get_air_quality_by_city(city)
    except AirQualityLookupError as e:
        print(f"API Error: {e.message}")
        return
    level = AirQualityMonitoring.map_aqi_level(data.aqi)
    return level.description if level else "N/A"


# Allow the microcontroller to call the "get_air_quality" function to show AQI level on led matrix
Bridge.provide("get_air_quality", get_air_quality)

App.run()
