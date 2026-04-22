# Send data to Python

The **Send data to Python** example shows the opposite direction of the Router Bridge: the sketch pushes data to the Python® backend. A counter incrementing every second on the microcontroller is delivered to a Python® callback that simply prints the received value.

## Description

This example demonstrates how the sketch can notify the Python® side whenever a new value is available, using `Bridge.notify`. The Python® script registers a callback with `Bridge.provide`, while the Arduino sketch increments a counter and pushes it through the Router Bridge at regular intervals. It provides a foundation for streaming sensor samples or events from the microcontroller to the Linux side.

## Bricks Used

**This example does not use any Bricks.** It shows direct Router Bridge communication between Python® and Arduino.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App
2. Watch the Python® console print a new counter value every second

## How it Works

Once the application is running, the device performs the following operations:

- **Exposing a callback on the Python® side.**

The Python® script registers a function that the sketch can invoke remotely:

```python
from arduino.app_utils import *

def on_tick(counter: int):
    print(f"Received counter from sketch: {counter}")

Bridge.provide("on_tick", on_tick)

App.run()
```

- **Pushing data from the sketch.**

The Arduino sketch increments a counter every second and notifies Python®:

```cpp
if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    counter++;
    Bridge.notify("on_tick", counter);
}
```

The high-level data flow looks like this:

```
Arduino Timer → Router Bridge → Python® Callback
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component exposes the callback invoked by the sketch.

- **`on_tick(counter)`:** Receives the value sent by the sketch and prints it.

- **`Bridge.provide("on_tick", on_tick)`:** Registers the callback so the sketch can reach it through the Router Bridge.

- **`App.run()`:** Starts the runtime and keeps the process alive.

### 🔧 Hardware (`sketch.ino`)

The Arduino code drives the periodic notification.

- **`Bridge.begin()`:** Initializes the Router Bridge communication system.

- **Non-blocking `millis()` timing:** Sends a new value every `interval` milliseconds without stalling the loop.

- **`counter++`:** Increments the value sent on each tick.

- **`Bridge.notify("on_tick", counter)`:** Fire-and-forget call that delivers the value to the Python® callback without waiting for a return value.

## Related Inspirational Examples
- `Real time accelerometer`
- `Home climate monitoring and storage`
