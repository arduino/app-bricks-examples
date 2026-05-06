# Video Object Detection

The **Video Object Detection** example detects objects in a live video stream from a camera and logs the detected objects along with their confidence scores to the console.

**Note:** This example needs a camera. You can use a USB camera or a CSI camera with the Arduino Media Carrier. Please note that it may be run in **Network Mode** in the Arduino App Lab if used with a USB-C hub and a USB camera.

## Description

This example demonstrates how to perform real-time object detection on a continuous video stream using the `VideoObjectDetection` brick. The Python® script initializes the brick with a configurable confidence threshold and debounce time, then registers a callback that is triggered every time objects are detected. The callback iterates through the detection results and logs each detected object's label and confidence score to the console.

The application shows the fundamental workflow for event-driven object detection, including brick initialization, callback registration, and result handling.

## Bricks Used

- **`VideoObjectDetection`**: Continuously analyzes frames from the camera feed and fires a callback whenever objects are detected above the specified confidence threshold.

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

- **Initializing the VideoObjectDetection brick.**

The Python® script instantiates the `VideoObjectDetection` brick with a confidence threshold and a debounce time:

```python
    CONFIDENCE_THRESHOLD = 0.5
    detection_stream = VideoObjectDetection(confidence=CONFIDENCE_THRESHOLD, debounce_sec=0.0)
```

Only detections with a confidence score equal to or above `CONFIDENCE_THRESHOLD` are reported. The `debounce_sec` parameter controls the minimum time between successive callbacks.

The framework automatically selects the first available camera based on priority order (CSI > USB). If no camera is found, an exception is raised.

- **Defining the detection callback.**
A callback function is defined to handle detection results. It iterates through all detected objects and logs their label and confidence score:

```python
def send_detections_to_console(detections: dict):
    for key, values in detections.items():
        for value in values:
            logger.info(f"Detected {key} with confidence {value.get('confidence', 'N/A')}")
```

- **Registering the callback.**

The callback is registered with the brick so it is called automatically whenever objects are detected in the video stream:

```python
detection_stream.on_detect_all(send_detections_to_console)
```

- **Running the application.**

The application is started and kept alive with:

```python
App.run()
```

The high-level data flow looks like this:

```
Camera Hardware → VideoObjectDetection Brick → Detection Callback → Console Log
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component handles brick initialization, callback registration, and detection result logging.

- **`from arduino.app_utils import App, Logger`:** Imports the `App` class to manage the application lifecycle and the `Logger` class to log messages to the console.

- **`from arduino.app_bricks.video_objectdetection import VideoObjectDetection`:** Imports the `VideoObjectDetection` brick to run object detection on the live video stream.

- **`CONFIDENCE_THRESHOLD = 0.5`:** Sets the minimum confidence score required for a detection to be reported.

- **`VideoObjectDetection(confidence=CONFIDENCE_THRESHOLD, debounce_sec=0.0)`:** Instantiates the brick with the specified confidence threshold and no debounce delay between callbacks.

- **`send_detections_to_console(detections: dict)`:** Callback function that receives a dictionary of detected objects (keyed by label) and logs each one with its confidence score.

- **`detection_stream.on_detect_all(send_detections_to_console)`:** Registers the callback to be invoked every time the brick detects one or more objects in the video stream.

- **`App.run()`:** Starts the application event loop, keeping the program running and the brick active.

## Related Inspirational Examples
- Object Hunting
- Person classifier on camera
