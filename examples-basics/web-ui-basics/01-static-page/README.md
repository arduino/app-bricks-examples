# Simple web page

The **Simple web page** example shows a simple Linux application that offers a web-based user interface.

## Description

This example demonstrates how to serve a simple static web page using the WebUI brick. The application serves HTML, CSS, and JavaScript files from the `assets` folder, making them accessible through a web browser. This provides a foundation for building web-based interfaces to interact with the application.

The `assets` folder contains the **frontend** components of the application, including HTML and CSS files along with JavaScript files that make up the web user interface. The `python` folder includes the application **backend**.

## Bricks Used

The Linux blink example uses the following Bricks:

- `web_ui`: Brick to create a web interface to display the LED control toggle switch.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App
   ![Arduino App Lab - Run App](assets/docs_assets/app-lab-run-app.png)
2. Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000`
3. The static web page will be displayed in your browser

## How it Works

Once the application is running, the device performs the following operations:

- **Serving static web content.**

The `web_ui` Brick initializes a web server and automatically serves static files from the `assets` folder. When a browser connects to the application at `<UNO-Q-IP-ADDRESS>:7000`, it receives the HTML, CSS, and JavaScript files.

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python code is minimal and straightforward:

- **`from arduino.app_utils import *`:** Imports the required application utilities.

- **`from arduino.app_bricks.web_ui import WebUI`:** Imports the WebUI brick class for managing the web server.

- **`ui = WebUI()`:** Initializes the web server. By default, it serves all content from the `assets` folder of the application.

- **`App.run()`:** Starts the application and begins serving web requests.

### 🔧 Frontend (`index.html` + `app.js`)

## Related Inspirational Examples
- Color your LEDs 
