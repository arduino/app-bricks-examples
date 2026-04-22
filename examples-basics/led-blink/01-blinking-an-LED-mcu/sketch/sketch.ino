// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Example sketch to blink an LED connected to the board. 
// The LED_BUILTIN is turned on for 1 second, then off for 1 second, repeatedly.


void setup() {
  pinMode(LED_BUILTIN, OUTPUT);      // initialize digital pin LED_BUILTIN as an output.
}

void loop() {
  // put your main code here, to run repeatedly:
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED_BUILTIN on (LOW is the voltage level)
  delay(1000);                       // wait for a second
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED_BUILTIN off by making the voltage HIGH
  delay(1000);

  /* Note that the logic is inverted (LOW for on, HIGH for off), which is typical for 
     built-in LEDs that are wired with the cathode connected to the pin.
  */
}
