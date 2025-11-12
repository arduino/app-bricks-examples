// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>

void setRGB(int ledRPin, int ledGPin, int ledBPin, int r, int g, int b) {
  analogWrite(ledRPin, r);
  analogWrite(ledGPin, g);
  analogWrite(ledBPin, b);
}

void setColor(int ledIndex, int r, int g, int b) {
  switch (ledIndex) {
    case 3:
      setRGB(LED3_R, LED3_G, LED3_B, r, g, b);
      break;
    case 4:
      setRGB(LED4_R, LED4_G, LED4_B, r, g, b);
      break;
    default:
      break;
  }
}

void setup()
{
    setColor(3, 0, 0, 0); // Initialize LED 3 to off
    setColor(4, 0, 0, 0); // Initialize LED 4 to off

    Bridge.begin();

    Bridge.provide("set_led_color", setColor);
}

void loop() {}
