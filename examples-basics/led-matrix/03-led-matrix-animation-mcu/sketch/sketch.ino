// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_LED_Matrix.h>       // Include the LED_Matrix library
#include "frames.h"                   // Include the animation frames

Arduino_LED_Matrix matrix;            // Create an instance of the Arduino_LED_Matrix class

void setup() {
    matrix.begin();                   // Initialize the LED matrix
    matrix.loadSequence(animation);   // Load the animation frames into the library's internal sequence player
}

void loop() {
    matrix.playSequence(true);        // playSequence(true) plays the animation in a loop.
                                      // The library handles frame timing internally using each frame's duration_ms value,
                                      // so we don't need to add any delay here.
}
