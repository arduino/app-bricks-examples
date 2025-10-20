// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>

#include "weather_frames.h"

// TODO: those will go into an header file.
extern "C" void matrixWrite(const uint32_t* buf);
extern "C" void matrixBegin();

void setup() {
  matrixBegin();

  Bridge.begin();
}

void playAnimation(const uint32_t* frames[], int frameCount, int repeat, int frameDelay) {
  for (int r = 0; r < repeat; r++) {
    for (int i = 0; i < frameCount; i++) {
      matrixWrite(frames[i]);
      delay(frameDelay);
    }
  }
}

String city = "Turin";

void loop() {
  String weather_forecast;
  bool ok =  Bridge.call("get_weather_forecast", city).result(weather_forecast);
  if (ok) {
    if (weather_forecast == "sunny") {
      playAnimation(SunnyFrames, 2, 20, 500);
    } else if (weather_forecast == "cloudy") {
      playAnimation(CloudyFrames, 4, 20, 500);
    } else if (weather_forecast == "rainy") {
      playAnimation(RainyFrames, 3, 16, 200);
    } else if (weather_forecast == "snowy") {
      playAnimation(SnowyFrames, 3, 5, 650);
    } else if (weather_forecast == "foggy") {
      playAnimation(FoggyFrames, 2, 5, 660);
    }
  }
}
