# Code Detector
The **Code Detector** example lets you detect and scan both barcodes and QR codes using a USB camera. It features a web-based interface that streams the live camera feed and displays the scanned codes content. Also, it stores the detected codes in a local database for future reference.

**Note:** This example requires to be run using **Network Mode** in the Arduino App Lab or in **Single-Board Computer (SBC)** mode. Because you will need a USB-C hub and a USB camera.

![Code Detector Example](assets/docs_assets/thumbnail.png)

## Description
The app captures video input from a connected USB camera and continuously scans for barcodes and QR codes. When a code is detected, its data is saved to a local SQL database. The web interface allows users to view a live list of all detected codes, including their type and timestamp, updating in real-time as new codes are scanned.

The `assets` folder contains the **database** and **frontend** components of the application. Inside, you’ll find the JavaScript source files along with the HTML and CSS files that make up the web user interface. The `python` folder instead includes the application **backend**.

This example only uses the Arduino UNO Q CPU for running the application since no C++ sketch is present in the example structure. 

## Bricks Used

The code detector example uses the following Bricks:

- `camera_code_detection`: Brick to detect barcodes and QR codes using a camera. 
- `dbstorage_sqlstore`: Brick to store the detected codes in a database.
- `web_ui`: Brick to create a web interface to display the detected codes and the camera live feed.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB camera (x1)
- USB-C® hub adapter with external power (x1)
- A power supply (5 V, 3 A) for the USB hub (e.g. a phone charger)
- Personal computer with internet access

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Connect the USB-C hub to the UNO Q and the USB camera.
  ![Hardware setup](assets/docs_assets/hardware-setup.png)
2. Attach the external power supply to the USB-C hub to power everything.
3. Run the App.
   ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
4. The App should open automatically in the web browser. You can open it manually via `<board-name>.local:7000`.
5. Detected codes will appear in real-time on the web interface, showing their type and timestamp.
6. Click *Scan another* to repeat the process
7. Review the list of scanned codes directly from your browser as new codes are detected.

## How it Works

Here is a brief explanation of the full-stack application:

### 🔧 Backend (main.py)

- Initializes a USB camera and a QR/barcode detector (`CameraCodeDetector`).

- For each frame:
  - Streams it to the frontend (`on_frame`)
  - If a code is detected:
    - Draws a bounding box
    - Encodes the image to Base64
    - Stores scan data (type, content, timestamp, image) in a SQLite database
    - Sends the scan result to the frontend (`code_detected`)

- Exposes:
  - **WebSocket**: reset detection (`reset_detection`) for starting a new scan.
  - **REST API**: list last 5 scans (`/list_scans`) stored in the database.
- Runs with `App.run()` which handles the internal event loop.

### 💻 Frontend (index.html + app.js)

- Connects to the backend using `Socket.IO`.
- Renders:
  - Live video feed from the USB camera (`frame_detected`)
  - Last detected code with timestamp and copy/link icon (`code_detected`)
  - List of last 5 scans (`/list_scans` API)

- User can trigger a rescan with a button (`rescan()`).
- Uses `<canvas>` to display images and decodes *Base64* image data.

## Understanding the Code

Once the application is running, you can access it from your web browser by navigating to `<UNO-Q-IP-ADDRESS>:7000`. At that point, the device begins performing the following:

- **Continuously capturing frames from the connected USB camera.**

    The following module provides a convenient way to integrate the camera into the application using a custom OpenCV-based class:
    
    ```python
    from arduino.app_peripherals.usb_camera import USBCamera
    ```

    To start capturing frames, initialize the camera with:
    
    ```python
    camera = USBCamera(resolution=(640, 480), fps=60)
    ```
- **Searching for codes and processing the camera frames.**
    
    The following Brick provides barcodes and QR codes detection capabilities:

    ```python
    from arduino.app_bricks.camera_code_detector import CameraCodeDetector, Detection, draw_bounding_box
    ```
    The `CameraCodeDetector` class takes the previously captured camera frame to search for codes in it.
    ```python
    detector = CameraCodeDetector(camera)
    ```
    The following callback functions handle the different results of the code detector Brick.

    `detector.on_detect(on_code_detected)`: When a barcode or QR code is detected in a frame, the handler draws a bounding box around it, encodes the frame as a Base64 image, stores the code content along with metadata in the database, and sends the result to the web UI in real time.

    `detector.on_frame(on_frame)`: Handles every frame captured by the camera, encodes it as a Base64 image, and streams it to the web UI for live video display.

    `detector.on_error(on_error)`: Handles exceptions from the detector.
   
- **Deploying and rendering the web UI.**

    The following Brick imports the web user interface.
    ```python
    from arduino.app_bricks.web_ui import WebUI
    ```

    The web UI is deployed and exposed to the local network through the `webUI` class.

    ```python
    ui = WebUI()
    ui.expose_api('GET', '/list_scans', on_list_scans)
    ui.on_message('reset_detection', reset_detection)
    ```

    - The `on_list_scans` function, returns the database stored codes to be shown in the UI.
    - The `reset_detection` function handles the UI button to restart the code scanning process.

