# Using structured data

The **Using structured data** example shows how to exchange a structured payload across the Router Bridge. Python® sends a list of integers to the sketch, which receives it as a `std::vector<int>` and logs each element over the Monitor.

## Description

This example demonstrates how Python® lists are serialized and delivered to the sketch as native C++ containers. The Python® script invokes a remote function once per second passing a three-element list, while the Arduino sketch receives the whole list in a single argument and iterates over it to log every value. It provides a foundation for sending arrays, vectors, or other batched payloads from Python® to the microcontroller.

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
2. Open the Monitor and watch each value of the list logged every second

## How it Works

Once the application is running, the device performs the following operations:

- **Sending a list from Python®.**

The Python® script calls the sketch function passing a list as the argument:

```python
from arduino.app_utils import *
import time

def loop():
    time.sleep(1)
    Bridge.call("log_values", [10, 20, 30])

App.run(user_loop=loop)
```

- **Receiving the list on the sketch.**

The Arduino sketch declares the provider with a `std::vector<int>` parameter; the Bridge unpacks the Python® list directly into the container:

```cpp
void log_values(std::vector<int> values) {
    for (int v : values) {
        Monitor.println(v);
    }
}
```

- **Exposing the provider.**

The function is registered with the Router Bridge in `setup()`:

```cpp
Bridge.provide("log_values", log_values);
```

The high-level data flow looks like this:

```
Python® List → Router Bridge → Arduino std::vector
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component sends the structured payload.

- **`import time`:** Provides the timing function used to space out calls.

- **`loop()`:** User loop invoked by the runtime on every iteration.

- **`Bridge.call("log_values", [10, 20, 30])`:** Invokes the sketch function `log_values` passing a Python® list as a single structured argument.

### 🔧 Hardware (`sketch.ino`)

The Arduino code unpacks and logs the received list.

- **`Monitor.begin(115200)`:** Initializes the Monitor output for logging.

- **`Bridge.begin()`:** Initializes the Router Bridge communication system.

- **`Bridge.provide("log_values", log_values)`:** Registers the provider so Python® can call it with a list argument.

- **`log_values(std::vector<int> values)`:** Receives the full list in a single parameter and iterates through each element.

- **`Monitor.println(v)`:** Prints every value of the incoming list.

## Related Inspirational Examples
- `examples/led-matrix-painter`
- `examples/color-your-leds`
