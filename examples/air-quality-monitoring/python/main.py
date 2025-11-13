# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *

import requests


# Insert your API token here
API_TOKEN = "demo"

# Edit this variable to see your city data 
city = "Torino"

# Endpoint for AQICN API
endpoint = f"https://api.waqi.info/feed/{city}/?token={API_TOKEN}"

# AQI levels mapping as a list of dictionaries
AQI_LEVELS = [
    {"min": 0, "max": 50, "description": "Good"},
    {"min": 51, "max": 100, "description": "Moderate"},
    {"min": 101, "max": 150, "description": "Unhealthy for Sensitive Groups"},
    {"min": 151, "max": 200, "description": "Unhealthy"},
    {"min": 201, "max": 300, "description": "Very Unhealthy"},
    {"min": 301, "max": 500, "description": "Hazardous"},
]


def map_aqi_level(aqi_value: int) -> str:
    """Return AQI level description for a given AQI integer value."""
    for level in AQI_LEVELS:
        if level["min"] <= aqi_value <= level["max"]:
            return level["description"]
    return "N/A"  # Return "N/A" if no level matches


def get_air_quality():
    """Fetch air quality data from AQICN API and return AQI level."""
    response = requests.get(endpoint)
    response_json = response.json()
    status = response_json.get("status", None)
    data = response_json.get("data", None)
    if status != 'ok' or not data:
        print(f"API Error: {response_json}")
        return
    aqi = data.get("aqi", -1)
    aqi_level = map_aqi_level(aqi)
    return aqi_level


# Allow the microcontroller to call the "get_air_quality" function to show AQI level on led matrix
Bridge.provide("get_air_quality", get_air_quality)

App.run()
