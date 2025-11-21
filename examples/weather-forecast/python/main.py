# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.weather_forecast import WeatherForecast
from arduino.app_utils import *

forecaster = WeatherForecast()


def get_weather_forecast(city: str) -> str:
    forecast = forecaster.get_forecast_by_city(city)
    print(f"Weather forecast for {city}: {forecast.description}")
    return forecast.category


Bridge.provide("get_weather_forecast", get_weather_forecast)

App.run()
