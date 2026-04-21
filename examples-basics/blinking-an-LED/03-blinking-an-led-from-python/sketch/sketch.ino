// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Example sketch which allows controlling the built-in LED from Python using the RouterBridge library.
// The "set_led_state" function can be called from Python to turn the LED on or
// off based on the boolean value passed from Python.

// Include the RouterBridge library to enable communication between the Arduino and Python
#include "Arduino_RouterBridge.h"

void setup() {
    // initialize digital pin LED_BUILTIN as an output.
    pinMode(LED_BUILTIN, OUTPUT);

    // Initialize the Bridge and provide the "set_led_state" function to be called from Python
    Bridge.begin();
    Bridge.provide("set_led_state", set_led_state);
}

void loop() {
}

// Define the function to set the state of the LED, callable from Python
void set_led_state(bool state) {
    /* Set the LED state based on the input from Python
       Turn on the LED if state is True (LOW), or turn it off if state is False (HIGH)
       Note that the logic is inverted (LOW for on, HIGH for off), which is typical for 
       built-in LEDs that are wired with the cathode connected to the pin.
    */
    digitalWrite(LED_BUILTIN, state ? LOW : HIGH); 
}