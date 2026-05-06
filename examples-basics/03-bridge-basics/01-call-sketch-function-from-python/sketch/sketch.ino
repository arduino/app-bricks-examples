// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include "Arduino_RouterBridge.h"

// Function exposed to Python: logs a greeting to the Monitor
void say_hello(String name) {
    Monitor.print("Hello from ");
    Monitor.println(name);
}

void setup() {
    Monitor.begin(115200);

    Bridge.begin(); // Start the Bridge
    Bridge.provide("say_hello", say_hello); // Expose the function to Python
}

void loop() {
    // Nothing to do: the function runs whenever Python calls it
}
