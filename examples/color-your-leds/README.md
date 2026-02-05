# Color your LEDs

The **Color your LEDs** example lets you manage the color and state of the four built-in LEDs on the Arduino UNO Q through an interactive web interface.

![Color your LEDs](assets/docs_assets/color-your-leds.png)

## Description

Control the four built-in RGB LEDs of the Arduino UNO Q directly from your browser. This example demonstrates how to handle the board's hybrid architecture by simultaneously managing LEDs #1 and #2 connected to the Qualcomm QRB2210 MPU, and LEDs #3 and #4 connected to the STM32U585 MCU. 

## Bricks Used

The example uses the following Brick:

- `web_ui`: Brick to create a web interface to display the color control dashboard.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and monitor attached.

## How to Use the Example

1. Run the App.
2. The App should open automatically in your browser. You can also open it manually via `<UNO-Q-IP-ADDRESS>:7000`.
3. Use the toggle switches to turn specific LEDs ON or OFF.
4. Select a color (for LEDs 1, 2, and 4) or use the color palette (for LED 3) to change the illumination.

## How it Works

Here is a brief explanation of the full-stack application:

### 🔧 Backend (main.py)

- Receives color commands from the frontend.
- Differentiates between LEDs controlled directly by the MPU (Linux side) and LEDs controlled by the MCU (Arduino side).
- Exposes:
  - **Socket.IO Event**: Listens for `set_color` messages to update LED states.

- Runs with `App.run()` which handles the internal event loop.

### 💻 Frontend (index.html + app.js)

- Connects to the backend using `Socket.IO`.
- Renders:
  - A visual representation of the UNO Q LEDs.
  - Interactive cards for each LED with ON/OFF toggles.
  - Color options for LEDs 1, 2, and 4.
  - A comprehensive color palette for LED 3 (PWM capable).
- Sends JSON payloads containing the LED ID and RGB values to the backend.

## Understanding the Code

Once the application is running, you can access it from your web browser by navigating to `<UNO-Q-IP-ADDRESS>:7000`. At that point, the device begins performing the following:

- Serving the web UI and exposing the real-time transports.

    The UI is hosted by the `WebUI` Brick and communicates with the backend via WebSocket (Socket.IO).

    ```python
    from arduino.app_bricks.web_ui import WebUI

    ...

    ui = WebUI()
    ui.on_message("set_color", on_set_color)         # WebSocket event
    ```

    - `set_color` (WebSocket): receives color change requests from the browser.

- Processing color requests and routing to the correct hardware.

    When the user selects a color or toggles a switch, the frontend emits a `set_color` message. The backend determines if the target LED is managed by the MPU (Linux) or the MCU (Sketch):

    1. Validates the LED ID and color structure.
    2. Routes commands for LED 1 & 2 to `Leds.set_ledX_color` (MPU direct control).
    3. Routes commands for LED 3 & 4 to `Bridge.call` (MCU control).

    ```python
    def on_set_color(id, message: dict):
        ledid = message.get("led")
        rgb_color = message.get("color")
        
        # ... validation logic ...

        match ledid:
            case 1:
                # MPU Control
                Leds.set_led1_color(rgb_color["r"] != 0, rgb_color["g"] != 0, rgb_color["b"] != 0)
            case 2:
                # MPU Control
                Leds.set_led2_color(rgb_color["r"] != 0, rgb_color["g"] != 0, rgb_color["b"] != 0)
            case 3:
                # MCU Control (PWM)
                Bridge.call("set_led3_color", rgb_color["r"], rgb_color["g"], rgb_color["b"])
            case 4:
                # MCU Control (Digital)
                Bridge.call("set_led4_color", rgb_color["r"] != 0, rgb_color["g"] != 0, rgb_color["b"] != 0)
    ```

- Executing LED actions on the MCU via `RouterBridge` (Arduino sketch).

    The firmware exposes functions to control LED 3 (Analog/PWM) and LED 4 (Digital). The backend calls these functions via the Bridge.

    ```cpp
    #include <Arduino_RouterBridge.h>

    // Led 3 can be controlled via PWM pins
    void set_led3_color(int r, int g, int b) {
      analogWrite(LED3_R, r);
      analogWrite(LED3_G, g);
      analogWrite(LED3_B, b);
    }

    // Led 4 is a simple ON/OFF LED for each color channel, HIGH = OFF, LOW = ON
    void set_led4_color(bool r, bool g, bool b) {
      digitalWrite(LED4_R, r ? LOW : HIGH);
      digitalWrite(LED4_G, g ? LOW : HIGH);
      digitalWrite(LED4_B, b ? LOW : HIGH);
    }

    void setup()
    {
        // ... Pin setups ...
        
        Bridge.begin();

        Bridge.provide("set_led3_color", set_led3_color);
        Bridge.provide("set_led4_color", set_led4_color);
    }
    ```

  - `set_led3_color`: Uses `analogWrite` to allow for full RGB color mixing via PWM.
  - `set_led4_color`: Uses `digitalWrite` with inverted logic (Active Low: `r ? LOW : HIGH`), allowing only 7 basic colors (ON/OFF per channel).