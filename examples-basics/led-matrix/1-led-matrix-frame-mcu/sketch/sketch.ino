// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_LED_Matrix.h>                       // Include the LED_Matrix library

Arduino_LED_Matrix matrix;                            // Create an instance of the ArduinoLEDMatrix class

const uint8_t FRAME_ROWS = 8;                         // Number of rows in the LED matrix
const uint8_t FRAME_COLS = 13;                        // Number of columns in the LED matrix
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;   // Total number of pixels in the frame

uint8_t frame[FRAME_SIZE] = {                         // Define a X shaped frame as an array (8x13 matrix) with just 2 brightness levels (0 and 7)
    7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7,
    0, 0, 7, 7, 0, 0, 0, 0, 0, 7, 7, 0, 0,
    0, 0, 0, 0, 7, 7, 0, 7, 7, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 7, 7, 0, 7, 7, 0, 0, 0, 0,
    0, 0, 7, 7, 0, 0, 0, 0, 0, 7, 7, 0, 0,
    7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7
};

uint8_t frame_gradient[FRAME_SIZE] = {                // Define a X shaped gradient frame as an array (8x13 matrix) with brightness levels from 0 to 7
    1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1,
    0, 0, 3, 3, 0, 0, 0, 0, 0, 3, 3, 0, 0,
    0, 0, 0, 0, 4, 5, 0, 5, 4, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 6, 7, 6, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 6, 7, 6, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 4, 5, 0, 5, 4, 0, 0, 0, 0,
    0, 0, 3, 3, 0, 0, 0, 0, 0, 3, 3, 0, 0,
    1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1
};

void setup() {
    matrix.begin();                                   // Initialize the LED matrix

    matrix.setGrayscaleBits(3);                       // setGrayscaleBits configures the number of bits used for each led brightness level.
                                                    // max value for setGrayscaleBits is 8 (2^8-1), so the display accepts brightness values from 0 to 255 for each led.
                                                    // 3 bits would allow brightness values from 0 to 7, which is the default value for Arduino_LED_Matrix.

    matrix.clear();                                   // Clear the display
}

void loop() {
    matrix.draw(frame);                               // Draw the X shaped frame on the display
    delay(1000);                                      // Wait for 1 second
    matrix.draw(frame_gradient);                      // Draw the X shaped gradient frame on the display
    delay(1000);                                      // Wait for 1 second
}