# Theremin Simulator

The **Theremin Simulator** example lets you create and control a virtual theremin instrument using an interactive web interface, producing synthesized audio output through a connected **USB** audio device with low latency.

**Note:** This example requires to be run using **Network Mode** or **Single-Board Computer (SBC)**, since it requires a **USB-C® hub** and a **USB speaker**.

![Theremin Simulator](assets/docs_assets/theremin-simulator.png)

This App creates a virtual instrument that generates real-time audio by creating sine waves at varying frequencies and amplitudes based on user input. The workflow involves receiving mouse or touch coordinates from the frontend and updating a **Wave Generator** Brick, which handles the audio synthesis, smoothing, and streaming to the **USB device** automatically.

**Key features include:**

- Real-time audio synthesis with low latency
- Interactive web interface for pitch and volume control
- Visual waveform display showing frequency and amplitude
- Automatic envelope smoothing (attack, release, glide) for natural sound
- Support for USB speakers and wireless USB audio receivers

## Bricks Used

The theremin simulator example uses the following Bricks:

- `web_ui`: Brick that provides the web interface and a WebSocket channel for real-time control of the theremin.
- `wave_generator`: Brick that handles audio synthesis, envelope control (smoothing), and streaming to the USB audio device.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- **USB-C® hub with external power (x1)**
- A power supply (5 V, 3 A) for the USB hub (x1)
- A **USB audio device** (choose one):
  - **USB speaker** (cabled)
  - **USB wireless speaker receiver/dongle** (2.4 GHz, non-Bluetooth)
- A **power supply** (5 V, 3 A) for the USB hub (e.g. a phone charger)

### Software

- Arduino App Lab

**Important:** A **USB-C® hub is mandatory** for this example. The UNO Q's single port must be used for the hub, which provides the necessary connections for both the power supply and the USB audio device. Consequently, this example must be run in **[Network Mode](learn/network-mode)** or **[SBC Mode](learn/single-board-computer)**.

**Note:** **HDMI audio** and **Bluetooth® Speakers** are not supported by this App.

## How to Use the Example

1. **Hardware Setup**
   Connect your **USB audio device** (e.g., USB speaker, wireless USB receiver) to a powered **USB-C® hub** attached to the UNO Q. Ensure the hub is powered.

2. **Run the App**
   Launch the App from Arduino App Lab. Wait until the App has launched completely.

3. **Access the Web Interface**
   Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000` (typically `192.168.x.x`).

4. **Turn on Power**
   Locate the orange control panel at the bottom of the interface. Click the **POWER** switch to toggle it **ON** (the small LED indicator will light up).
   *Note: No sound will be produced if this switch is OFF.*

5. **Set Master Volume**
   Use the **+** and **-** buttons near the **VOL** indicator to adjust the master volume. This sets the maximum output limit for the application.

6. **Play the Instrument**
   Drag your mouse (or use your finger on a touchscreen) inside the large gray background area:
   - **Horizontal (Left ↔ Right):** Controls **Pitch**. Moving right increases the frequency (higher notes).
   - **Vertical (Bottom ↕ Top):** Controls **Note Volume**. Moving up increases the amplitude (louder). Moving to the very bottom silences the note.

7. **Visualize Audio**
   Observe the screen in the center of the panel, which visualizes the real-time sine wave, frequency (Hz), and amplitude data. You can also toggle the **GRID** switch to visually reference specific pitch intervals.

## How it Works

The application relies on a continuous data pipeline between the web interface and the audio synthesis engine.

**High-level data flow:**

```
Web Browser Interaction  ──►  WebSocket  ──►  Python Backend
         ▲                                          │
         │                                          ▼
  (Visual Updates)                         (Glide & Synthesis)
         │                                          │
         └─  WebSocket   ◄──   State    ◄──  Sine Wave Generation
                                                    │
                                                    ▼
                                             USB Audio Output
```

- **User Interaction**: The frontend captures mouse/touch coordinates and sends them to the backend via the `web_ui` Brick's WebSocket channel.
- **Audio Synthesis**: The `wave_generator` Brick runs in the background. It takes the target frequency and amplitude and applies a **glide algorithm** to transition smoothly between notes.
- **Envelope Smoothing**: The Brick automatically handles attack, release, and glide to ensure the audio changes sound natural and analog-like, rather than robotic.
- **Audio Output**: The Brick streams the generated sine wave directly to the **USB** audio device.

## Understanding the Code

### 🔧 Backend (`main.py`)

The Python script simplifies audio logic by utilizing the `WaveGenerator` Brick.

- **Initialization**: Configures the audio engine with specific parameters (sine wave, 16kHz sample rate) and envelope settings (attack, release, glide).
- **Frequency Calculation**: Maps the X-axis input (0.0 to 1.0) exponentially to a frequency range of 20 Hz to ~8000 Hz.
- **Event Handling**: Listens for `theremin:move` events from the frontend to update frequency and amplitude.

```python
wave_gen = WaveGenerator(sample_rate=16000, ...) 

def _freq_from_x(x):
    # Exponential mapping from 20Hz up to Nyquist frequency
    return 20.0 * ((SAMPLE_RATE / 2.0 / 20.0) ** x)

def on_move(sid, data):
    # Calculate target frequency and amplitude based on coordinates
    freq = _freq_from_x(data.get("x"))
    amp = max(0.0, min(1.0, 1.0 - float(data.get("y"))))
    
    wave_gen.set_frequency(freq)
    wave_gen.set_amplitude(amp)
```

### 🔧 Frontend (`main.js`)

The web interface handles user input and visualization.

- **Input Capture**: Event listeners track `mousemove`, `touchmove`, and `touchstart` to capture user interaction.
- **Throttling**: Emissions to the backend are throttled to approximately 80 Hz (~12 ms) to prevent network overload while maintaining responsiveness.
- **Visual Feedback**: The canvas draws a real-time sine wave animation based on the amplitude and frequency data received back from the server.

```javascript
// Send normalized coordinates (0.0 - 1.0) to backend
socket.emit('theremin:move', { x, y });

// Receive state for visualization
socket.on('theremin:state', (data) => {
    updateStateDisplay(data.freq, data.amp);
});
```

## Troubleshooting

### "No USB speaker found" error
If the application fails to start and you see an error regarding the speaker:
**Fix:**
1. Ensure a **powered USB-C® hub** is connected to the UNO Q.
2. Verify the **USB audio device** is connected to the hub and turned on.
3. Restart the application.

### No Sound Output
If the interface works but there is no sound:
- **Power Button:** Ensure the **POWER** switch in the web UI is **ON**.
- **Pointer Position:** Ensure you are interacting with the upper part of the play area (bottom is zero volume).
- **Volume Controls:** Increase the volume using the **+** button in the UI.
- **Hardware Volume:** Check the physical volume control on your speaker.
- **Audio Device:** Remember that **HDMI audio** and **Bluetooth® speakers** are not supported.

### Choppy or Crackling Audio
- **CPU Load:** Close other applications running on the Arduino UNO Q.
- **Power Supply:** Ensure you are using a stable 5 V, 3 A power supply for the USB-C® hub. Insufficient power often degrades USB audio performance.

## Technical Details

- **Sample rate:** 16,000 Hz
- **Audio format:** 32-bit float, little-endian
- **Latency:** ~30 ms block duration
- **Frequency range:** ~20 Hz to ~8,000 Hz
- **Envelope:** Attack (0.01s), Release (0.03s), Glide (0.02s)
