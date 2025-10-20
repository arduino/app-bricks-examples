# Image Classification
The **Image Classification** example lets you perform image classification using a pre-trained neural network model. It features a web-based interface that allows you to upload images for classification, set the confidence threshold and see the inference results.

![Image classification Example](assets/docs_assets/thumbnail.png)

## Description
This example uses a pre-trained model to classify images into various categories. The workflow involves uploading an input image, processing it through the model, and displaying the top predicted classes along with their corresponding probabilities. The code is structured to be easily adaptable to different models.

The `assets` folder contains some static images and a CSS style sheet for the web interface. In the `python` folder, you will find the main script.

This example only uses the Arduino UNO Q CPU for running the application, as no C++ sketch is present in the example structure. 

## Bricks Used

The image classification example uses the following Bricks:

- `imageclassification`: Brick to classify objects within an image. 
- `web_ui`: Brick to create a web interface to display the image classification dashboard.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® to USB-A Cable (x1)
- Personal computer with internet access

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the app.
2. Open the app in your browser.
3. Upload an image you want to analyze.
4. Adjust the confidence threshold slider to set the minimum detection confidence.
5. Click the **Run classification** button to run the image classification.
6. View the classification results, which display the predicted categories and their confidence scores.

## How it Works

Once the application is running, you can access it from your web browser by navigating to `<UNO-Q-IP-ADDRESS>:7000`. At that point, the device begins performing the following:

- **Initial Setup**:
  - Loads the `image_classification` and `web_ui` Bricks.
  - Applies custom Arduino-themed CSS for styling to the web UI.

- **User Interface**:
  - Split into two columns:
    - **Left**: Image upload area and classification results table.
    - **Right**: Confidence slider and control buttons:
      - `Run classification`
      - `Run again`
      - `Upload a new image`

- **Image Upload + Display**:
  - Supports JPG and PNG image uploads.
  - Displays the uploaded image and a results table showing class names and confidence scores after inference.

- **Classification Execution**:
  - Triggered when the user clicks **Run classification**.
  - The uploaded image is processed with the configured confidence threshold.
  - Inference time is logged in the console.
  - Results are saved to `session_state` and re-rendered in the UI.

## Understanding the Code

Here is a brief explanation of the application script (main.py):

The App imports the Bricks and Python modules:

```python
from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.imageclassification import ImageClassification
from PIL import Image
import io
import base64
import time

image_classification = ImageClassification()
```

The function `on_classify_image` performs the following:

  - Read inputs from the browser
  - Decode image and run inference
  - Send result (or error) back to the browser

The App initialize the web interface, set up the endpoint and starts the runtime:

```python
...

ui = WebUI()
ui.on_message('classify_image', on_classify_image)
App.run()
```

In the frontend (index.html) the App manages the display of different interfaces:

- Image drag & drop and upload button.
- Confidence control pairs a slider with a numeric input and a reset action.
- Status area shows progress/errors; `Run` and `Change Image` buttons appear contextually.

The (app.js) manages the browser-side logic of the App by doing the following:

- Initializes page elements (upload area, preview, confidence slider, buttons).
- Handles **image selection** (upload or drag & drop), shows a preview, and stores the image as base64.
- Manages the **confidence control** (slider, input, reset, tooltip).
- Connects to the backend via **Socket.IO**.
- Sends a `classify_image` request to the server when the user clicks **Run Classification**.
- Receives `classification_result` or `classification_error` and updates the UI (status message, results table, button states).
