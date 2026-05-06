# App Run

The **App Run** example shows the role of `App.run()`: it blocks the main thread so background handlers, bricks, and Bridge callbacks stay alive. The sketch sends a ping once per second and the Python® side prints it only because `App.run()` keeps the process running.

## Description

This example demonstrates the simplest Python® entry point using the App runtime. A Bridge callback is registered with `Bridge.provide` and `App.run()` is called to block the main thread, allowing the framework to dispatch incoming calls. Without `App.run()`, the Python® script would exit immediately and no events would ever be served.

## Bricks Used

**This example does not use any Bricks.** It focuses on the App runtime entry point.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App
2. Watch the Python® console print `Ping received from the sketch` once per second

## How it Works

Once the application is running, the device performs the following operations:

- **Registering the callback on the Python® side.**

The Python® script exposes a handler for the sketch to invoke:

```python
from arduino.app_utils import *

def on_ping():
    print("Ping received from the sketch")

Bridge.provide("on_ping", on_ping)
```

- **Keeping the app alive.**

`App.run()` blocks the main thread and waits for events so the Bridge can dispatch incoming calls:

```python
App.run()
```

- **Triggering the callback from the sketch.**

The Arduino sketch notifies Python® every second:

```cpp
Bridge.notify("on_ping");
```

The high-level data flow looks like this:

```
Arduino Timer → Bridge.notify → App.run keeps Python alive → on_ping()
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component registers the callback and blocks on `App.run()`.

- **`Bridge.provide("on_ping", on_ping)`:** Exposes the callback so the sketch can reach it through the Router Bridge.

- **`App.run()`:** Blocks the main thread and keeps the runtime alive until a shutdown signal (Ctrl+C / SIGTERM) is received. Without it, the script would return immediately and no callback would ever fire.

### 🔧 Hardware (`sketch.ino`)

The Arduino code drives the periodic notification.

- **`Bridge.begin()`:** Initializes the Router Bridge communication system.

- **Non-blocking `millis()` timing:** Sends a ping every `interval` milliseconds without stalling the loop.

- **`Bridge.notify("on_ping")`:** Fire-and-forget call that triggers the Python® handler kept alive by `App.run()`.

## Related Inspirational Examples
- `Keyword spotting`
- `Weather forecast`
