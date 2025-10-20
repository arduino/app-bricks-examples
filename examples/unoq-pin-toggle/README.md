# UNO Q Pin Toggle
The **UNO Q Pin Toggle** example lets you control the state of every pin of the Arduino UNO Q through an interactive web interface. 

![UNO Q Pin Toggle](assets/docs_assets/pin-toggle.png)

## Description

Control every Arduino UNO Q pin from your browser with a simple, interactive board view. Flip switches to turn pins on or off, and see changes reflected instantly. This example shows a clean, real-time control panel you can expand into richer dashboards and automations.

## Brick Used

The example uses the following Brick:

- `web_ui`: Brick to create a web interface to display the board pins control dashboard.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® to USB-A Cable (x1)

### Software

- Arduino App Lab

**Note:** You can run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and monitor attached.

## How to Use the Example

1. Run the App.
2. Open the App on your browser
3. Toggle the pins switches you want to control. 
   
## How it Works

Here is a brief explanation of the full-stack application:

### 🔧 Backend (main.py)

- Define and map all the Arduino UNO Q board pin names.
- Using helper functions it secures the communication methods with the frontend and the microcontroller.
  
- Exposes:
  - **REST API**: returns the current logical state of pins through the `/states` endpoint.

- Runs with `App.run()` which handles the internal event loop.

### 💻 Frontend (index.html + app.js)

- Connects to the backend using `Socket.IO`
- Renders:
  - The UNO Q illustration with the toggle switches on each pin.

- Manages the dynamic scaling between the switches and the UNO Q image.
- Wires the switches toggle with the backend.

## Understanding the Code

Once the application is running, you can access it from your web browser by navigating to `<UNO-Q-IP-ADDRESS>:7000`. At that point, the device begins performing the following:

- Serving the web UI and exposing the realtime/REST transports.

    The UI is hosted by the `WebUI` Brick and communicates with the backend via WebSocket (Socket.IO) and a small REST API.
    
    ```python
    from arduino.app_bricks.web_ui import WebUI
    
    ...

    ui = WebUI()
    ui.on_message("pin_toggle", on_pin_toggle)           # WebSocket event
    ui.expose_api("GET", "/states", on_get_states)       # REST: current states
    ```

    - `pin_toggle` (WebSocket): receives toggle requests from the browser.
    - `GET /states` (REST): returns the logical ON/OFF state of every pin for bootstrapping the UI.

- Processing toggle requests and broadcasting updates.

    When the browser flips a switch, it emits a `pin_toggle` message. The backend:

    1. Validates and parses the payload (accepts dict/JSON/bytes).
    2. Updates the logical state (`pin_states[name] = logical`).
    3. Converts to the hardware level (respecting `active_low`).
    4. Calls the MCU via the Bridge.
    5. Broadcasts the new logical state to all clients.

    ```python
    def on_pin_toggle(sid, message):
        try:
            data = _ensure_dict(message)
            name = data.get("name")
            if name not in PIN_NAMES:
                raise ValueError(f"Unknown Pin '{name}'")

            # Logical state from UI ("on"/"off", 1/0, true/false -> bool)
            logical = _normalize_state(data.get("state"))
            pin_states[name] = logical

            # Apply active-low for the MCU call
            state_for_hw = _state_for_hw(name, logical)

            Bridge.call("set_pin_by_name", name, state_for_hw)

            print(f"[{_iso_now()}] [{sid}] {name} -> logical={'ON' if logical else 'OFF'} hw={state_for_hw}")
            ui.send_message("pin_state_update", {
                "name": name,
                "state": logical,           # broadcast logical state to clients
                "timestamp": _iso_now()
            })

        except Exception as e:
            ui.send_message("error", f"Pin toggle error: {e}")
    ```
- Executing pin actions on the MCU via `RouterBridge` (Arduino sketch).

    The firmware exposes a boolean RPC, through `Arduino_RouterBridge`. The backend calls it by pin name and pin state.

    ```cpp
    #include <Arduino_RouterBridge.h>

    // Generic setter: name + bool
    void set_pin_by_name(String name, bool s) {
      int idx = findIndex(name.c_str());
      if (idx < 0) return;              // unknown name
      digitalWrite(kPins[idx].pin, s ? HIGH : LOW);   // Python already applied active_low
    }

    void setup() {
        for (auto &e : kPins) pinMode(e.pin, OUTPUT);  // ... set modes for all pins

        ...
        
        Bridge.begin();
        Bridge.provide("set_pin_by_name", set_pin_by_name);

    }
    void loop() {}

    ```

  - The sketch maps device-tree indexes to Arduino pin numbers (macros shown in the code) and sets all relevant pins to `OUTPUT`.
  - RGB channels default to `HIGH` in `setup()` to keep active-low LEDs **off** at boot.
  - Each `Bridge.provide("<name>", <fn>)` pairs with the Python call so the backend can toggle pins with a simple boolean.
