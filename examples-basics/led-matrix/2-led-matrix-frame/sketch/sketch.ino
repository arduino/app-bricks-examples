#include <Arduino_RouterBridge.h>                     // Include the RouterBridge library
#include <Arduino_LED_Matrix.h>                       // Include the LED_Matrix library
#include <vector>                                     // Include the vector library for using std::vector

Arduino_LED_Matrix matrix;                            // Create an instance of the ArduinoLEDMatrix class

const uint8_t FRAME_ROWS = 8;                         // Number of rows in the LED matrix
const uint8_t FRAME_COLS = 13;                        // Number of columns in the LED matrix
const uint8_t FRAME_SIZE = FRAME_ROWS * FRAME_COLS;   // Total number of pixels in the frame

uint8_t frame[FRAME_SIZE] = {0};                      // Global frame buffer initialized to zeros

void setup() {
    matrix.begin();                                   // Initialize the LED matrix

    matrix.setGrayscaleBits(3);                       // setGrayscaleBits configures the number of bits used for each led brightness level.
                                                      // max value for setGrayscaleBits is 8 (2^8-1), so the display accepts brightness values from 0 to 255 for each led.
                                                      // 3 bits would allow brightness values from 0 to 7, which is the default value for Arduino_LED_Matrix.

    matrix.clear();                                   // Clear the display

    Bridge.begin();                                   // Initialize the RouterBridge
    
    Bridge.provide("draw", draw);                     // Provide the "draw" function to the bridge, allowing it to be called from the python side
}

void loop() {
    matrix.draw(frame);                               // Draw the current frame on the display
    delay(10);                                        // Wait for 10 milliseconds before the next update
}


void draw(std::vector<uint8_t> newFrame) {            // The "draw" function takes a vector of uint8_t as input, representing the frame to be displayed on the LED matrix
    size_t len = min(newFrame.size(), (size_t)FRAME_SIZE);
    memcpy(frame, newFrame.data(), len);              // Copy the received frame data into the global frame buffer
}
