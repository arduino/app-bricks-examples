# Call a sketch function from Python

The **Call a sketch function from Python** example shows the simplest Router Bridge pattern: a function defined in the sketch is invoked by the Python® script. Once per second, Python calls `say_hello` on the microcontroller, which logs a greeting over the Monitor.

## Description

This example demonstrates how to expose a sketch function to the Python® side and call it through the Router Bridge. The Python® script triggers the remote call periodically while the Arduino sketch executes the function locally on the microcontroller and prints the result to the Monitor. It provides a foundation for learning the `Bridge.provide` / `Bridge.call` communication pattern.

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
2. Open the Monitor and watch the greeting logged every second

## How it Works

Once the application is running, the device performs the following operations:

- **Triggering the remote call from Python®.**

The Python® script calls the sketch function in a timed loop:

```python
from arduino.app_utils import *
import time

def loop():
    time.sleep(1)
    Bridge.call("say_hello", "Python")

App.run(user_loop=loop)
```

- **Exposing the function on the sketch.**

The Arduino registers the function with the Router Bridge so Python® can reach it:

```cpp
Bridge.provide("say_hello", say_hello);
```

- **Executing the function on the microcontroller.**

The sketch implementation simply logs the received argument:

```cpp
void say_hello(String name) {
    Monitor.print("Hello from ");
    Monitor.println(name);
}
```

The high-level data flow looks like this:

```
Python® Loop → Router Bridge → Arduino Function
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component drives the remote call.

- **`import time`:** Provides the timing function used to space out calls.

- **`loop()`:** User loop invoked by the runtime on every iteration.

- **`time.sleep(1)`:** Waits one second between calls.

- **`Bridge.call("say_hello", "Python")`:** Invokes the sketch function `say_hello` through the Router Bridge, passing the string argument.

### 🔧 Hardware (`sketch.ino`)

The Arduino code registers the function and prints the incoming argument.

- **`Monitor.begin(115200)`:** Initializes the Monitor output for logging.

- **`Bridge.begin()`:** Initializes the Router Bridge communication system.

- **`Bridge.provide("say_hello", say_hello)`:** Registers the `say_hello` function so it can be called from the Python® script.

- **`say_hello(String name)`:** Receives the argument from Python® and logs a greeting.

- **Empty `loop()`:** The main loop remains empty since the function runs whenever Python® triggers a Bridge call.

## Related Inspirational Examples
- `Blink`
- `Cloud blink`
