# Detect Objects on Smartphone Camera

The **Detect Objects on Smartphone Camera** example lets you detect objects on a live feed from your smartphone's camera and visualize bounding boxes around the detections in real-time.

**Note:** This example uses your smartphone as a remote camera input. Both the Arduino UNO Q and your smartphone must be connected to the same network.

![Detect Objects on Camera](assets/docs_assets/mobile-object-detection.png)

This example uses a pre-trained model to detect objects on a live video feed provided by the **Arduino IoT Remote** mobile app. The workflow involves pairing your phone to the board via a QR code, streaming video over the network, processing it through an AI model using the `video_objectdetection` Brick, and displaying the bounding boxes around detections. The App is managed from an interactive web interface.

## Bricks Used

The example uses the following Bricks:

- `web_ui`: Brick to create a web interface to display the classification results, model controls, and the pairing QR code.
- `video_objectdetection`: Brick to classify objects within a live video feed.

## Hardware and Software Requirements

### Hardware

- [Arduino® UNO Q](https://store.arduino.cc/products/uno-q)
- Smartphone (iOS or Android)
- Personal computer with internet access (to view the Web UI)

### Software

- **Arduino App Lab** (running on the board)
- **Arduino IoT Remote App** (installed on your smartphone)

## How to Use the Example

### Arduino App Lab Setup

1. Ensure your Arduino UNO Q is powered and connected to the network.
2. Run the App in Arduino App Lab.
3. The App should open automatically in the web browser. You can open it manually via `<board-name>.local:7000`.
4. The Web UI will display a **QR Code**.

### Arduino IoT Remote Setup

5. Install the **Arduino IoT Remote** app on your smartphone from your app store.
6. Open the Arduino IoT Remote app on your phone and log in with your Arduino account.
7. Go to Devices, tap on the plus icon to set up a new device and select **Stream phone camera to UNO Q**.
    ![IoT Remote setup](assets/docs_assets/iot-remote.png)
8. Scan the QR code.
9. Once connected, the video stream from your phone will appear on the Web UI.
10. Point your phone at objects and watch as the App detects and recognizes them.

Try with one of the following objects for a special reaction:

- Cat
- Cell phone
- Clock
- Cup
- Dog
- Potted plant

## How it Works

This example hosts a Web UI that orchestrates a connection between your phone's camera and the board. The video stream is received over the network, processed using the `video_objectdetection` Brick, and results are sent back to the browser. When an object is detected, it is logged along with the confidence score (e.g. 95% potted plant).

Here is a brief explanation of the full-stack application:

### 🔧 Backend (main.py)

- **Security & Connection**:
  - Generates a random 6-digit **secret** (`generate_secret`) to secure the connection between the phone and the board.
  - Initializes a **WebSocketCamera** (`camera = WebSocketCamera(secret=secret, encrypt=True)`). This object acts as the video source.

- **App Initialization**:
  - **WebUI** (`ui = WebUI()`): Manages the frontend interface.
  - **VideoObjectDetection**: Initialized with the `camera` object (`VideoObjectDetection(camera, ...)`) to run the object detection on the phone camera stream.

- **Event Handling**:
  - **Status Updates**: Wires camera status changes (connected, streaming) to the UI.
  - **UI Connection**: When a user opens the browser (`ui.on_connect`), the backend sends the connection details (IP, port, secret) so the frontend can generate the pairing QR code.
  - **Detections**: Uses `on_detect_all` to send classification results (`content`, `confidence`, `timestamp`) to the UI.

- **Controls**:
  - Listens for `override_th` to update the detection confidence threshold dynamically.

---

### 💻 Frontend (index.html + app.js)

- **Pairing Process**:
  - Receives the `secret`, `ip`, and `port` from the backend via Socket.IO.
  - Generates a **QR Code** using `qrcode.min.js`. This code contains the credentials required for the mobile app to connect.

- **Video Feed**:
  - Once the phone connects, the interface switches from the QR code view to a live video iframe (`/embed`).

- **Feedback & Controls**:
  - **Confidence Slider**: Adjusts the sensitivity of the AI model.
  - **Visual Feedback**: Displays specific animations when target objects (e.g., "cup", "cat") are detected with high confidence.
  - **Recent Detections**: Lists the last 5 detected objects with timestamps.

---

## Understanding the Code

Once the application is running, you can open it in your browser. At that point, the device begins performing the following:

- **Serving the UI and handling Remote Camera pairing.**

    The backend generates a security code and initializes the WebSocket camera. It waits for the frontend to connect to send these details.

    ```python
    def generate_secret() -> str:
      characters = string.digits
      return ''.join(secrets.choice(characters) for _ in range(6))

    secret = generate_secret()
    ui = WebUI(use_tls=True)
    resolution = (480, 640)  # Portrait resolution for mobile devices
    camera = WebSocketCamera(resolution=resolution, secret=secret, encrypt=True, adjustments=resized(resolution, maintain_ratio=True))

    # Send connection details to UI so it can draw the QR code
    ui.on_connect(lambda sid: ui.send_message("welcome", {
        "client_name": camera.name, 
        "secret": secret, 
        "status": camera.status, 
        "protocol": camera.protocol, 
        "ip": camera.ip, 
        "port": camera.port
    }))
    ```

- **Processing video and broadcasting detections.**

    The `VideoObjectDetection` brick consumes frames from the `camera` object. When objects are found, the callback formats the data and sends it to the browser.

    ```python
    detection = VideoObjectDetection(camera, confidence=0.5, debounce_sec=0.0)

    # Register a callback for when all objects are detected
    def send_detections_to_ui(detections: dict):
      for key, value in detections.items():
        entry = {
          "content": key,
          "confidence": value.get("confidence"),
          "timestamp": datetime.now(UTC).isoformat()
        }
        ui.send_message("detection", entry)

    detection.on_detect_all(send_detections_to_ui)
    ```

- **Rendering the QR Code (Frontend).**

    In `app.js`, the frontend waits for the `welcome` message to generate the QR code that bridges the phone and the board.

    ```javascript
    socket.on('welcome', async (message) => {
        webcamState.secret = message.secret;
        // ... update state ...
        updateDisplay();
    });

    function updateDisplay() {
        if (webcamState.status != "connected") {
            // Webcam is not connected yet - show QR code
            if (webcamState.secret) {
                generateQRCode(webcamState.secret, webcamState.protocol, webcamState.ip, webcamState.port);
            }
        }
        // ... else show video iframe ...
    }
    ```

- **Executing the event loop.**

    Finally, the backend keeps the application alive, managing the network traffic between the phone, the AI model, and the browser.

    ```python
    App.run()
    ```