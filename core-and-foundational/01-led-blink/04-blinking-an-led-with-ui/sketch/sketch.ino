// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

/* Example sketch which allows controlling the built-in LED from Python using the RouterBridge library.
   The "set_led_state" function can be called from Python to turn the LED on or
   off based on the boolean value passed from Python.
*/

#include "Arduino_RouterBridge.h"

void setup() {
    
    pinMode(LED_BUILTIN, OUTPUT);                   // Initialize digital pin LED_BUILTIN as an output.

    Bridge.begin();                                 // Is mandatory calling Bridge.begin() to initialize Bridge communication.
    Bridge.provide("set_led_state", set_led_state); // Provide the "set_led_state" function to be called from Python
}

void loop() {
}

void set_led_state(bool state) {
    digitalWrite(LED_BUILTIN, state ? LOW : HIGH);  // Set the LED state based on the state input parameter
}