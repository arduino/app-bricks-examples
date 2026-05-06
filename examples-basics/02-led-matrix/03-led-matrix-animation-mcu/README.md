# LED Matrix Animation

## Description
This example demonstrates how to display animations on the LED matrix.

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
   The LED matrix will show the animation in loop.

## How it Works

Once the application is running, the on-board LED matrix will play an animation made of 3 frames, each during 500 milliseconds.

## Understanding the Code

### 🔧 Hardware (`sketch.ino`)

The Arduino Sketch script imports the `frames.h` header file which contains the animation definition with frames and their duration in milliseconds.

- **Initialization**: The `setup()` function initialize the LED matrix and load the animation with `loadSequence()` method.

```cpp
#include <Arduino_LED_Matrix.h>       // Include the LED_Matrix library
#include "frames.h"                   // Include the animation frames

Arduino_LED_Matrix matrix;            // Create an instance of the Arduino_LED_Matrix class

void setup() {
    matrix.begin();                   // Initialize the LED matrix
    matrix.loadSequence(animation);   // Load the animation frames into the library's internal sequence player
}
```
- **Execution**: The `loop()` function calls the `playSequence()` method to play the animation. Using `true` as argument it will play the animation in loop and this means we don't need to manually add a `delay()` after this instruction: MCU timing for the sequence is automatically handled by the method itself.

```cpp
void loop() {
    matrix.playSequence(true);        // playSequence(true) plays the animation in a loop.
}
```

## Related Inspirational Examples

- Led Matrix Painter

  **NOTE:** Try to create and export animations with `Led Matrix Painter` inpirational example. You can play exported animations using a copy of this app. 
  Just make sure to:
  - copy and paste the exported header file to the `sketch/` folder of this app
  - remove `sketch/frame.h` file
  - include new file in the sketch (e.g. `#include <Animation.h>`) and remove the old one (`#include <frame.h>`)
  - make sure the name of the animation declared in the new header file is correctly called in the sketch.