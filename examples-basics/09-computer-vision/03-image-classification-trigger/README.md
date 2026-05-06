# Person classifier on camera with trigger

The **Person classifier on camera with trigger** example detects people in a live video stream from a camera and triggers an LED matrix animation on the Arduino UNO Q when a person is detected.

**Note:** This example needs a camera. You can use a USB camera or a CSI camera with the Arduino Media Carrier. Please note that it may be run in **Network Mode** in the Arduino App Lab if used with a USB-C hub and a USB camera.

## Description

This example demonstrates how to perform real-time image classification on a continuous video stream using the `VideoImageClassification` brick. The Python® script initializes the brick with a configurable confidence threshold and debounce time, then registers two callbacks: one triggered specifically when a person is detected, and one triggered on every detection result. When a person is detected, the script uses the `Bridge` to call a function on the Arduino sketch that turns on an LED matrix animation. When no person is present, the animation is turned off.

The application shows the fundamental workflow for event-driven image classification combined with MCU actuation, including brick initialization, callback registration, state tracking, and Bridge communication.

## Bricks Used

- **`VideoImageClassification`**: Continuously analyzes frames from the camera feed and fires callbacks whenever classifications are detected above the specified confidence threshold.

## Hardware and Software Requirements

### Hardware

In order to run this example you can choose between using an USB Camera or a CSI camera with the Arduino Media Carrier

#### USB Camera set-up
- Arduino UNO Q (x1)
- USB camera (x1)
- USB-C® hub adapter with external power (x1)
- A power supply (5 V, 3 A) for the USB hub (e.g. a phone charger)
- Personal computer with internet access

#### CSI Camera set-up
- Arduino UNO Q (x1)
- Arduino Media Carrier (x1)
- CSI Camera (x1)
- USB-C® cable (for power and programming) (x1)


### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

### USB Camera set-up
1. Connect the USB-C hub to the UNO Q and the USB camera.
  ![Hardware setup](assets/docs_assets/hardware-setup.png)
2. Attach the external power supply to the USB-C hub to power everything.
3. Run the App.
   ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
4. Detected objects and their confidence scores will appear in the Arduino App Lab console log.

### CSI Camera set-up
1. Connect the Arduino Media Carrier and a CSI camera.
2. Run the App.
    ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
3. Detected objects and their confidence scores will appear in the Arduino App Lab console log.

## How it Works

Once the application is running, the device performs the following operations:

- **Initializing the VideoImageClassification brick.**

The Python® script instantiates the `VideoImageClassification` brick with a confidence threshold and a debounce time:

```python
CONFIDENCE_THRESHOLD = 0.5
detection_stream = VideoImageClassification(confidence=CONFIDENCE_THRESHOLD, debounce_sec=1.0)
```

Only classifications with a confidence score equal to or above `CONFIDENCE_THRESHOLD` are reported. The `debounce_sec=1.0` parameter ensures at least one second between successive callbacks, avoiding rapid repeated triggers.

The framework automatically selects the first available camera based on priority order (CSI > USB). If no camera is found, an exception is raised.

- **Tracking detection state.**

A module-level variable tracks whether the animation is currently active to avoid sending redundant commands to the MCU:

```python
previous_state: bool = False
```

The helper function `turn_on_off_animation` compares the new state against `previous_state` and only calls the Bridge when the state actually changes:

```python
def turn_on_off_animation(new_state: bool):
    global previous_state
    if new_state != previous_state:
        previous_state = new_state
        if new_state == True:
            Bridge.call("turn_led_matrix", True)
        else:
            Bridge.call("turn_led_matrix", False)
```

- **Defining the detection callbacks.**

Two callbacks are registered. The first fires specifically when a person is classified:

```python
def person_detected():
    logger.info("Person detected!")
    turn_on_off_animation(True)
```

The second fires on every classification result and turns off the animation if no person is present among the results:

```python
def on_all_detections(classifications: dict):
    if len(classifications) == 0:
        return
    for key, _ in classifications.items():
        if key != "person":
            turn_on_off_animation(False)
```

- **Registering the callbacks.**

Both callbacks are registered with the brick:

```python
detection_stream.on_detect("person", person_detected)
detection_stream.on_detect_all(on_all_detections)
```

- **Running the application.**

The application is started and kept alive with:

```python
App.run()
```

The high-level data flow looks like this:

```
Camera Hardware → VideoImageClassification Brick → Detection Callbacks → Bridge.call() → LED Matrix (sketch.ino)
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component handles brick initialization, state tracking, callback registration, and Bridge communication with the MCU.

- **`from arduino.app_utils import App, Logger, Bridge`:** Imports the `App` class to manage the application lifecycle, the `Logger` class to log messages to the console, and the `Bridge` class to call functions defined in the Arduino sketch.

- **`from arduino.app_bricks.video_imageclassification import VideoImageClassification`:** Imports the `VideoImageClassification` brick to run image classification on the live video stream.

- **`CONFIDENCE_THRESHOLD = 0.5`:** Sets the minimum confidence score required for a classification to be reported.

- **`VideoImageClassification(confidence=CONFIDENCE_THRESHOLD, debounce_sec=1.0)`:** Instantiates the brick with the specified confidence threshold and a one-second debounce delay between callbacks to prevent rapid repeated triggers.

- **`previous_state: bool`:** Module-level variable that tracks whether the LED matrix animation is currently active. Used by `turn_on_off_animation` to avoid sending redundant Bridge calls when the state has not changed.

- **`turn_on_off_animation(new_state: bool)`:** Helper function that compares the requested state to `previous_state` and, only when the state changes, calls `Bridge.call("turn_led_matrix", ...)` to update the LED matrix on the MCU.

- **`person_detected()`:** Callback registered for the `"person"` label. Logs a detection message and calls `turn_on_off_animation(True)` to turn on the LED matrix animation.

- **`on_all_detections(classifications: dict)`:** Callback registered for all classifications. If any classified label is not `"person"`, it calls `turn_on_off_animation(False)` to turn off the animation.

- **`detection_stream.on_detect("person", person_detected)`:** Registers the label-specific callback so it fires only when a person is classified.

- **`detection_stream.on_detect_all(on_all_detections)`:** Registers the general callback so it fires on every classification event, allowing the animation to be deactivated when no person is present.

- **`App.run()`:** Starts the application event loop, keeping the program running and the brick active.

### 🔧 Hardware (`sketch.ino`)

The Arduino sketch component exposes a callable function to the Python® side via the Bridge and drives the LED matrix based on the commands it receives.

- **`#include "Arduino_RouterBridge.h"`:** Includes the RouterBridge library, which enables the Bridge communication channel between the MCU and the Python® application running on the host.

- **`#include <Arduino_LED_Matrix.h>`:** Includes the library for controlling the built-in LED matrix on the Arduino UNO Q.

- **`#include "Animation.h"`:** Includes a custom header file that defines the `frame` variable holding the animation pixel data displayed on the LED matrix when a person is detected.

- **`Arduino_LED_Matrix matrix`:** Creates the LED matrix instance used to load frames and clear the display.

- **`matrix.begin()`:** Initialize the LED matrix

- **`Bridge.begin()`:** Initializes the Bridge, establishing the communication channel with the Python® side.

- **`Bridge.provide("turn_led_matrix", turn_led_matrix)`:** Registers the `turn_led_matrix` function so it can be called remotely from Python® using `Bridge.call("turn_led_matrix", ...)`.

- **`turn_led_matrix(bool state)`:** The function exposed to Python®. When `state` is `true`, it loads the animation frame into the LED matrix using `matrix.loadFrame(frame)`. When `state` is `false`, it clears the display with `matrix.clear()`, turning the animation off.

## Related Inspirational Examples
- Object Hunting
- Person classifier on camera
