# Object Detection
The **Object Detection** example lets you perform object detection using a pre-trained machine learning model. It shows how to process input images, run inference, and visualize detected objects with bounding boxes and labels.

![Object Detection Example](assets/docs_assets/thumbnail.png)

## Description
This example uses a pre-trained model to detect objects in an uploaded image. The workflow involves uploading the input image, running it through the model, drawing bounding boxes around detected objects, and labeling each inference with its corresponding class name. The code is structured for easy adaptation to different models.

The `assets` folder contains some static images and a CSS style sheet for the web interface. In the python folder, we find the main script.

This example only uses the Arduino UNO Q CPU for running the application, as no C++ sketch is present in the example structure. 

## Bricks Used

The code detector example uses the following Bricks:

- `objectdetection`: Brick to identify objects within an image. 
- `web_ui`: Brick to create a web interface.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® to USB-A Cable (x1)
- Personal computer with internet access

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and monitor attached.

## How to Use the Example

1. Run the app.
2. Open the app in your browser.
3. Upload an image you want to analyze.
4. Adjust the confidence threshold slider to set the minimum detection confidence.
5. Click the **Run detection** button to run object detection.
6. View the results with detected objects highlighted by bounding boxes and labels.

## How it Works

Once the application is running, you can access it from your web browser by navigating to `<UNO-Q-IP-ADDRESS>:7000`. At that point, the device begins performing the following:

- **Initial Setup**:
  - Loads the `object_detection` and `web_ui` Bricks.
  - Applies custom Arduino-themed CSS for styling to the web UI.

- **User Interface**:
  - Split into two columns:
    - **Left**: Image upload area and result display with bounding boxes.
    - **Right**: Confidence threshold slider and action buttons:
      - `Run detection`
      - `Run again`
      - `Change image`

- **Image Upload + Display**:
  - Supports JPG and PNG image uploads.
  - Once detection is complete, it draws bounding boxes on the image and displays it.

- **Detection Execution**:
  - Triggered when the user clicks **Run detection**.
  - The image is passed to the model with the selected confidence threshold.
  - Results are stored in session state and displayed on the page.
  - Inference time is printed to the console.

## Understanding the Code

Here is a brief explanation of the application script (main.py):

```python
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.objectdetection import ObjectDetection
from PIL import Image
import io
import base64
import time

object_detection = ObjectDetection()
```

The function `on_detect_objects` performs the following:

  - Read inputs from the browser
  - Decode image and run inference
  - Draw bounding boxes to overlay detected objects in the image.
  - Send result (or error) back to the browser

The App initialize the web interface, set up the endpoint and starts the runtime:

```python
...

ui = WebUI()
ui.on_message('detect_objects', on_detect_objects)
App.run()
```

In the frontend (index.html) the App manages the display of different interfaces:

- Image drag & drop and upload button.
- Confidence control pairs a slider with a numeric input and a reset action.
- Status area shows progress/errors; `Run` and `Change Image` buttons appear contextually.

The (app.js) manages the browser-side logic of the App by doing the following:

- Initializes page elements (upload area, preview, confidence slider, Detect/Upload/Download buttons, result title).
- Handles **image selection** (upload or drag & drop), shows a preview, and stores the image as base64.
- Manages the **confidence control** (slider, input, reset, tooltip).
- Connects to the backend via **Socket.IO**.
- Sends a `detect_objects` request to the server when the user clicks **Run Detection**.
- Receives `detection_result` or `detection_error`; on success, displays the annotated result image and shows a success status.
- Controls UI states, including showing/hiding **Run Again**, **Change Image**, and **Download** actions.
- Supports **downloading** the annotated result as a PNG and resetting the view when changing images.