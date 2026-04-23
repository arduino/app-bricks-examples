// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

/* Example sketch which demonstrates how to use the Monitor class to send log messages from the microcontroller to the Arduino App Lab Serial Monitor. 
   The sketch sends a "Hello UNO Q" message every second, which can be viewed in the Arduino App Lab environment using the RouterBridge library.
*/

#include "Arduino_RouterBridge.h" // Include the RouterBridge library to enable communication between the Arduino and Arduino App Lab Serial Monitor

void setup() {
  Monitor.begin();  // Initialize the Monitor
}

void loop() {
  Monitor.println("Hello UNO Q"); // Transmit the string "Hello UNO Q" followed by a newline character
  delay(1000);
}