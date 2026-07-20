// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include "Arduino_RouterBridge.h" // Include the RouterBridge library to enable communication between the Arduino and Python
#include <Arduino_LED_Matrix.h>   // Include the Arduino_LED_Matrix library to control the LED matrix display
#include "Animation.h"            // Include the Animation header file which contains the animation data

Arduino_LED_Matrix matrix;        // Create an instance of the Arduino_LED_Matrix class

void setup() {   
    matrix.begin();                                      // Initialize the LED matrix      
    matrix.clear();                                      // Clear the LED matrix display to start with a blank state

    Bridge.begin();                                     // Initialize the Bridge
    Bridge.provide("turn_led_matrix", turn_led_matrix); // Provide the "turn_led_matrix" function to be called from Python
}

void loop() {
}

// Define the function to set the LED matrix state, callable from Python
void turn_led_matrix(bool state) {
    /* Set the LED matrix state based on the input from Python
       Turn on the LED matrix if state is True, or turn it off if state is False
    */
    if (state == true) {
      matrix.loadFrame(frame); // Load the animation frames into the library's internal sequence player
    } else {
      matrix.clear();         // Clear the LED matrix display to turn it off
    }

}