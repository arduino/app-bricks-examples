// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_LED_Matrix.h>
#include <Arduino_RouterBridge.h>

#include "weather_frames.h"

String city = "Turin";

Arduino_LED_Matrix matrix;

void setup() {
  matrix.begin();
  matrix.clear();

  Bridge.begin();
}

void loop() {
  String weather_forecast;
  bool ok = Bridge.call("get_weather_forecast", city).result(weather_forecast);
  if (ok) {
    if ("sunny" == sequence_name) {
      matrix.loadSequence(Sunny);
      playRepeat(10);
    } else if ("cloudy" == sequence_name) {
      matrix.loadSequence(Cloudy);
      playRepeat(10);
    } else if ("rainy" == sequence_name) {
      matrix.loadSequence(Rainy);
      playRepeat(20);
    } else if ("snowy" == sequence_name) {
      matrix.loadSequence(Snowy);
      playRepeat(10);
    } else if ("foggy" == sequence_name) {
      matrix.loadSequence(Foggy);
      playRepeat(5);
    }
  }
}

void playRepeat(int repeat_count) {
  for (int i = 0; i < repeat_count; i++) {
    matrix.playSequence();
  }
}
