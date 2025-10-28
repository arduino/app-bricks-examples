// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_LED_Matrix.h>
#include <Arduino_RouterBridge.h>

#include "air_quality_frames.h"

Arduino_LED_Matrix matrix;

void setup() {
  matrix.begin();
  matrix.clear();

  Bridge.begin();
}

void loop() {
  String airQuality;
  bool ok = Bridge.call("get_air_quality").result(airQuality);
  if (ok) {
    if (airQuality == "Good") {
      matrix.loadFrame(good);
    } else if (airQuality == "Moderate") {
      matrix.loadFrame(moderate);
    } else if (airQuality == "Unhealthy for Sensitive Groups") {
      matrix.loadFrame(unhealthy_for_sensitive_groups);
    } else if (airQuality == "Unhealthy") {
      matrix.loadFrame(unhealthy);
    } else if (airQuality == "Very Unhealthy") {
      matrix.loadFrame(very_unhealthy);
    } else if (airQuality == "Hazardous") {
      matrix.loadFrame(hazardous);
    } else {
      matrix.loadFrame(unknown);
    }
  }
  delay(1000);
}
