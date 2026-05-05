# Camera Stream

The **Camera Stream** example demonstrates how to stream a live camera video feed from the device to the Web UI using the WebUI brick and the Camera peripheral.

**Note:** This example needs a camera. You can use a USB camera or a CSI camera with the Arduino Media Carrier. Please note that it may be run in **Network Mode** in the Arduino App Lab if used with a USB-C hub and a USB camera.

## Description

This example shows how to use the WebUI brick together with the Camera peripheral to expose a live video stream from the Python backend to the Web UI frontend. The application initializes a web server that serves the frontend files from the `assets` folder and exposes the camera feed on a dedicated endpoint that can be embedded directly in the browser interface. 

The framework automatically selects the first available camera based on priority order (CSI > USB). If no camera is found, an exception is raised.

The `assets` folder contains the **frontend** components of the application, including HTML and CSS files along with JavaScript files that make up the web user interface. The `python` folder includes the application **backend** which captures frames from the camera and streams them to the UI.

## Bricks Used

This example uses the following Bricks:

- `web_ui`: Brick to create a web interface and expose the camera stream on a dedicated endpoint.

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

**Note:** You can run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

### USB Camera set-up
1. Connect the USB-C hub to the UNO Q and the USB camera.
  ![Hardware setup](assets/docs_assets/hardware-setup.png)
2. Attach the external power supply to the USB-C hub to power everything.
3. Run the App.
   ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
4. Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000`
5. The web page will display the live camera stream

### CSI Camera set-up
1. Connect the Arduino Media Carrier and a CSI camera
2. Run the App
    ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
3. Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000`
4. The web page will display the live camera stream    

## How it Works

Once the application is running, the device performs the following operations:

- **Initializing the Camera peripheral:** The Camera peripheral is configured with a resolution of 640×480 pixels and a frame rate of 15 frames per second. The framework automatically selects the first available camera based on priority order (CSI > USB). If no camera is found, an exception is raised.
- **Initializing the WebUI server:** The WebUI brick starts a web server on port 7000, serving content from the `assets` folder.
- **Exposing the camera stream:** The camera feed is exposed on the `/camera` endpoint of the Web UI, making it accessible from the frontend as a standard MJPEG stream.
- **Displaying the stream:** The frontend embeds the stream using an `<img>` tag with its `src` attribute set to `/camera`, rendering the live video in the browser.

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python code demonstrates how to capture and stream camera frames to the Web UI:

- **`from arduino.app_utils import *`:** Imports the required application utilities.

- **`from arduino.app_bricks.web_ui import WebUI`:** Imports the WebUI brick class for managing the web server.

- **`from arduino.app_peripherals.camera import Camera`:** Imports the Camera class to manage the camera peripheral.

- **`camera = Camera(resolution=(640, 480), fps=15)`:** Initializes the camera peripheral with a resolution of 640×480 pixels and a frame rate of 15 frames per second.

- **`ui = WebUI()`:** Initializes the web server. By default, it serves all content from the `assets` folder of the application.

- **`ui.expose_camera("/camera", camera)`:** Exposes the camera stream on the `/camera` endpoint of the Web UI, allowing it to be accessed from the UI using an `<img>` tag with the `src` attribute set to `"/camera"`.

- **`App.run()`:** Starts the application.

### 🔧 Frontend (`index.html`)

The frontend is a simple HTML page that displays the camera stream:

- **`<img src="/camera">`:** Embeds an image element that displays the live camera stream from the `/camera` endpoint exposed by the backend. The browser automatically handles the MJPEG stream and renders the live video feed.

## Related Inspirational Examples
- Color your LEDs 
