
# Glass Breaking Sensor

The **Glass Breaking Sensor** uses a pre-trained machine learning model to classify audio files and detect glass breaking sounds. It provides a web-based interface where users can either upload their own WAV audio files or select from pre-loaded sample audio files, adjust detection confidence levels, and receive real-time classification results with confidence scores.

![Glass Breaking Sensor](assets/docs_assets/audio-classification.png)

## Description

The application uses the `AudioClassification` Brick to analyze audio files and identify specific sound patterns, particularly glass breaking events. Users can interact with the system through a web interface that supports both file upload and sample audio selection. The system processes audio files using a trained model and returns classification results, including confidence scores and processing time metrics.

The web interface features sample audio selection from pre-loaded files and direct audio file upload with drag-and-drop functionality. Users can adjust the confidence threshold using an interactive slider to fine tune detection sensitivity and view detailed classification results in real-time.

## Bricks Used

The glass breaking sensor example uses the following Bricks:

- `audio_classification`: Brick to classify audio files using a pre-trained model for sound detection and analysis.
- `web_ui`: Brick to create a web interface with audio upload capabilities, confidence controls, and real-time result display.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** This example works with pre-loaded sample audio files and uploaded audio files. No external hardware peripherals are required. The example works in [Network Mode](https://docs.arduino.cc/tutorials/uno-q/user-manual/#network-mode) as well.

## How to Use the Example

1. Run the App

![Run the App](assets/docs_assets/launch-app.png)

2. The App should open automatically in the web browser. You can also open it manually via `<board-name>.local:7000` or `http://<board-ip-address>:7000` (Network Mode).
3. Choose your audio input method:

- **Audio from sample**: Select from pre-loaded sample audio files (includes glass breaking examples and background noise)
- **Upload Audio**: Upload your own WAV audio file (max 10MB) using drag-and-drop or file selection

4. Adjust the confidence threshold using the slider (0.0 to 1.0) to set the minimum detection confidence level
5. Click **Run Classification** to analyze the audio file
6. View the classification results showing:

- Detected class name
- Confidence percentage
- Processing time in milliseconds

7. Use **Clear and upload** to test additional audio files or **Run Again** to reprocess with different confidence settings

## How it Works

Once the application is running, the device performs the following operations:

- **Processing audio input through machine learning classification.**

The `audio_classification` Brick handles audio file analysis:

```python
 from arduino.app_bricks.audio_classification import AudioClassification
 
 classifier = get_audio_classifier()
 results = classifier.classify_from_file(input_audio, confidence)
```

The classification system processes WAV audio files through a pre-trained model optimized for sound detection, particularly glass breaking events.

- **Handling dual audio input modes.**

The system supports both sample audio selection and file upload:

```python
 if audio_data:
    audio_bytes = base64.b64decode(audio_data)
    input_audio = io.BytesIO(audio_bytes)
 elif selected_file:
    file_path = os.path.join(AUDIO_DIR, selected_file)
    with open(file_path, "rb") as f:
    input_audio = io.BytesIO(f.read())
```

Users can either select from pre-loaded sample files or upload custom WAV files for analysis.

- **Providing real-time classification results via WebSocket.**

The `web_ui` Brick allows real-time communication between frontend and backend:

```python
 from arduino.app_bricks.web_ui import WebUI
 
 ui = WebUI()
 ui.on_message('run_classification', on_run_classification)
 ui.send_message('classification_complete', response_data, sid)
```

Results are sent to the web interface with detailed classification information and performance metrics.

- **Managing confidence threshold and result filtering.**

The system applies user-defined confidence levels to filter detection results:

```python
 confidence = parsed_data.get('confidence', 0.5)
 results = classifier.classify_from_file(input_audio, confidence)
```

Users can adjust sensitivity to balance between detection accuracy and false positive rates.

The high-level data flow looks like this:

```
Audio File Input → Audio Classification Model → WebSocket Results → Web Interface Display
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component handles audio classification and web service functionality.

- **`AudioClassification` integration**: Initializes the audio classification model for file-based classification. The example processes pre-recorded audio files (uploaded or from samples).

- **`parse_data()` function**: Handles WebSocket message parsing, supporting both JSON string and dictionary formats for flexible client communication.

- **`on_run_classification()` handler**: Processes classification requests, handles both uploaded files (base64 encoded) and sample file selection, applies confidence thresholds, and measures processing time.

- **File management**: Supports sample audio files from `/app/assets/audio` directory and handles uploaded WAV files through base64 decoding and BytesIO streaming.

- **Result formatting**: Returns structured responses with classification results, confidence scores, processing time, and appropriate error handling for failed detections.

### 🔧 Frontend (`index.html` + `app.js`)

The web interface provides audio upload and classification functionality.

- **Dual input modes**: Switches between sample audio grid display and file upload interface with drag-and-drop support for WAV files up to 10 MB.

- **Sample audio management**: Displays pre-loaded audio files with built-in audio players, visual selection indicators, and automatic playback coordination (stops other players when one starts).

- **Confidence controls**: Interactive slider with numerical input synchronization, visual progress indication, and reset functionality for threshold adjustment between 0.0 and 1.0.

- **File upload handling**: Supports drag-and-drop and file dialog selection, validates audio file types, displays file information (which includes name and size), and provides audio preview with controls.

- **WebSocket communication**: Handles `run_classification` events for sending audio data and confidence settings, receives `classification_complete` responses with results, and manages connection status with error display.

- **Results visualization**: Displays classification results in a formatted table with class names and confidence percentages, shows processing time metrics, and provides options to run again or upload new files.

- **UI state management**: Manages button states (initial, ready, classifying, completed), controls element visibility based on current mode, and provides visual feedback for user interactions and system status.
