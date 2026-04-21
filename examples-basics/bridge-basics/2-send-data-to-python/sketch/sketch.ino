// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include "Arduino_RouterBridge.h"

// Monotonic counter sent to Python every second
unsigned long counter = 0;
unsigned long previousMillis = 0;
const long interval = 1000;

void setup() {
    Bridge.begin(); // Start the Bridge
}

void loop() {
    unsigned long currentMillis = millis();

    // Non-blocking timing: send a new value every `interval` ms
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;
        counter++;

        Bridge.notify("on_tick", counter); // Push the value to the Python callback "on_tick"
    }
}
