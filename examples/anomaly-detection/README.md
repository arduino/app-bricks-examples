# Concrete Crack Detector

The **Concrete Crack Detector** uses a pre-trained machine learning model to identify cracks and structural defects in concrete surfaces. It provides a web-based interface where users can either upload their own images or select from pre-loaded sample images of concrete surfaces, adjust detection sensitivity, and receive visual results with highlighted crack locations marked by red squares, each with a confidence-based intensity.

![Concrete Crack Detector](assets/docs_assets/visual-anomaly-detection.png)

## Description

The App uses the `VisualAnomalyDetection` Brick to analyze images of concrete surfaces and identify structural anomalies, such as cracks, defects, and deterioration. The system processes images through a trained model and returns visual results, with detected cracks highlighted using red markers. The darker shades indicate higher confidence levels.

The web interface features sample image selection from pre-loaded concrete surface examples and direct image file upload with drag-and-drop functionality. Users can adjust the confidence threshold to fine tune detection sensitivity and download the annotated results for further analysis or documentation purposes.

## Bricks Used

The concrete crack detector example uses the following Bricks:

- `visual_anomaly_detection`: Brick to detect cracks and structural defects in concrete surfaces using computer vision and machine learning.
- `web_ui`: Brick to create a web interface with image upload capabilities, confidence controls, and real-time result visualization.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App

![Run the App](assets/docs_assets/launch-app.png)

2. The App should open automatically in the web browser. You can open it manually via `<board-name>.local:7000`.
3. Choose your image input method:

- **Image from sample**: Select from pre-loaded concrete surface images (includes examples with and without cracks)
- **Upload Image**: Upload your own JPG or PNG image file (maximum of 500 KB) using drag-and-drop or file selection

4. Adjust the confidence threshold using the slider (0.0 to 1.0) to set the minimum detection confidence level
5. Click **Run Detection** to analyze the concrete surface
6. View the detection results showing:

- Original image with red square markers highlighting detected cracks
- Marker intensity corresponds to detection confidence (darker red = higher confidence)
- Processing time and detection count

7. Use **Download** button to save the highlighted result image, or **Change Image** to analyze additional surfaces

## How it Works

Once the application is running, the device performs the following operations:

- **Processing concrete surface images through anomaly detection.**

The `visual_anomaly_detection` Brick handles crack detection analysis:

```python
from arduino.app_bricks.visual_anomaly_detection import VisualAnomalyDetection

anomaly_detection = VisualAnomalyDetection()
results = anomaly_detection.detect(pil_image)
```

The detection system processes images through a trained model optimized for identifying structural anomalies in concrete surfaces.

- **Applying visual markers to highlight detected cracks.**

The system uses a utility function to overlay detection results:

```python
from arduino.app_utils import draw_anomaly_markers

img_with_markers = draw_anomaly_markers(pil_image, results)
```

Red square markers are applied to detected crack locations, with marker intensity reflecting the confidence level of each detection.

- **Managing dual image input modes.**

The system supports both sample image selection and file upload:

```python
if image_data:
    image_bytes = base64.b64decode(image_data)
    pil_image = Image.open(io.BytesIO(image_bytes))
```

Users can either select from pre-loaded concrete surface samples or upload custom images for analysis.

- **Providing real-time detection results via WebSocket.**

The `web_ui` Brick allows for communication between frontend and backend:

```python
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()
ui.on_message('detect_anomalies', on_detect_anomalies)
ui.send_message('detection_result', response)
```

Results are sent with highlighted images, detection counts, and processing metrics.

The high-level data flow looks like this:

```
Concrete Image Input → Anomaly Detection Model → Visual Markers → WebSocket Results → Annotated Image Display
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component handles image processing and anomaly detection functionality.

- **`VisualAnomalyDetection` integration**: Initializes the crack detection model for analyzing concrete surface images and identifying structural anomalies with confidence scoring.

- **`on_detect_anomalies()` handler**: Processes detection requests, handles `base64` image decoding, applies the detection model, measures processing time, and formats results for frontend display.

- **`draw_anomaly_markers()` function**: Applies visual markers to detected crack locations, using red squares with intensity based on confidence levels to create annotated result images.

- **Image processing pipeline**: Converts uploaded images to PIL format, processes them through the detection model, applies visual markers, and encodes results back to `base64` for web information.

- **Result formatting**: Returns structured responses with annotated images, detection counts, processing time metrics, and appropriate error handling for failed detections.

### 🔧 Frontend (`index.html` + `app.js`)

The web interface provides comprehensive image upload and crack detection functionality.

- **Dual input modes**: Switches between sample concrete image grid display and file upload interface with drag-and-drop support for JPG/PNG files up to 500 KB.

- **Sample image management**: Displays pre-loaded concrete surface images categorized by crack presence, with visual selection indicators and an organized grid layout for easy browsing.

- **Confidence controls**: Interactive slider with numerical input synchronization, visual progress indication, and reset functionality for threshold adjustment between 0.0 and 1.0.

- **Image upload handling**: Supports drag-and-drop and file dialog selection, validates image file types and sizes, and provides a visual preview of uploaded images.

- **WebSocket communication**: Handles `detect_anomalies` events for sending image data and confidence settings, receives `detection_result` responses with annotated images, and manages connection status with error display.

- **Results visualization**: Displays detection results with annotated crack markers, provides download functionality for saving results, and shows processing metrics and detection counts.

- **UI state management**: Controls button states (initial, ready, detecting, completed), manages element visibility based on detection mode, and provides visual feedback for user interactions and processing status.

- **Download functionality**: Enables users to save annotated result images with detected crack markers for documentation or further analysis purposes.