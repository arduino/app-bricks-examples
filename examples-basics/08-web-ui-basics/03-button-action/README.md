# Button Action

The **Button Action** example demonstrates how to receive and handle button clicks from the Web UI using both WebSocket and HTTP POST requests.

## Description

This example shows how to use the WebUI brick to receive events from the Web UI frontend to the Python backend. The application initializes a web server that serves the frontend files from the `assets` folder and establishes communication channels to handle button clicks from the browser interface.

The `assets` folder contains the **frontend** components of the application, including HTML and CSS files along with JavaScript files that make up the web user interface. The `python` folder includes the application **backend** which receives and processes button click events from the UI.

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
3. Click the button on the web page
4. The backend will receive the button click event and log a message in the console indicating the button was clicked and the source (WebSocket or HTTP POST)

## How it Works

Once the application is running, the device performs the following operations:

- **Initializing the WebUI server:** The WebUI brick starts a web server on port 7000. The application serves HTML, CSS, and JavaScript files from the `assets` folder to the browser.
- **Handling WebSocket messages:** When the WebSocket button is clicked, the `wss_print_message` callback function is triggered, logging a message indicating the button was clicked from WebSocket.
- **Handling HTTP API requests:** When the HTTP button is clicked, the `http_print_message` function is triggered, logging a message indicating the button was clicked from HTTP POST and returning a JSON response.
- **Event registration:** The backend registers event handlers for the `print_message` event and exposes an HTTP API endpoint that the frontend can call.
- **Message logging:** Console messages are logged to indicate which communication method was used to trigger the button action.

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python code demonstrates receiving and handling button clicks from the Web UI:

- **`from arduino.app_utils import *`:** Imports the required application utilities.

- **`from arduino.app_bricks.web_ui import WebUI`:** Imports the WebUI brick class for managing the web server.

- **`logger = Logger("WebUIButtonAction")`:** Initializes a logger to output messages to the console.

- **`ui = WebUI()`:** Initializes the web server. By default, it serves all content from the `assets` folder of the application.

- **`def print_message(source: str):`:** Defines a helper function that logs a message indicating that the button was clicked, showing the source of the request (WebSocket or HTTP POST).

- **`def wss_print_message(client, data):`:** Callback function that is triggered when a `print_message` event is received via WebSocket from the Web UI frontend.

- **`def http_print_message():`:** Function that is triggered when the `print_message` API endpoint is called via an HTTP POST request from the Web UI frontend, returning a JSON response.

- **`ui.on_message("print_message", wss_print_message)`:** Registers the `wss_print_message` callback to handle WebSocket messages with the event name `"print_message"`.

- **`ui.expose_api(method="POST", path="/print_message", function=http_print_message)`:** Exposes the `http_print_message` function as an HTTP RESTful API endpoint that can be called from the Web UI using a POST request to `/print_message`.

- **`App.run()`:** Starts the application.

### 🔧 Frontend (`index.html` + `app.js`)

The frontend code provides two buttons that send events to the backend using different communication methods:

- **`const ui = new WebUI()`:** Initializes the WebUI client for WebSocket communication with the backend.

- **`ui.on_connect(onUIConnected)`:** Registers a callback that executes when the frontend connects to the backend server.

- **`ui.on_disconnect(onUIDisconnected)`:** Registers a callback that executes when the frontend disconnects from the backend server.

- **`const websocketButton = document.querySelector('#websocket-button')`:** Selects the WebSocket button element from the DOM.

- **`const httpButton = document.querySelector('#http-button')`:** Selects the HTTP button element from the DOM.

- **`function onUIConnected()`:** Callback function executed when the frontend connects to the backend. Attaches click event listeners to both buttons using `addEventListener`.

- **`websocketButton.addEventListener('click', sendViaWebSocket)`:** Attaches the `sendViaWebSocket` function to the WebSocket button's click event.

- **`httpButton.addEventListener('click', sendViaHttp)`:** Attaches the `sendViaHttp` function to the HTTP button's click event.

- **`function sendViaWebSocket()`:** Sends a message to the backend using WebSocket via the `ui.send_message('print_message')` method, triggering the `print_message` event on the backend.

- **`async function sendViaHttp()`:** Async function that makes an HTTP POST request to the `/print_message` endpoint exposed by the backend using `fetch()`.

- **`fetch('/print_message', { method: 'POST', ... })`:** Makes an HTTP POST request to the `/print_message` endpoint with JSON headers and an empty body.

## Related Inspirational Examples
- Color your LEDs
