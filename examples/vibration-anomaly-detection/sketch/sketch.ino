// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>
#include <Arduino_Modulino.h>

// Create a ModulinoMovement object
ModulinoMovement movement;

float x_accel, y_accel, z_accel; // Accelerometer values in g

unsigned long previousMillis = 0; // Stores last time values were updated
const long interval = 16;         // Interval at which to read (16ms) - sampling rate of 62.5Hz and should be adjusted based on model definition
int has_movement = 0;             // Flag to indicate if movement data is available

void setup() {
  Bridge.begin();

  // Initialize Modulino I2C communication
  Modulino.begin(Wire1);

  // Detect and connect to movement sensor module
  while (!movement.begin()) {
    delay(1000);
  }
}

void loop() {
  unsigned long currentMillis = millis(); // Get the current time

  if (currentMillis - previousMillis >= interval) {
    // Save the last time you updated the values
    previousMillis = currentMillis;

    // Read new movement data from the sensor
    has_movement = movement.update();
    if(has_movement == 1) {
      // Get acceleration values
      x_accel = movement.getX();
      y_accel = movement.getY();
      z_accel = movement.getZ();
    
      Bridge.notify("record_sensor_movement", x_accel, y_accel, z_accel);      
    }
    
  }
}
