# LED Matrix Frame

## Description
This example demonstrates how to display a frame on the LED matrix using the Python `Frame` class and sending it to the sketch via Bridge.

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
   The LED matrix will display an X-shaped frame.

## How it Works

Once the application is running, the Python script creates an X-shaped frame using a numpy array, converts it to bytes using the `Frame` class, and sends it to the sketch via Bridge. The sketch receives the frame data and displays it on the LED matrix.

## Understanding the Code

### 🐍 Backend (`main.py`)

The Python script creates a frame and sends it to the Arduino sketch through the Bridge.

- **Frame definition and transmission**: A 2D numpy array defines the 8x13 LED matrix brightness values forming an X shape. The `Frame` class converts it to bytes and `Bridge.call()` sends it to the sketch.

```python
frame_array = np.array(
    [
        [7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7],
        [0, 0, 7, 7, 0, 0, 0, 0, 0, 7, 7, 0, 0],
        ...
    ],
    dtype=np.uint8,
)

frame = Frame(frame_array)              # Create a Frame instance using the numpy array
frame_bytes = frame.to_board_bytes()    # Convert the Frame instance to bytes format suitable for transmission

Bridge.call("draw", frame_bytes)
```

### 🔧 Hardware (`sketch.ino`)

The sketch receives frame data from the Python script via Bridge and draws it on the LED matrix.

- **Initialization**: The `setup()` function initializes the LED matrix, configures the grayscale bits, and registers the `draw` function as a Bridge callback.

```cpp
#include <Arduino_RouterBridge.h>                     // Include the RouterBridge library
#include <Arduino_LED_Matrix.h>                       // Include the LED_Matrix library

Arduino_LED_Matrix matrix;                            // Create an instance of the ArduinoLEDMatrix class

void setup() {
    matrix.begin();                                   // Initialize the LED matrix
    matrix.setGrayscaleBits(3);                       // Configure brightness bits (0-7 range)
    matrix.clear();                                   // Clear the display
    Bridge.begin();
    Bridge.provide("draw", draw);                     // Provide the "draw" function as a Bridge callback
}
```

- **Execution**: The `loop()` continuously draws the current frame buffer, while the `draw` callback updates it when new data is received from Python.

```cpp
void loop() {
    matrix.draw(frame);                               // Draw the current frame on the display
    delay(10);                                        // Wait for 10 milliseconds before the next update
}

void draw(std::vector<uint8_t> newFrame) {
    size_t len = min(newFrame.size(), (size_t)FRAME_SIZE);
    memcpy(frame, newFrame.data(), len);              // Copy the received frame data into the global frame buffer
}
```

## Related Inspirational Examples

- Led Matrix Painter