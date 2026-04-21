# Send data to Python

## Overview
This example shows the opposite direction of the Bridge: the sketch pushes data to Python. A counter incrementing every second on the microcontroller is delivered to a Python callback that simply prints it.

## Prerequisites
- Arduino UNO Q or VENTUNO Q

## Getting Started
1. Read the app implementation in `python/main.py` and `sketch/sketch.ino`
2. Run the app
3. Watch the counter values appear in the Python console once per second

## How it Works
- Python exposes a callback with `Bridge.provide("on_tick", on_tick)`
- The sketch fires it with `Bridge.notify("on_tick", counter)` — a fire-and-forget call (no return value)

## Next Steps
- Replace the counter with a real sensor reading (e.g., `analogRead`)
- Increase the rate and add some lightweight processing on the Python side

## Related Inspirational Examples
- `examples/real-time-accelerometer`
- `examples/home-climate-monitoring-and-storage`
