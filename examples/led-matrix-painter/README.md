# LED Matrix Painter

The **LED Matrix Painter** example provides a web-based interface to draw, animate, and control the built-in LED Matrix of the Arduino UNO Q in real-time. It features a pixel editor with 3-bit (0-7) brightness control, database storage for your designs, and a code generator to export your frames as ready-to-use C++ code.

![LED Matrix Painter Example](assets/docs_assets/thumbnail.png)

## Description

This App allows you to design visuals for the 8x13 LED matrix directly from your browser. It uses the `web_ui` Brick to host a graphical editor where you can paint individual pixels, adjust their brightness, and apply transformations like flipping or rotating. Every change you make in the browser is immediately reflected on the physical board.

The application uses the `dbstorage_sqlstore` Brick to automatically save your work in a local database. You can create multiple frames, organize them into animations, and use the "Code panel" to see the generated C++ code in real-time.

Key features include:
- **Real-time Control:** Drawing on the web grid updates the UNO Q matrix instantly.
- **Grayscale Control:** 8 brightness presets (0-7) for intuitive pixel control; this example configures the board for 3-bit grayscale (0–7).
- **Persistent Storage:** Frames are automatically saved to a database, allowing you to build complex animations over time (max 300 frames).
- **Transformation Tools:** Invert, rotate, or flip designs with a single click.
- **Undo/Redo:** Step backward or forward through your editing history.
- **Animation Mode:** Sequence frames to create animations and preview them on the board.
- **Code Export:** Generate `uint32_t` arrays compatible with the `Arduino_LED_Matrix` library for use in standalone sketches.

## Bricks Used

The LED Matrix Painter example uses the following Bricks:

- `web_ui`: Brick to create the interactive grid editor and manage API endpoints.
- `dbstorage_sqlstore`: Brick to persist frames and animation sequences using a SQLite database.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

## How to Use the Example

1. **Run the App**
   Launch the example by clicking the **Run** button from Arduino App Lab.

2. **Access the Editor**
   Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000`.

3. **Draw Frames**
   - **Paint:** Click any cell in the central grid to turn it on.
   - **Adjust Brightness:** Click an active cell again (or hover/wait) to open the floating slider and set the brightness level (0-7).
   - **Preview:** Observe the UNO Q; the matrix updates instantly as you draw.

4. **Use the Design Tools**
   - **Transform:** Use the **Tools** panel on the left to **Flip Vertically/Horizontally**, **Rotate 180°**, **Invert Matrix** (negative), or **Invert Draw** (brightness).
   - **Undo/Redo:** Use the arrow buttons (◄ ►) next to the Clear Frame button to step backward or forward through your editing history.
   - **Clear:** Use the **Clear Frame** button above the grid to reset the canvas.

5. **Manage Frames (Bottom Panel)**
   - **Auto-save:** Your work is saved to the database automatically.
   - **Create:** Click the **+** button to add a new empty frame.
   - **Edit Details:** Assign a **Name** and **Duration** (in milliseconds) for each frame using the inputs above the frame list.
   - **Reorder:** Drag and drop frame thumbnails to change their sequence.
   - **Load/Delete:** Click a thumbnail to load it. To delete frames, click the **Del** button on individual thumbnails, or select multiple frames (by clicking their thumbnails while holding the selection) and delete them together.
   - **Note:** The application supports up to 300 frames total due to hardware animation buffer limits.

6. **Create Animations**
   - Switch the mode to **Animations** using the radio buttons in the bottom panel.
   - Select multiple frames by clicking on their thumbnails (they will highlight).
   - Click the **Play Animation** button below the grid to preview the sequence on the board.
   - Use the **Stop Animation** button to halt playback at any time.

7. **Export Code**
   - Toggle the **Code panel** switch in the top right header to view the C++ code for the current frame or animation in real-time.
   - Click the **Export .h** button to download a header file containing your selected designs, ready to be included in an Arduino sketch.

## How it Works

The LED Matrix Painter relies on a synchronized data flow between the browser, the Python backend, and the hardware.

**High-level data flow:**

```
Web Browser  ──►  HTTP API  ──►  Python Backend  ──►  Router Bridge  ──►  Arduino Sketch
                                       │                                        │
                                       ▼                                        ▼
                                SQLite Database                          LED Matrix Display
```

1.  **Web Interface**: The `app.js` script captures clicks on the grid. It debounces these events and sends the pixel data to the backend via the `/persist_frame` endpoint.
2.  **Python Backend**:
    *   **Data Model**: The `AppFrame` class normalizes the data, converting between frontend JSON, database records, and hardware byte arrays.
    *   **Persistence**: The `store.py` module uses `SQLStore` to save the frame data to a `frames` table in a SQLite database.
    *   **Bridge**: The `main.py` script sends the raw byte array to the board via `Bridge.call("draw", frame_bytes)`.
3.  **Arduino Sketch**: The sketch receives the raw byte data and uses the `Arduino_LED_Matrix` library to render the grayscale image.

## Understanding the Code

### 🔧 Backend (`main.py`, `store.py` & `app_frame.py`)

The Python backend manages the application logic, database, and hardware communication.

- **Data Model (`app_frame.py`)**: The `AppFrame` class is the core data structure that acts as a bridge between the different components. It extends the base `Frame` class to add application-specific metadata like `id`, `name`, `position`, and `duration`. It handles three distinct data contracts:
  - **API Contract**: `to_json()` / `from_json()` formats data for the web frontend.
  - **Database Contract**: `to_record()` / `from_record()` formats data for `SQLStore` storage.
  - **Hardware Contract**: `to_board_bytes()` packs pixels into the specific byte format expected by the Arduino sketch.

```python
class AppFrame(Frame):
    def to_record(self) -> dict:
        """Convert to a database record dict for storage."""
        return {
            "id": self.id,
            "name": self.name,
            "rows": json.dumps(self.arr.tolist()), # Serialize pixels to JSON string
            "brightness_levels": int(self.brightness_levels),
            # ...
        }
```

- **Initialization**:
  - `designer = FrameDesigner()`: Initializes the frame designer utility from `arduino.app_utils`, which provides the logic for transformation operations (invert, rotate, flip).
  - `store.init_db()`: Creates the SQLite database and tables for storing frames if they don't exist.

- **API Endpoints**: The backend exposes several HTTP endpoints using `ui.expose_api` to handle frontend requests:
  - `GET /config`: Returns runtime configuration (brightness levels, matrix dimensions).
  - `POST /update_board`: Updates board display in real-time without persisting to database (live preview).
  - `POST /persist_frame`: Saves or updates frames in the database and updates the board.
  - `POST /load_frame`: Loads a specific frame by ID or retrieves the last edited frame.
  - `GET /list_frames`: Returns all saved frames to populate the bottom panel.
  - `POST /get_frame`: Retrieves a single frame by ID.
  - `POST /delete_frames`: Deletes multiple frames by their IDs.
  - `POST /reorder_frames`: Reorders frames to match provided ID list order.
  - `POST /transform_frame`: Applies geometric transformations (invert, rotate, flip) to the pixel data.
  - `POST /export_frames`: Generates the C++ header file content for frames or animations.
  - `POST /play_animation`: Sends a sequence of frames to the Arduino to play as an animation.
  - `POST /stop_animation`: Stops any running animation on the board.

- **Hardware Update**: The `apply_frame_to_board` function sends the visual data to the microcontroller via the Bridge.

```python
# main.py
def apply_frame_to_board(frame: AppFrame):
    """Send frame bytes to the Arduino board."""
    frame_bytes = frame.to_board_bytes()
    Bridge.call("draw", frame_bytes)
```

- **Code Generation**: The `AppFrame` class generates the C++ code displayed in the UI. It formats the internal array data into `uint32_t` hex values.

```python
# app_frame.py
def to_c_string(self) -> str:
    c_type = "uint32_t"
    parts = [f"const {c_type} {self.name}[] = {{"]
     # Converts pixel brightness data to uint32_t hex format
    parts.append("};")
    return "\n".join(parts)
```

### 🔧 Arduino Component (`sketch.ino`)

The sketch is designed to be a passive renderer, accepting commands from the Python backend.

- **Grayscale Setup**: The matrix is initialized with 3-bit grayscale support (0-7 brightness levels).

```cpp
void setup() {
  matrix.begin();
  // configure grayscale bits to 3 so the display accepts 0..7 brightness
  // The backend will send quantized values in 0..(2^3-1) == 0..7.
  matrix.setGrayscaleBits(3);
  Bridge.begin();
  Bridge.provide("draw", draw);
  Bridge.provide("load_frame", load_frame);
  Bridge.provide("play_animation", play_animation);
  Bridge.provide("stop_animation", stop_animation);
}
```

- **Providers**: The sketch exposes four Bridge providers:
  - `draw(std::vector<uint8_t>)`: Renders a single frame to the LED matrix.
  - `load_frame(std::array<uint32_t,5>)`: Loads frame data into animation buffer (4 words + duration).
  - `play_animation()`: Starts playback of loaded animation frames.
  - `stop_animation()`: Halts any running animation.

```cpp
void draw(std::vector<uint8_t> frame) {
  matrix.draw(frame.data());
}

void play_animation() {
  animation_current_frame = 0;
  animation_running = true;
  animation_next_time = millis();
}
```

### 🔧 Frontend (`app.js`)

The JavaScript frontend handles the UI logic and data synchronization.

- **Auto-Persist**: To provide a responsive experience, changes are saved automatically after a short delay (debounce), updating both the database and the board simultaneously.

```javascript
// Unified persist: save to DB and update board together
function schedulePersist(){
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(()=> {
    persistFrame();
    persistTimeout = null;
  }, AUTO_PERSIST_DELAY_MS);
}
```

