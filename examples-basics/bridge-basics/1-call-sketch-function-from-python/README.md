# Call a sketch function from Python

## Overview
This example demonstrates the simplest Bridge pattern: Python invokes a function that lives on the microcontroller. The sketch exposes a `say_hello` function and Python calls it once per second, passing a string argument that the sketch logs over the Serial port.

## Prerequisites
- Arduino UNO Q or VENTUNO Q

## Getting Started
1. Read the app implementation in `python/main.py` and `sketch/sketch.ino`
2. Run the app
3. Open the serial monitor to see the greeting logged each second

## How it Works
- The sketch exposes a function with `Bridge.provide("say_hello", say_hello)`
- Python invokes it with `Bridge.call("say_hello", "Python")`

## Next Steps
- Pass different argument types (int, float, bool) and log them
- Add a second provider and call both from Python

## Related Inspirational Examples
- `examples/blink`
- `examples/cloud-blink`
