# Linux Blink with UI (JavaScript)

The **Linux Blink** example shows a simple Linux application that changes the LED state on the board. It showcases basic event handling and UI updates through a web-based interface.

![Linux Blink App](assets/docs_assets/linux-blink-banner.png)

## Description

This example toggles an LED on the board using a simple web user interface. The application listens for user input through a web browser and updates the LED state accordingly. It shows how to interact with hardware from a Linux environment and provides a basis for building more complex hardware-interfacing applications.

The `assets` folder contains the **frontend** components of the application. Inside, you'll find the JavaScript source files along with the HTML and CSS files that make up the web user interface. The `python` folder instead includes the application **backend**.

The interactive toggle switch UI is generated with JavaScript, while the Arduino sketch manages the LED hardware control. The Router Bridge enables communication between the web interface and the microcontroller.

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
3. Click on the circular switch to change the state of the LED

## How it Works

Once the application is running, the device performs the following operations:

- **Serving the web interface and handling WebSocket communication.**

The `web_ui` Brick provides the web server and WebSocket communication:

```python
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()
ui.on_message('toggle_led', toggle_led_state)
ui.on_message('get_initial_state', on_get_initial_state)
```

- **Communicating LED state to the Arduino.**

The Router Bridge sends LED commands to the microcontroller:

```python
   Bridge.call("set_led_state", led_is_on)
```

- **Controlling the hardware LED.**

The Arduino sketch handles the LED hardware control:

```cpp
   void set_led_state(bool state) {
      digitalWrite(LED_BUILTIN, state ? LOW : HIGH);
   }
```

The high-level data flow looks like this:

```
Web Browser Toggle → WebSocket → Python Backend → Router Bridge → Arduino LED Control
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python code manages the web interface, handles user interactions, and communicates with the Arduino.

- **`ui = WebUI()`:** Initializes the web server that serves the HTML interface and handles WebSocket communication.

- **`ui.on_message('toggle_led', toggle_led_state)`:** Registers a WebSocket message handler that responds when the user clicks the toggle button in the web interface.

- **`ui.send_message('led_status_update', get_led_status())`:** Sends LED status updates to all connected web clients in real-time.

- **`Bridge.call("set_led_state", led_is_on)`:** Calls the Arduino function to physically control the LED hardware.

- **`get_led_status()`:** Returns the current LED state as a dictionary for the web interface.

### 🔧 Frontend (`index.html` + `app.js`)

The web interface provides a simple toggle button for LED control.

- **Socket.IO connection:** Establishes WebSocket communication with the Python backend through the `web_ui` Brick.

- **`socket.emit('toggle_led', {})`:** Sends a toggle message to the backend when the user clicks the button.

- **`socket.on('led_status_update', updateLedStatus)`:** Receives LED status updates and updates the button appearance accordingly.

- **`updateLedStatus(status)`:** Changes the button's visual state (LED IS ON/OFF) based on the received status.

### 🔧 Hardware (`sketch.ino`)

The Arduino code handles LED hardware control and sets up Bridge communication.

- **`pinMode(LED_BUILTIN, OUTPUT)`:** Configures the built-in LED pin as an output for controlling the LED state.

- **`Bridge.begin()`:** Initializes the Router Bridge communication system for receiving commands from Python.

- **`Bridge.provide(...)`:** Registers the `set_led_state` function to be callable from the Python web interface.

- **`set_led_state(bool state)`:** Controls the LED hardware by setting the pin HIGH or LOW based on the received state parameter.

- **Empty `loop()`:** The main loop remains empty since all LED control is event-driven through Bridge function calls.

