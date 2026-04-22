// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include "Arduino_RouterBridge.h"
#include <vector>

// Receives a Python list as std::vector and logs each element
void log_values(std::vector<int> values) {
    for (int v : values) {
        Monitor.println(v);
    }
}

void setup() {
    Monitor.begin(115200);

    Bridge.begin(); // Start the Bridge
    Bridge.provide("log_values", log_values); // Expose the function to Python
}

void loop() {
    // Nothing to do: the function runs whenever Python calls it
}
