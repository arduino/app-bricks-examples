// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_LED_Matrix.h>
#include <Arduino_RouterBridge.h>

#include "heart_frames.h"

Arduino_LED_Matrix matrix;

void setup() {
  matrix.begin();
  matrix.clear();
  matrix.loadFrame(HeartStatic);

  Bridge.begin();
  Bridge.provide("keyword_detected", wake_up);
}

void loop() {}

void wake_up() {
  matrix.loadSequence(HeartAnim);
  matrix.playSequence();

  delay(1000);

  matrix.loadFrame(HeartStatic);
}
