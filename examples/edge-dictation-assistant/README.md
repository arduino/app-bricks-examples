# Edge Dictation Assistant

The **Edge Dictation Assistant** example creates a simple dictation assistant that converts your speech to text and displays it on a UI, using the Arduino® VENTUNO™ Q.

## Description

This App uses AI to dictate the audio captured with the microphone and the VENTUNO Q. It uses the `asr` Brick which uses a local model, with support for real-time processing. And the `web_ui` Brick to provide a recording and text interface.

## Bricks Used

The Edge Dictation Assistant example uses the following Bricks:

- `asr`: Brick that provides on-device automatic speech recognition (ASR) capabilities for the audio stream. It offers a high-level interface for transcribing audio using a local model, with support for both real-time audio capture and batch processing.
- `web_ui`: Brick to create the audio recording web interface.

## Hardware and Software Requirements

### Hardware

- Arduino VENTUNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub)
- USB microphone (or headset)
- A power supply (5 V, 3 A) for the USB hub (e.g. a phone charger)

### Software

- Arduino App Lab

## How to Use the Example

### Hardware Setup

1. Connect an USB-C® hub to the board
2. Connect a USB microphone or headset to the USB-C® hub.
3. Power the USB-C hub from a 5V power source (e.g. phone charger).

![Setting up the USB-C® hub](assets/docs_assets/hardware-setup.png)

### Configure & Launch App

1. **Duplicate the Example**
   Since built-in examples are read-only, you must duplicate this App to edit the configuration. Click the arrow next to the App name and select **Duplicate** or click the **Copy and edit app** button on the top right corner of the App page.
   ![Duplicate example](assets/docs_assets/duplicate-app.png)

2. **Run the App**
   Launch the App by clicking the **Run** button in the top right corner. Wait for the App to start.
   ![Launch the App](assets/docs_assets/launch-app.png)

3. **Access the Web Interface**
   Open the App in your browser at `<VENTUNO-IP-ADDRESS>:7000`.

### Interacting with the App

1. **Start dictation**
   On the UI interface press the microphone button to start collecting audio from the microphone connected to the VENTUNO. The dictation will automatically start showing on the UI.

2. **Copy or start new dictation**
   After the dictation is finished you can hit the copy button to quickly copy the dictation result. Or press the new recording button to start a new dictation process.

## How it Works

Once the App is running, it performs the following operations:

- **Dictation UI**: The `web_ui` Brick creates an HTML page where users can interact with the dictation process.
- **ASR Inference**: The `asr` Brick sends the audio to the automatic speech recognition engine that processes the audio and gives back the dictation on the UI.

## Understanding the Code

### 🔧 Backend (`main.py`)

The Python® script handles the logic of connecting to the speech recognition brick and managing the data flow.

- **Initialization**: The `AutomaticSpeechRecognition` is set up with a system prompt that enforces HTML formatting for the output.

```python
def start_dictation(session_id, data):
    stream = asr.transcribe_mic_stream(mic)
    for chunk in stream:
        ui.send_message("transcription", {"type": chunk.type, "text": chunk.data})
```

### 💻 Frontend (`app.js`)

The JavaScript manages the complex UI interactions, buttons, and WebSocket communication.

```javascript

function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (isRecording) {
            pauseRecording();
        }
    }, SILENCE_TIMEOUT_MS);
}

function startRecording() {
    isRecording = true;
    socket.emit('start_dictation', {});
    resetSilenceTimer();
    updateUI();
}

function pauseRecording() {
    isRecording = false;
    clearTimeout(silenceTimer);
    socket.emit('stop_dictation', {});
    partialText.textContent = '';
    updateUI();
}

function updateUI() {
    const hasText = fullText.length > 0;
    placeholderText.style.display = (hasText || isRecording) ? 'none' : 'block';

    if (isRecording) {
        micButton.classList.add('recording');
        statusLabel.textContent = 'Listening...';
        statusLabel.classList.add('recording');
        newRecordingButton.disabled = true;
        newRecordingButton.classList.add('disabled');
        copyButton.disabled = true;
        copyButton.classList.add('disabled');
    } else {
        micButton.classList.remove('recording');
        statusLabel.textContent = hasText ? 'Paused' : 'Ready';
        statusLabel.classList.remove('recording');
        newRecordingButton.disabled = !hasText;
        newRecordingButton.classList.toggle('disabled', !hasText);
        copyButton.disabled = !hasText;
        copyButton.classList.toggle('disabled', !hasText);
    }
}
```
