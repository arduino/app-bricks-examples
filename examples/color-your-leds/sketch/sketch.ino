// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>

// Led 3 can be controlled via PWM pins
void set_led3_color(int r, int g, int b) {
  analogWrite(LED3_R, r);
  analogWrite(LED3_G, g);
  analogWrite(LED3_B, b);
}

// Led 4 is a simple ON/OFF LED for each color channel, HIGH = OFF, LOW = ON
void set_led4_color(bool r, bool g, bool b) {
  digitalWrite(LED_BUILTIN + 3, r ? LOW : HIGH);
  digitalWrite(LED_BUILTIN + 4, g ? LOW : HIGH);
  digitalWrite(LED_BUILTIN + 5, b ? LOW : HIGH);
}

void setup()
{
    set_led3_color(0, 0, 0);
    set_led4_color(false, false, false);

    Bridge.begin();

    Bridge.provide("set_led3_color", set_led3_color);
    Bridge.provide("set_led4_color", set_led4_color);
}

void loop() {}
