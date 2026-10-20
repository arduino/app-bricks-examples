// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

/* Example sketch which demonstrates how to use the Monitor class to send log messages from the microcontroller to the Arduino App Lab Serial Monitor. 
   The sketch sends a "Hello, world!" message every second.
*/

#include "Arduino_RouterBridge.h"

void setup() {
  Monitor.begin();  // In order to use monitor we need to initialize it
}

void loop() {
  Monitor.println("Hello, world!"); // Transmit the string "Hello, world!" followed by a newline character
  delay(1000);
}