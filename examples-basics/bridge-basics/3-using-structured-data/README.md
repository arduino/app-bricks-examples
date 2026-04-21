# Using structured data

## Overview
This example shows how to pass a structured payload across the Bridge. Python sends a list of integers to the sketch, which receives it as a `std::vector<int>` and logs each element over the Serial port.

## Prerequisites
- Arduino UNO Q or VENTUNO Q

## Getting Started
1. Read the app implementation in `python/main.py` and `sketch/sketch.ino`
2. Run the app
3. Open the serial monitor to see each value logged

## How it Works
- Python calls `Bridge.call("log_values", [10, 20, 30])`
- The sketch provider signature `void log_values(std::vector<int> values)` receives the list directly

## Next Steps
- Try other container types (e.g., `std::array<uint32_t, N>`)
- Send a list of floats or bytes and observe the type mapping

## Related Inspirational Examples
- `examples/led-matrix-painter`
- `examples/color-your-leds`
