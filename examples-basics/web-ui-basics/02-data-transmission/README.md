# Data Transmission

The **Data Transmission** example demonstrates how to send dynamic messages from Python to the Web UI and update the interface with real-time data.

## Description

This example shows how to use the WebUI brick to send messages from the Python backend to the Web UI frontend, enabling dynamic content updates. The application initializes a web server that serves the frontend files from the `assets` folder and establishes a communication channel to push data from Python to the browser interface.

The `assets` folder contains the **frontend** components of the application, including HTML and CSS files along with JavaScript files that make up the web user interface. The `python` folder includes the application **backend** which sends dynamic messages to update the UI.

## Bricks Used

This example uses the following Bricks:

- `web_ui`: Brick to create a web interface and send dynamic messages from the backend to the frontend.

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
3. The web page will be displayed and will automatically update with new counter values every 10 seconds

## How it Works

Once the application is running, the device performs the following operations:

- **Initializing the WebUI server:** The WebUI brick starts a web server on port 7000.
- **Tracking client connections:** The application monitors when clients connect to and disconnect from the Web UI, using callback functions to track the connection state.
- **Sending periodic messages:** When a client is connected, the application enters a loop that executes every 10 seconds, sending a message containing a counter value to the frontend via the `message` event.
- **Dynamic UI updates:** The frontend receives the message and updates the displayed content with the latest counter value in real-time.
- **Connection management:** Messages are only sent when at least one client is actively connected, optimizing resource usage by stopping transmission when no clients are present.

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python code demonstrates message transmission from backend to frontend with connection management:

- **`from arduino.app_utils import *`:** Imports the required application utilities.

- **`from arduino.app_bricks.web_ui import WebUI`:** Imports the WebUI brick class for managing the web server.

- **`ui = WebUI()`:** Initializes the web server. By default, it serves all content from the `assets` folder of the application.

- **`connected = False`:** Initializes a variable to track whether a client is currently connected to the Web UI.

- **`counter = 0`:** Initializes a counter variable to track the number of messages sent.

- **`def loop():`:** Defines a continuous loop function that checks the connection state and sends messages only when a client is connected.

- **`if connected:`:** Conditional check to ensure messages are only sent when a client is actively connected.

- **`ui.send_message("message", {...})`:** Sends a message with the event name `"message"` and a dictionary containing the counter data to all connected clients.

- **`time.sleep(10)`:** Waits 10 seconds between each message transmission.

- **`def on_connect(connection):`:** Callback function that executes when a new user connects to the Web UI, setting `connected` to `True`.

- **`def on_disconnect(connection):`:** Callback function that executes when the user disconnects from the Web UI, setting `connected` to `False`.

- **`ui.on_connect(on_connect)`:** Registers the `on_connect` callback to handle new client connections.

- **`ui.on_disconnect(on_disconnect)`:** Registers the `on_disconnect` callback to handle client disconnections.

- **`App.run(user_loop=loop)`:** Starts the application with the defined loop function.

### 🔧 Frontend (`index.html` + `app.js`)

## Related Inspirational Examples
- Color your LEDs 
