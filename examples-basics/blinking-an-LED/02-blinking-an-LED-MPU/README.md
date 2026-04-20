# Blinking an LED from MPU

The **Blinking an LED from MPU** example demonstrates how to interact with the surface-mounted LEDs of the Arduino UNO Q from a Python script.

## Description

This App turns on and off `LED1` which is controllable by the MPU.
The logic implementation is inside the Python script and the interaction with the LED is performed by the microprocessor unit.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

## How to Use the Example

### Configure & Launch App

1. **Run the App**
   Launch the App by clicking the **Run** button in the top right corner. Wait for the App to start.
   ![Launch the App](assets/docs_assets/launch-app.png)

2. **See the led**
   The `LED1` will start blinking red

## How it Works

Once the App is running, the `LED1` is turned on red and off with a duty cycle of 1 second.

## Understanding the Code

### 🔧 Python script (`main.py`)

The Python script handles the logic of turning on and off the `LED1`.

- **Execution**: The `loop()` function contains the logic to turn on and off `LED1` in red. It is continuously and repeatedly executed.

```python
def loop():
    # Blink LED 1 in red
    # Turn on the LED red segment(1, 0, 0)
    Leds.set_led1_color(1,0,0)
    time.sleep(1)

    # Turn off the LED (0, 0, 0)
    Leds.set_led1_color(0,0,0)
    time.sleep(1)
```
