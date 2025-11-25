# LED Matrix Painter

The **LED Matrix Painter** example provides a web-based tool for designing frames and animations for the Arduino UNO Q 8×13 LED matrix. You can create individual frames, organize them into animations, preview them in real-time on the board, and export them as C++ code.

![LED Matrix Painter](assets/docs_assets/led-matrix-painter.png)

## Description

This example allows you to design LED matrix frames using an interactive web interface. Each frame can have custom brightness levels (0-7) for each LED pixel. You can:

- **Design frames** with pixel-by-pixel control using an interactive grid
- **Preview in real-time** on the Arduino UNO Q LED matrix
- **Save and organize** multiple frames with a persistent database
- **Create animations** by sequencing multiple frames together
- **Export code** as C++ arrays ready to use in your Arduino sketches
- **Transform frames** with operations like invert, rotate, and flip

The application uses the Router Bridge to communicate between the web interface (running on Linux) and the Arduino sketch (running on the microcontroller), enabling real-time updates to the physical LED matrix.

## Bricks Used

- `web_ui`: Provides the web server and HTTP API endpoints for the interactive frame designer interface.
- `dbstorage_sqlstore` (implicit): Stores frame data persistently in a SQLite database.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

## How to Use the Example

1. Launch the App by clicking the **Play** button in the top-right corner. Wait until the App has launched.
2. **Design a frame:**
   - Click on individual pixels in the 8×13 grid to toggle them on/off
   - Use the brightness slider to adjust LED intensity (0-7)
   - Click on pixels with different brightness values to paint with varying intensities
3. **Save your frame:**
   - Click the **Save Frame** button to persist the current design
   - Frames are automatically saved to a database and appear in the sidebar
4. **Create animations:**
   - Save multiple frames
   - Switch to **Animations** mode in the sidebar
   - Create a new animation and add frames to it
   - Use **Play** to preview the animation on the board
5. **Export code:**
   - Select the frames or animations you want to export
   - Click **Export** to generate C++ code
   - Copy the generated arrays into your Arduino sketch

## How it Works

The LED Matrix Painter consists of three main components working together:

- **Web Interface (Frontend)**: An interactive grid editor built with HTML/CSS/JavaScript that sends pixel data to the backend via HTTP API calls.

- **Python Backend**: Handles frame storage in a SQLite database, manages frame transformations, and communicates with the Arduino via Router Bridge.

- **Arduino Sketch**: Receives frame data over Router Bridge and displays it on the physical LED matrix using the `Arduino_LED_Matrix` library.

High-level data flow:

```
Web Browser → HTTP API → Python Backend → Router Bridge → Arduino LED Matrix
                              ↓
                        SQLite Database
```

The workflow:
1. User edits a frame in the web interface
2. Changes are sent to Python backend via HTTP POST
3. Backend validates and stores the frame in SQLite
4. Backend sends frame data to Arduino via Bridge
5. Arduino sketch renders the frame on the LED matrix

## Understanding the Code

### 🔧 Backend (`main.py`)

The Python application manages the HTTP API, database operations, and communication with the Arduino.

- **`designer = FrameDesigner()`**: Initializes the frame designer utility from `arduino.app_utils`, which provides transformation operations (invert, rotate, flip).

- **`store.init_db()`**: Creates the SQLite database and tables for storing frames if they don't exist.

- **`ui.expose_api('POST', '/persist_frame', persist_frame)`**: Exposes an HTTP endpoint that saves or updates frames in the database.

- **`ui.expose_api('POST', '/load_frame', load_frame)`**: Loads a frame from the database by ID or retrieves the last edited frame.

- **`ui.expose_api('GET', '/list_frames', list_frames)`**: Returns all saved frames for display in the sidebar.

- **`ui.expose_api('POST', '/play_animation', play_animation)`**: Sends a sequence of frames to the Arduino to play as an animation.

- **`ui.expose_api('POST', '/export_frames', export_frames)`**: Generates C++ code arrays from selected frames for use in Arduino sketches.

- **`Bridge.call("draw", frame_bytes)`**: Sends frame data to the Arduino sketch to update the LED matrix display.

- **`AppFrame` class**: Custom extension of `arduino.app_utils.Frame` that adds metadata like frame name, position, duration, and database persistence methods.

### 💻 Frontend (`app.js` + `index.html`)

The web interface provides an interactive pixel grid editor and frame management tools.

- **Pixel Grid**: An 8×13 canvas that responds to mouse clicks and drag operations for painting pixels.

- **Brightness Control**: A slider (0-7) that controls the current brush brightness level.

- **Frame List**: Displays all saved frames in a sidebar with options to load, delete, or reorder them.

- **Animations Mode**: Allows creating and managing animation sequences by dragging frames into animation containers.

- **Transform Tools**: Buttons for applying transformations (invert, rotate 180°, flip horizontal/vertical).

- **Export Modal**: Generates and displays C++ code for selected frames or animations.

- **HTTP API calls**: Uses `fetch()` to communicate with the Python backend for all frame operations (save, load, delete, transform, export, play).

### 🔧 Hardware (`sketch.ino`)

The Arduino code handles LED matrix control and Router Bridge communication.

- **`matrix.begin()`**: Initializes the Arduino_LED_Matrix library for controlling the UNO Q LED matrix.

- **`matrix.setGrayscaleBits(8)`**: Configures the matrix to accept 8-bit brightness values (0-255) for each pixel.

- **`Bridge.begin()`**: Initializes Router Bridge for receiving commands from the Python application.

- **`Bridge.provide("draw", draw)`**: Registers the `draw` function to be callable from Python, which accepts frame data and renders it on the matrix.

- **`Bridge.provide("play_animation", play_animation)`**: Registers the animation playback function that accepts multiple frames and plays them sequentially.

- **`matrix.draw(frame.data())`**: Renders a single frame on the LED matrix using raw byte data.

- **`matrix.loadWrapper()` + `matrix.playSequence()`**: Loads an animation sequence and plays it on the LED matrix.

## Frame Data Format

Frames are stored as 8×13 arrays where each value represents LED brightness (0-255):

```cpp
// Example frame in C++ format
const uint8_t frame[][12] = {
  {255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255},
  {0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0},
  // ... 6 more rows
};
```

For animations, frames are stored as `uint32_t` arrays compatible with the Arduino_LED_Matrix library:

```cpp
const uint32_t animation[][5] = {
  {0x12345678, 0x9abcdef0, 0x12345678, 0x9abcdef0, 1000},  // Frame 1, 1000ms duration
  {0xfedcba98, 0x76543210, 0xfedcba98, 0x76543210, 1000},  // Frame 2, 1000ms duration
};
```
