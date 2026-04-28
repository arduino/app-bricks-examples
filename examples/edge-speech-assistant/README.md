# Edge Speech Assistant

The **Edge Speech Assistant** example turns the Arduino® UNO™ Q into a fully offline text-to-speech device that converts any text you type into spoken audio played through a connected speaker.

![Edge Speech Assistant Example](assets/docs_assets/thumbnail.png)

## Description

This App provides a clean web interface where you can paste or type any text and have it read aloud, with everything running locally on the board. There is no cloud round-trip, no account, and no internet connection required at inference time, which keeps your data private and the latency low.

The backend uses the `tts` Brick to synthesize speech with an on-device MeloTTS model and streams the audio to a USB speaker through ALSA. The frontend, served by the `web_ui` Brick, gives you a Play/Stop control, an elapsed-time counter, and a Reset button so you can quickly iterate on the text you want to hear.

Key features include:

- **Fully offline synthesis:** Speech is generated locally by an AI model running in a Docker container on the UNO Q.
- **Long text support:** The backend automatically splits long inputs into sentence-aware chunks so you can paste paragraphs without hitting the per-request size limit.
- **Stop on demand:** A single button toggles between Play and Stop so you can interrupt playback at any time.

## Bricks Used

The Edge Speech Assistant example uses the following Bricks:

- `tts`: Offline text-to-speech Brick that synthesizes speech locally and plays it through a connected speaker.
- `web_ui`: Brick that hosts the HTML interface and the WebSocket channel used to send text and receive playback status.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB speaker (x1)

### Software

- Arduino App Lab

**Note:** This example needs a USB audio output device connected to the UNO Q. The `tts` Brick targets the first USB speaker it finds (`usb:1`) by default and will fail to start if no USB speaker is plugged in.

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. **Connect a USB Speaker**

   Plug a USB speaker into the UNO Q before launching the App so the `tts` Brick can find it during start-up.

2. **Launch the App**

   Open the App in App Lab and click the **Run** button in the top right corner. The first launch downloads the audio container and the MeloTTS model, so it can take a few minutes.

   ![Launch the App](assets/docs_assets/launch-app.png)

3. **Open the Web Interface**

   Once the App is running, open `http://<UNO-Q-IP-ADDRESS>:7000` in your browser, or use the App Lab preview pane.

   ![Web interface](assets/docs_assets/web-interface.png)

4. **Type Text and Press Play**

   Type or paste the text you want to hear into the text area. Click **Play** to start synthesis; the timer shows elapsed playback time. Click **Stop** to interrupt at any moment, or **New text** to clear the editor and start over.

   ![Play and Stop controls](assets/docs_assets/play-stop.png)

## How it Works

Once the application is running, the device performs the following operations:

```
Browser  ──WebSocket──▶  web_ui Brick  ──▶  main.py
                                              │
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

1. The browser opens a WebSocket to the `web_ui` Brick and emits a `speak` event carrying the text typed by the user.
2. `main.py` receives the event, splits the text into sentence-aware chunks of at most 1024 bytes each, and forwards each chunk to the `tts` Brick.
3. The `tts` Brick calls the local audio-analytics REST API (`http://audio-analytics-runner:8085`) which runs the MeloTTS model on the Qualcomm® DSP and returns raw PCM audio.
4. The Brick writes the PCM stream to ALSA, which routes it to the USB speaker.
5. While playback is happening, the backend pushes `speaking` status updates over WebSocket so the frontend can show **Stop** instead of **Play** and run the elapsed-time counter.

The MeloTTS model and the audio analytics service run inside a Docker container managed by the `tts` Brick, so the App container does not need any model files of its own.

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

- **Sentence-aware chunking**: The synthesis API has a 1024-byte input limit, so the `speak` handler breaks the text at the last sentence boundary that fits inside the window before sending it to the Brick.

  ```python
  TTS_MAX_BYTES = 1024

  while len(text.encode("utf-8")) > TTS_MAX_BYTES:
      window = text.encode("utf-8")[:TTS_MAX_BYTES].decode("utf-8", errors="ignore")
      match = re.search(r"[.!?][^.!?]*$", window)
      cut = match.start() + 1 if match else len(window)
      chunks.append(text[:cut].strip())
      text = text[cut:].strip()
  ```

- **Playback loop with stop support**: A `threading.Event` lets the `stop` handler interrupt the loop between chunks. The frontend receives `speaking` status messages so it can update the UI in real time.

  ```python
  ui.send_message("speaking", {"status": "started"})
  for chunk in chunks:
      if stop_event.is_set():
          break
      if chunk.strip():
          tts.speak(chunk)
  ui.send_message("speaking", {"status": "finished"})
  ```

- **Event registration**: WebSocket messages are bound to the handlers and the App is started.

  ```python
  ui.on_message("speak", speak)
  ui.on_message("stop", stop)

  App.run()
  ```

### 💻 Frontend (`index.html` + `app.js`)

The page is a single-screen editor with a Play/Stop toggle button and a timer. All state changes go through a Socket.IO connection to the `web_ui` Brick.

- **Sending text**: When the user presses Play, the frontend emits a `speak` event with the current textarea value. Pressing the same button while speaking emits `stop` instead.

  ```javascript
  playStopButton.addEventListener('click', () => {
      if (isSpeaking) {
          socket.emit('stop', {});
      } else {
          const text = textInput.value.trim();
          if (text) {
              socket.emit('speak', { text });
          }
      }
  });
  ```

- **Status synchronization**: The backend's `speaking` messages drive the icon, label, timer, and disabled-state of the controls so the UI always reflects what the synthesizer is actually doing.

  ```javascript
  socket.on('speaking', (data) => {
      if (data.status === 'started') {
          isSpeaking = true;
          startTimer();
          updateControls();
      } else if (data.status === 'finished') {
          isSpeaking = false;
          stopTimer();
          updateControls();
      }
  });
  ```

## Troubleshooting

### No audio comes out of the speaker

**Fix:** Confirm that a USB speaker is connected and visible on the host with `aplay -l`. The `tts` Brick targets `usb:1` by default and will fail with `No ALSA speakers found` if no USB audio class device is present.

### App start fails with "Speaker is busy"

**Fix:** Another audio service is already holding the device exclusively (PipeWire or PulseAudio from a desktop session is the most common cause). Stop the conflicting service or run the board in headless mode so the `tts` Brick can open the speaker.

### Synthesis returns an error or never finishes

**Fix:** Check that the `audio-analytics-runner` container is healthy. The first run downloads the model and may take several minutes; subsequent runs start in seconds.
