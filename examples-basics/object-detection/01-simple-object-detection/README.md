# Simple Object Detection
The **Simple Object Detection** example lets you perform object detection using a pre-trained machine learning model. It shows how to process input images, run inference, and visualize detected objects with bounding boxes and labels.

## Description
This example uses a pre-trained model to detect objects in a static input image. The workflow involves loading the image from disk, running it through the model, logging the detected objects with their labels and confidence scores, and saving the annotated image with bounding boxes to disk. The code is structured for easy adaptation to different images or models.

The `assets` folder contains the input image used for detection. In the python folder, we find the main script.

This example only uses the Arduino UNO Q CPU for running the application, as no C++ sketch is present in the example structure.

## Bricks Used

The simple object detection example uses the following Bricks:

- `object_detection`: Brick to identify objects within an image.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® to USB-A Cable (x1)
- Personal computer with internet access

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and monitor attached.

## How to Use the Example

1. Optionally, place the image you want to analyze in the `assets` folder and update `IMAGE_FILE` in the script, otherwise a default immage is provided.
2. Optionally, adjust `CONFIDENCE_THRESHOLD` in the script to set the minimum detection confidence.
3. Run the app.
4. Observe the detection results printed to the console.
5. Find the annotated output image saved as `output_image.png` in the working directory.

## How it Works

Once the application is running, it enters a continuous loop performing the following:

- **Initial Setup**:
  - Loads the `object_detection` Brick.
  - Opens the input image from the `assets` folder using PIL.

- **Detection Execution** (runs every 60 seconds):
  - The image is passed to the model with the selected confidence threshold.
  - Logs the number of detected objects and the inference time in milliseconds.
  - Iterates over each detection and logs its class label and confidence score.

- **Result Saving**:
  - Draws bounding boxes around all detected objects on the original image.
  - Saves the annotated image as `output_image.png` in the working directory.

## Understanding the Code

### 🔧 Python script (`main.py`)

Here is a brief explanation of the application script (main.py):

#### Initialization

- **`ObjectDetection()`** initializes the object_detection brick.
- **`PATH_IMAGE`, `IMAGE_FILE`, and `CONFIDENCE_THRESHOLD`** configures the input image path and the minimum confidence required to report a detection.

#### Execution

- **`results = object_detection.detect(pil_image, confidence=CONFIDENCE_THRESHOLD) `** Analyze the loaded image using the confidence threshold.
- **`logger.info(f"Detected {len(results.get('detection', []))} objects in the image in {diff:.2f} ms.")`** Logs how many objects were found and the elapsed inference time.
- **`for idx, detection in enumerate(results.get("detection", [])):`** Iterates over each detected object.
- **`label = detection.get("class_name", "unknown")`** Get the label of the detected object if present, otherwise assign `unknown`.
- **`logger.info(f"Object {idx}: Label={label}, Confidence={confidence}")`** Logs `class_name` and `confidence` of detected object.
- **`img_with_boxes = object_detection.draw_bounding_boxes(pil_image, results)`** Overlay bounding boxes on the original image and saves the result as `output_image.png`.
