# Play Simple WAV

The **Play Simple WAV** example shows the minimal code needed to play a WAV file through a USB speaker on the Arduino UNO Q using the `Speaker` peripheral.

## Description

This example opens a 16-bit PCM WAV file shipped with the project, reads its raw audio frames and sends them to the `Speaker` peripheral. The `Speaker` peripheral wraps the ALSA audio subsystem on the MPU, so no microcontroller sketch is required: the sound is generated entirely from the Python® side.

## Bricks Used

**This example does not use any Bricks.** It uses the `Speaker` peripheral from `arduino.app_peripherals.speaker`.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB speaker (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Connect a USB speaker to the Arduino UNO Q.
2. Run the App.
3. A short 440 Hz tone (`assets/audio/sample.wav`) is played once on the speaker.

You can replace `assets/audio/sample.wav` with any other 16-bit PCM WAV file. The script reads the sample rate and channel count from the file header, so mono and stereo WAVs at any standard rate (16 kHz, 44.1 kHz, 48 kHz, ...) all work without code changes.

## How it Works

Once the application starts, the device performs the following operations:

- **Reading the WAV file.**

```python
import wave
with wave.open(WAV_PATH, "rb") as wav:
    sample_rate = wav.getframerate()
    channels = wav.getnchannels()
    frames = wav.readframes(wav.getnframes())
```

The standard library `wave` module parses the WAV header so we know the audio parameters and we can extract the raw PCM bytes.

- **Configuring the Speaker.**

```python
from arduino.app_peripherals.speaker import Speaker
speaker = Speaker(sample_rate=sample_rate, channels=channels, format="S16_LE")
```

The `Speaker` instance must be configured with the same sample rate, channel count and sample format as the audio data. `"S16_LE"` corresponds to the standard 16-bit signed little-endian PCM format used by most WAV files.

- **Playing the audio.**

```python
speaker.start()
speaker.play(frames)
speaker.stop()
```

`start()` opens the ALSA device and spawns the internal playback thread. `play()` enqueues the bytes and returns immediately. `stop()` closes the ALSA device once the playback is over.

The high-level data flow looks like this:

```
WAV file → wave.readframes() → Speaker.play() → ALSA → USB speaker
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Python script (`main.py`)

The Python® component reads the file and drives the speaker.

- **`wave.open(path, "rb")`:** Opens the WAV file and exposes the audio parameters (`getframerate`, `getnchannels`, `getsampwidth`) and the PCM frames (`readframes`).

- **`Speaker(sample_rate=..., channels=..., format="S16_LE")`:** Creates the Speaker peripheral, auto-selecting the first USB speaker found on the system (`USB_SPEAKER_1`).

- **`speaker.start()`:** Opens the ALSA PCM device and starts the playback thread.

- **`speaker.play(frames)`:** Pushes the raw PCM bytes into the playback queue. The call returns as soon as the data has been queued, without waiting for the audio to finish playing.

- **`time.sleep(...)`:** Waits long enough for all the queued frames to actually leave the speaker before closing the device.

- **`speaker.stop()`:** Releases the ALSA device.

- **`App.run()`:** Keeps the Python® process alive so that App Lab can manage the start/stop lifecycle cleanly.

## Related Inspirational Examples
- Play with Settings
- Play PCM
