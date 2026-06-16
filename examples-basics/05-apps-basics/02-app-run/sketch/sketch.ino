// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include "Arduino_RouterBridge.h"

unsigned long previousMillis = 0;
const long interval = 1000;

void setup() {
    Bridge.begin(); // Start the Bridge
}

void loop() {
    unsigned long currentMillis = millis();

    // Non-blocking timing: send a ping every `interval` ms
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;

        Bridge.notify("on_ping");
    }
}
