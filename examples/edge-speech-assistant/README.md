# Edge Speech Assistant

The **Edge Speech Assistant** example turns the Arduino® VENTUNO Q into a fully offline text-to-speech device that converts any text you type into spoken audio played through a connected speaker.

![Edge Speech Assistant Example](assets/docs_assets/thumbnail.png)

## Description

This App provides a clean web interface where you can paste or type any text and have it read aloud, with everything running locally on the board. There is no cloud round-trip, no account, and no internet connection required at inference time, which keeps your data private and the latency low.

The backend uses the `tts` Brick to synthesize speech with an on-device MeloTTS model and streams the audio to a USB speaker through ALSA. The frontend, served by the `web_ui` Brick, gives you a Play/Stop control, an elapsed-time counter, and a Reset button so you can quickly iterate on the text you want to hear.

Key features include:

- **Fully offline synthesis:** Speech is generated locally by an AI model running on the VENTUNO Q.
- **Long text support:** The `tts` Brick automatically splits long inputs into sentence-aware chunks so you can paste paragraphs without hitting the per-request size limit.
- **Live highlighting:** As each chunk is spoken the frontend highlights the matching range of the source text so you can follow along with the synthesizer.
- **Stop on demand:** A single button toggles between Play and Stop so you can interrupt playback at any time.

## Bricks Used

The Edge Speech Assistant example uses the following Bricks:

- `tts`: Offline text-to-speech Brick that synthesizes speech locally and plays it through a connected speaker.
- `web_ui`: Brick that hosts the HTML interface and the messaging channel used to send text and receive playback status.

## Hardware and Software Requirements

### Hardware

- Arduino VENTUNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB-A speaker or headset (x1)

### Software

- Arduino App Lab

**Note:** This example needs a USB speaker connected to the VENTUNO Q. The `tts` Brick targets the first USB speaker it finds (`usb:1`) by default and will fail to start if no USB speaker is plugged in.

## How to Use the Example

1. **Connect a USB Speaker**

   Plug a USB speaker into the VENTUNO Q before launching the App so the `tts` Brick can find it during start-up.

2. **Launch the App**

   Open the App in App Lab and click the **Run** button in the top right corner. The first launch downloads the audio container and the MeloTTS model, so it can take a few minutes.

   ![Launch the App](assets/docs_assets/launch-app.png)

3. **Open the Web Interface**

   Once the App is running, open `http://<VENTUNO-Q-IP-ADDRESS>:7000` in your browser, or `http://localhost:7000` if you are accessing it from the board itself.

   > Your IP address is shown at the bottom panel of the Arduino App Lab Editor. Note that your board needs to be connected to the same network as your host device.

4. **Type Text and Press Play**

   Type or paste the text you want to hear into the text area. Click **Play** to start synthesis; the timer shows elapsed playback time. Click **Stop** to interrupt at any moment, or **New text** to clear the editor and start over.

   ![Web UI while speech is being synthesized](assets/docs_assets/web-ui.png)

## How it Works

Once the application is running, the device performs the following operations:

```
                ──▶ "speak" / "stop" ──▶
  Browser                                  web_ui Brick  ──▶  main.py
                ◀── "speaking" events ──                        │
                                                                ▼
                                                         tts Brick (Python)
                                                                │ HTTP POST /tts/synthesize
                                                                ▼
                                                       audio-analytics container
                                                         (MeloTTS on QNN DSP)
                                                                │ PCM audio
                                                                ▼
                                                         ALSA  ──▶  USB Speaker
```

1. The browser instantiates the `WebUI` helper, which opens a Socket.IO connection to the `web_ui` Brick under the hood, and calls `ui.send_message('speak', { text })` with the text typed by the user.
2. `main.py` receives the event, splits the text at sentence and clause boundaries for fine-grained highlighting, and forwards each chunk to the `tts` Brick (further sub-splitting any chunk that exceeds the 1024-byte synthesis limit).
3. The `tts` Brick calls the local audio-analytics REST API (`http://audio-analytics-runner:8085`) which runs the MeloTTS model on the Qualcomm® DSP and returns raw PCM audio.
4. The Brick writes the PCM stream to ALSA, which routes it to the USB speaker.
5. Before each chunk is spoken, the backend pushes a `speaking` status message — `started`, `progress` (with `start`/`end` offsets into the original text), or `finished` — and the frontend listens with `ui.on_message('speaking', ...)` to drive the Play/Stop toggle, the elapsed-time counter, and the live highlight overlay.

The MeloTTS model and the audio analytics service are managed by the `tts` Brick, so the App does not need any model files of its own.

## Understanding the Code

Here is a brief explanation of the App components:

### 🔧 Backend (`main.py`)

The Python® backend is small: it wires the `web_ui` events to the `tts` Brick and adds a chunking helper for long inputs.

- **Initialization**: Both Bricks are created with no arguments. The `tts` Brick auto-detects the first USB speaker and connects to the audio-analytics service.

  ```python
  from arduino.app_bricks.tts import TextToSpeech
  from arduino.app_bricks.web_ui import WebUI
  from arduino.app_utils import App

  tts = TextToSpeech()
  ui = WebUI()
  ```

- **Sentence-aware chunking**: The handler first splits the text at sentence and clause boundaries (`.!?,;:`) so each spoken segment maps to a meaningful range of the original string. This is what powers the live highlight on the frontend.

  ```python
  TTS_MAX_BYTES = 1024

  # Split at sentence and clause boundaries for fine-grained highlighting
  chunks = re.split(r"(?<=[.!?,;:])\s+", original_text)
  ```

- **Playback loop with progress and stop support**: A `threading.Event` lets the `stop` handler interrupt the loop between chunks. Before every chunk the backend sends a `progress` message with the chunk's offsets in the original text so the frontend can highlight it; chunks that still exceed the 1024-byte synthesis limit are sub-split on word boundaries.

  ```python
  ui.send_message("speaking", {"status": "started"})
  search_from = 0
  for chunk in chunks:
      if stop_event.is_set():
          break
      if not chunk.strip():
          continue
      idx = original_text.find(chunk, search_from)
      if idx != -1:
          ui.send_message(
              "speaking",
              {"status": "progress", "start": idx, "end": idx + len(chunk)},
          )
          search_from = idx + len(chunk)
      remaining = chunk
      while remaining:
          if stop_event.is_set():
              break
          if len(remaining.encode("utf-8")) <= TTS_MAX_BYTES:
              tts.speak(remaining)
              break
          window = remaining.encode("utf-8")[:TTS_MAX_BYTES].decode(
              "utf-8", errors="ignore"
          )
          space_idx = window.rfind(" ")
          cut = space_idx if space_idx > 0 else len(window)
          tts.speak(remaining[:cut].strip())
          remaining = remaining[cut:].strip()
  if not stop_event.is_set():
      ui.send_message("speaking", {"status": "finished"})
  ```

- **Event registration**: Incoming `web_ui` messages are bound to the handlers and the App is started.

  ```python
  ui.on_message("speak", speak)
  ui.on_message("stop", stop)

  App.run()
  ```

### 💻 Frontend (`index.html` + `app.js`)

The page is a single-screen editor with a Play/Stop toggle button and a timer. All state changes go through a `WebUI` connection to the `web_ui` Brick.

- **Sending text**: When the user presses Play, the frontend sends a `speak` event with the current textarea value. Pressing the same button while speaking sends `stop` instead.

  ```javascript
  playStopButton.addEventListener('click', () => {
    if (isSpeaking) {
      ui.send_message('stop');
    } else {
      const text = textInput.value.trim();
      if (text) {
        ui.send_message('speak', { text });
      }
    }
  });
  ```

- **Status synchronization**: The backend's `speaking` messages drive the icon, label, timer, disabled-state of the controls, and the highlight overlay so the UI always reflects what the synthesizer is actually doing. The `progress` events carry `start`/`end` offsets into the original text, which `highlightRange` uses to wrap the matching slice in a `<span class="highlight">`.

  ```javascript
  ui.on_message('speaking', data => {
    if (data.status === 'started') {
      isSpeaking = true;
      showOverlay(textInput.value.trim());
      startTimer();
      updateControls();
    } else if (data.status === 'progress') {
      highlightRange(data.start, data.end);
    } else if (data.status === 'finished') {
      isSpeaking = false;
      hideOverlay();
      stopTimer();
      updateControls();
    }
  });
  ```

## Troubleshooting

### No audio comes out of the speaker

**Fix:** Open a terminal on the board and run `aplay -l` to confirm that the USB speaker is connected and visible. The `tts` Brick targets `usb:1` by default and will fail with `No USB speakers found` if no USB speaker is present.

### App start fails with "Speaker is busy"

**Fix:** Another audio service is already holding the device exclusively (PipeWire or PulseAudio from a desktop session is the most common cause). Stop the conflicting service or run the board in headless mode so the `tts` Brick can open the speaker.
