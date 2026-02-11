# Music Composer

The **Music Composer** example provides a web-based step sequencer interface to create polyphonic music patterns using the Arduino® UNO™ Q. It features 18 notes spanning from F#3 to B4, adjustable BPM, multiple waveforms, and a comprehensive effects rack, all powered by the `sound_generator` Brick.

![Music Composer Example](assets/docs_assets/thumbnail.png)

## Description

This App transforms your UNO Q into a browser-based music workstation. Using a grid where each row represents a musical note and each column represents a sixteenth-note time step, you can compose melodies and chords by toggling cells on and off. The grid dynamically expands as you add notes near the edge, supporting long compositions without limits.

The `web_ui` Brick serves the interactive frontend, while the `sound_generator` Brick handles real-time audio synthesis with configurable waveforms and effects. Your creation plays back with synchronized visual feedback, and you can export the finished composition as a Python® file containing a `MusicComposition` object ready to reuse in other Arduino App Lab projects.

**Key features include:**

- **Grid-based Step Sequencer:** 18-note polyphonic grid with automatic expansion.
- **Real-time Playback:** Visual step highlighting synchronized with audio playback.
- **Undo/Redo:** Full history tracking to easily revert or reapply changes.
- **Waveform Selection:** Choose from sine, square, and triangle waves.
- **Effects Rack:** Five knob-controlled effects (Bitcrusher, Chorus, Tremolo, Vibrato, Overdrive).
- **BPM Control:** Adjustable tempo (default 120 BPM).
- **Code Export:** Generate Python code with `MusicComposition` objects for reuse with the `SoundGenerator` Brick.

## Bricks Used

The Music Composer example uses the following Bricks:

- `web_ui`: Brick to create the web interface and provide a WebSocket channel for real-time control.
- `sound_generator`: Brick to handle audio synthesis, effects processing, and step sequence playback.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB speaker, cabled (x1)
- USB-C hub with external power (x1) *(required when using a USB audio device)*
- Power supply (5 V, 3 A) for the USB-C hub (x1) *(required when using a USB audio device)*

### Software

- Arduino App Lab

**Note:** A **USB-C hub is mandatory** when using an external USB audio device. The UNO Q's single USB-C port must be connected to the hub, which provides the necessary connections for both the power supply and the audio device. When using external audio, this example must be run in **Network Mode** or **SBC Mode** (via a USB-C hub with a mouse, keyboard, and display attached).

## How to Use the Example

1. **Connect the Hardware (Optional External Audio)**
   To use an external USB audio device, connect it to a powered **USB-C hub** attached to the UNO Q. Ensure the hub has its own power supply.

2. **Run the App**
   The App will start and initialize the audio engine. Launch it from Arduino App Lab by clicking the **Run** button. Wait until the App has launched completely.

3. **Access the Web Interface**
   The web UI will load in your browser. Open it at `<board-name>.local:7000` or `<UNO-Q-IP-ADDRESS>:7000`.

4. **Create a Pattern**
   The sequencer grid will appear with note labels on the left and time steps across the top.
   - **Toggle Notes:** Click cells in the grid to activate or deactivate notes. Active cells turn purple.
   - **Notes:** Each row corresponds to a specific pitch (B4 at the top, F#3 at the bottom).
   - **Steps:** Each column represents a sixteenth note (1/16 beat).
   - **Grid Expansion:** The grid automatically expands by 32 steps when you add notes within eight steps of the right edge.

5. **Adjust BPM**
   The tempo will update immediately. Use the BPM input field in the sequencer controls to set the tempo (40-240 BPM). Click the reset button to return to 120 BPM.

6. **Select a Waveform**
   The selected waveform shapes the timbre of all notes. Choose one from the **Wave** section of the control panel:
   - **Sine:** Smooth, pure tone.
   - **Square:** Classic synth sound, retro game style.
   - **Triangle:** Mellower, softer than square.

7. **Apply Effects**
   Each effect is controlled by a virtual knob with plus/minus buttons. Adjust the five effect knobs in the **Effects** section:
   - **Bitcrusher:** Lowers bit depth for lo-fi digital distortion.
   - **Chorus:** Adds depth and richness by simulating multiple voices.
   - **Tremolo:** Rhythmic amplitude modulation (volume vibrato).
   - **Vibrato:** Pitch modulation for expressive warble.
   - **Overdrive:** Adds harmonic distortion and saturation.

8. **Play Your Composition**
   The current step will be highlighted as the sequence plays. Click the **Play** button in the sequencer controls. Click **Pause** or **Stop** to control playback.

9. **Undo, Clear, or Export**
   - **Undo/Redo:** Click the arrow buttons to step backward or forward through your editing history.
   - **Clear:** Click the **Clear all** button to remove all notes (a confirmation dialog will appear).
   - **Export:** Click **Export .py** to download a Python file containing your composition as a `MusicComposition` object.

## How it Works

Once the application is running, the device performs the following operations:

```
Web Browser (UI)  ──►  WebSocket (Socket.IO)  ──►  Python Backend (main.py)
       ▲                                                     │
       │                                                     ▼
 (Visual Updates)                                 build_sequence_from_grid()
       │                                                     │
       └──  WebSocket  ◄──  State Updates  ◄──  SoundGenerator Brick
                                                             │
                                                             ▼
                                                   Audio Output (USB)
```

1. **User Interaction:** The JavaScript frontend captures clicks on the grid and sends the updated grid state to the backend via WebSocket (`composer:update_grid`).
2. **Sequence Building:** The Python backend converts the 2D grid (notes x steps) into a polyphonic sequence — a list of steps where each step contains a list of notes to play simultaneously.
3. **Audio Playback:** The `SoundGenerator` Brick's `play_step_sequence()` method plays the sequence, calling `on_step_callback` for each step to synchronize visual feedback.
4. **Step Highlighting:** The frontend runs a local timer to highlight the current step, ensuring smooth animation regardless of network latency.

## Understanding the Code

Here is a brief explanation of the App components:

### 🔧 Backend (`main.py`)

The Python script orchestrates the grid-to-audio conversion and manages the application state.

- **Initialization:** The `SoundGenerator` Brick is created with a sine waveform, 120 BPM, and an ADSR envelope. It is started immediately and the master volume is set to 80%.

```python
from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect

gen = SoundGenerator(wave_form="sine", bpm=120, sound_effects=[SoundEffect.adsr()])
gen.start()
gen.set_master_volume(0.8)
```

- **NOTE_MAP:** A list of 18 note names from B4 down to F#3, where each index corresponds to a grid row.

- **Grid State:** The grid is stored as a nested dictionary `{"noteIndex": {"stepIndex": bool}}`. For example, `grid["0"]["5"] = True` means the note B4 (row 0) is active on step 5.

- **Sequence Building:** The `build_sequence_from_grid()` function converts the grid dictionary into a list of steps, each containing the notes to play simultaneously:

```python
sequence = [
    ["C4", "E4"],  # Step 0: play C4 and E4 together
    [],            # Step 1: rest (no notes)
    ["G4"],        # Step 2: play G4
]
```

- **Event Handlers:** All interaction is handled through WebSocket events registered via `ui.on_message()`:
  - `on_update_grid`: Receives the grid state from the frontend and broadcasts it to all clients.
  - `on_play`: Builds the sequence from the grid and calls `gen.play_step_sequence()` to start playback.
  - `on_stop`: Stops the sequence playback via `gen.stop_sequence()`.
  - `on_set_bpm`, `on_set_waveform`, `on_set_volume`, `on_set_effects`: Update the audio parameters in real-time.
  - `on_export`: Generates a Python file containing the composition as a `MusicComposition` object.

- **Step Callback:** The `on_step_callback` is invoked by the `SoundGenerator` Brick for each step during playback. It sends a `composer:step_playing` event to the frontend for synchronization.

```python
def on_step_callback(step: int, total_steps: int):
    current_step = step
    ui.send_message("composer:step_playing", {"step": step, "total_steps": total_steps})
```

### 💻 Frontend (`index.html` + `app.js`)

The JavaScript® frontend handles the UI logic, grid rendering, and playback visualization.

- **Grid Rendering:** The `buildGrid()` function dynamically creates the grid based on `totalSteps` (initially 32, expands by 32 when needed). Each cell has `data-note` and `data-step` attributes for easy lookup.

- **Toggle Cell:** Clicking a cell toggles its state in the local `grid` object, saves the state to history for undo/redo, and emits the updated grid to the backend:

```javascript
function toggleCell(noteIndex, step) {
    const noteKey = String(noteIndex);
    const stepKey = String(step);
    if (!grid[noteKey]) grid[noteKey] = {};
    const newValue = !(grid[noteKey][stepKey] === true);
    grid[noteKey][stepKey] = newValue;
    saveStateToHistory();
    renderGrid();
    socket.emit('composer:update_grid', { grid });
}
```

- **Playback Animation:** When the **Play** button is clicked, the frontend starts a local interval timer that highlights the current step at the rate determined by BPM. This ensures smooth visual feedback even if network latency varies.

```javascript
function startLocalPlayback() {
    const stepDurationMs = (60000 / bpm) / 4; // Sixteenth notes: 4 per beat
    playInterval = setInterval(() => {
        currentStep++;
        if (currentStep >= effectiveLength) {
            stopLocalPlayback();
            return;
        }
        highlightStep(currentStep);
    }, stepDurationMs);
}
```

- **Effects Knobs:** Each knob has plus and minus buttons that increment or decrement the value by five (range 0-100). The knob indicator rotates to reflect the current value, and the updated effects state is sent to the backend.

- **Auto-scroll:** The sequencer grid auto-scrolls horizontally during playback to keep the currently playing step visible.

### 🛠️ Composition Export

The **Export .py** button triggers the `on_export` handler on the backend, which generates Python code defining a `MusicComposition` object. This object can be loaded and played in other Arduino App Lab projects using `gen.play_composition(composition)`.

**Example exported code:**

```python
from arduino.app_bricks.sound_generator import SoundGenerator, MusicComposition, SoundEffect

composition_tracks = [
    [("B4", 1/16)],                    # Step 0: single note
    [("A#4", 1/16), ("D4", 1/16)],    # Step 1: chord (two notes together)
    [],                                 # Step 2: REST (empty list)
    [("G#4", 1/16)],                   # Step 3: single note
]

composition = MusicComposition(
    composition=composition_tracks,
    bpm=120,
    waveform="sine",
    volume=0.80,
    effects=[SoundEffect.adsr(), SoundEffect.chorus(depth_ms=10, rate_hz=0.25, mix=0.40)]
)

gen = SoundGenerator()
gen.start()
gen.play_composition(composition, block=True)
```

## Troubleshooting

### "No USB speaker found" error (when using external audio)

If the application fails to start and you see an error regarding the speaker:

**Fix:**

1. Ensure a **powered USB-C hub** is connected to the UNO Q.
2. Verify the **USB audio device** is connected to the hub and turned on.
3. Restart the application.

### No sound output

If the interface works but there is no sound:

- **Volume Control:** Check the volume slider in the UI (right side of the control panel).
- **System Volume:** Ensure your speaker or system volume is not muted.
- **Grid Empty:** Ensure you have toggled at least one note cell (it should appear purple).
- **Audio Device:** Remember that **HDMI® audio** and **Bluetooth® speakers** are not supported.

### Choppy or crackling audio

- **CPU Load:** Close other applications running on the UNO Q.
- **Power Supply:** Ensure you are using a stable 5 V, 3 A power supply for the USB-C hub. Insufficient power often degrades USB audio performance.

### Grid not expanding

The grid expands automatically when you click a note within eight steps of the right edge. Ensure you are clicking far enough to the right.

### Playback not highlighting correctly

The frontend uses a local timer to highlight steps. If the BPM changes during playback, stop and restart playback to sync the timer.
