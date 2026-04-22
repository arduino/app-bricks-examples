# LED Matrix Frame with MCU

## Description
This example demonstrates how to display static frames on the LED matrix using only the MCU sketch.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q or VENTUNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

### Configure & Launch App

1. **Run the App**
   Launch the App by clicking the **Run** button in the top right corner. Wait for the App to start.

2. **See the LED matrix**
   The LED matrix will alternate between two different X-shaped frames every second.

## How it Works

Once the application is running, the on-board LED matrix will alternate between two X-shaped frames: one with uniform brightness and one with a gradient effect. Each frame is displayed for 1 second.

## Understanding the Code

### 🔧 Hardware (`sketch.ino`)

The sketch defines two 8x13 pixel frames and draws them alternately on the LED matrix.

- **Initialization**: The `setup()` function initializes the LED matrix, configures the grayscale bits for brightness levels, and clears the display.

```cpp
#include <Arduino_LED_Matrix.h>                       // Include the LED_Matrix library

Arduino_LED_Matrix matrix;                            // Create an instance of the ArduinoLEDMatrix class

void setup() {
    matrix.begin();                                   // Initialize the LED matrix
    matrix.setGrayscaleBits(3);                       // Configure brightness bits (0-7 range)
    matrix.clear();                                   // Clear the display
}
```

- **Frame definitions**: Two frames are defined as 8x13 arrays of brightness values (one value per pixel). The first uses only two levels (0 and 7), while the second uses a gradient with values from 0 to 7.

- **Execution**: The `loop()` function alternates between the two frames with a 1-second delay.

```cpp
void loop() {
    matrix.draw(frame);                               // Draw the X shaped frame on the display
    delay(1000);                                      // Wait for 1 second
    matrix.draw(frame_gradient);                      // Draw the X shaped gradient frame on the display
    delay(1000);                                      // Wait for 1 second
}
```

## Related Inspirational Examples

- Led Matrix Painter