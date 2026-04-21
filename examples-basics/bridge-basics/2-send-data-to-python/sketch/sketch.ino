// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include "Arduino_RouterBridge.h"

// Monotonic counter sent to Python every second
unsigned long counter = 0;
unsigned long previousMillis = 0;
const long interval = 1000;

void setup() {
    // Start the Bridge; no providers needed on this side
    Bridge.begin();
}

void loop() {
    unsigned long currentMillis = millis();

    // Non-blocking timing: send a new value every `interval` ms
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;
        counter++;

        // Fire-and-forget: push the value to the Python callback "on_tick"
        Bridge.notify("on_tick", counter);
    }
}
