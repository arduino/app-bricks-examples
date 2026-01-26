// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
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
  digitalWrite(LED4_R, r ? LOW : HIGH);
  digitalWrite(LED4_G, g ? LOW : HIGH);
  digitalWrite(LED4_B, b ? LOW : HIGH);
}

void setup()
{
    pinMode(LED4_R, OUTPUT);
    pinMode(LED4_G, OUTPUT);
    pinMode(LED4_B, OUTPUT);
    
    set_led3_color(0, 0, 0);
    set_led4_color(false, false, false);

    Bridge.begin();

    Bridge.provide("set_led3_color", set_led3_color);
    Bridge.provide("set_led4_color", set_led4_color);
}

void loop() {}
