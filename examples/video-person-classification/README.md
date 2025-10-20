# Person Classifier on Camera

The **Person Classifier** example lets you detect people on a live feed from a camera and visualize the model inference result on a user-friendly web interface.

**Note:** This example requires to be run using **Network Mode** in the Arduino App Lab or in **Single-Board Computer (SBC)** mode. Because you will need a USB-C hub and a USB camera.

![Person Classifier on Camera](assets/docs_assets/person-classification.png)

This example uses a pre-trained model to detect people on a live video feed from a camera. The workflow involves continuously getting the frames from a USB camera, processing it through an AI model using the `video_imageclassification` Brick, and displaying the classification along with their corresponding probabilities. The code is structured to be easily adaptable to different models.


## Brick Used

The example uses the following Bricks:

- `web_ui`: Brick to create a web interface to display the classification results and model controls.
- `video_imageclassification`: Brick to classify objects within a live video feed from a camera.
  
## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB camera (x1)
- USB-C® hub adapter with external power (x1)
- A power supply (5 V, 3 A) for the USB hub (e.g. a phone charger)
- Personal computer with internet access

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single-Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and monitor attached.

## How to Use the Example

1. Connect the USB-C hub to the UNO Q and the USB camera.
  ![Hardware setup](assets/docs_assets/hardware-setup.png)
2. Attach the external power supply to the USB-C hub to power everything.
3. Run the App.
   ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
4. The App should open automatically in the web browser. You can open it manually via `<board-name>.local:7000`.
5. Position yourself in front of the camera and watch as the App detects and recognizes a person.
   
## How it Works

This example hosts a Web UI where we can see the video input from the camera connected via USB. The video stream is then processed using the `video_imageclassification` Brick. When a person is detected, it is logged along with the confidence score (e.g. 95% person).

Here is a brief explanation of the full-stack application:

### 🔧 Backend (main.py)

- Initializes the app Bricks:
  - **WebUI** (`ui = WebUI()`): channel to push messages to the frontend.
  - **VideoImageClassification** (`detection_stream = VideoImageClassification()`): runs object detection on the video stream.

- Wires detection events to actions using callbacks:
  - `on_detect("person", person_detected)`: when a **person** is detected, logs `"Detected a person!!!"`.
  - `on_detect_all(send_detections_to_ui)`: for **every detection batch**, builds a JSON list with:
    - `content`: label of the detected object  
    - `confidence`: detection confidence score  
    - `timestamp`: ISO 8601 UTC timestamp  
    Then sends the JSON to the UI.

- Exposes:
  - **Realtime messaging**: publishes detection updates to the frontend via `ui.send_message("classifications", message=<json>)` so the UI can display live classifications.

- Runs with `App.run()` which starts the internal event loop and keeps the detection stream and UI messaging alive.

### 💻 Frontend (index.html + app.js)

- Connects to the backend using **Socket.IO** (`io()`).
- Renders:
  - A **video feed iframe** with placeholder when the webcam is not yet available.
  - A **confidence control panel** with slider and numeric input to adjust detection threshold.
  - A **feedback section** that shows animated responses when detections occur.
  - A **recent detections list** displaying the latest classifications with confidence percentage and timestamp.

- Manages:
  - Automatic retry logic to load the video stream into the iframe.
  - Dynamic update of the confidence slider and input with real-time visual feedback.
  - Popover tooltips that explain the confidence threshold and feedback behavior.

- Wires:
  - **Socket events** (`classifications`) to update the feedback section and populate the recent detections list.
  - **UI controls** (slider, input, reset button) to adjust and reset the confidence threshold interactively.
  - **Connection status** to display an error message when the link to the backend is lost.

## Understanding the Code

Once the application is running, you can open it in your browser by navigating to `<BOARD-IP-ADDRESS>:7000`.  
At that point, the device begins performing the following:

- Serving the **video classification UI** and exposing realtime transports.

    The UI is hosted by the `WebUI` Brick and communicates with the backend via WebSocket (Socket.IO).  
    The backend pushes classification messages whenever new objects are detected.

    ```python
    from arduino.app_bricks.web_ui import WebUI
    from arduino.app_bricks.video_imageclassification import VideoImageClassification
    
    ui = WebUI()
    detection_stream = VideoImageClassification()

    detection_stream.on_detect("person", person_detected)      # single-class callback
    detection_stream.on_detect_all(send_detections_to_ui)      # all-classes callback
    ```

    - `person` (event): triggers a simple callback printing `"Detected a person!!!"`.
    - `classifications` (WebSocket message): JSON list with label, confidence, and timestamp sent to the UI.

- Processing detections and broadcasting updates.

    When the video model detects objects, the backend:

    1. Collects all current classifications with their confidence scores.
    2. Attaches an ISO 8601 UTC timestamp.
    3. Builds a JSON message and publishes it to the frontend channel `classifications`.

    ```python
    def send_detections_to_ui(classifications: dict):
    if len(classifications) == 0:
        return
        
    entries = []
    for key, value in classifications.items():
        entry = {
        "content": key,
        "confidence": value,
        "timestamp": datetime.now(UTC).isoformat()
        }
        entries.append(entry)    
    
    if len(entries) > 0:
        msg = json.dumps(entries)
        ui.send_message("classifications", message=msg)
    ```

- Rendering and interacting on the frontend.

    The **index.html + app.js** bundle defines the interface:

    - A **video feed iframe** attempts to connect to the embedded camera stream (`/embed`).
    - A **confidence control** (slider + input) lets the user adjust the detection threshold.
    - A **feedback section** displays animated messages when a person is classified.
    - A **recent detections list** shows the latest entries with percentage and timestamp.

    ```javascript
    const socket = io(`http://${window.location.host}`);

    socket.on('classifications', (message) => {
        printClassifications(message);   // update history
        renderClasses();                 // redraw the list
        updateFeedback(true);            // show greeting animation
    });
    ```

    - `classifications` (WebSocket): received whenever the backend publishes detection results.
    - Confidence slider and reset button dynamically adjust the filtering threshold in the UI.
    - If the connection drops, an error message is shown in the frontend (`error-container`).

- Executing the event loop.

    Finally, the backend keeps everything alive with:

    ```python
    App.run()
    ```

    This maintains the video classification stream, event callbacks, and WebSocket communication with the frontend.
