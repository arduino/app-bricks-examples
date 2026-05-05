# Play Simple WAV

The **Play Simple WAV** example shows the minimal code needed to play a WAV file through a USB speaker on the Arduino UNO Q using the `Speaker` peripheral.

## Description

This example uses the static helper `Speaker.play_wav()`, which auto-detects the sample rate, channel count and sample format from the WAV header, opens the first USB speaker, plays the audio and closes the device. It is the most concise way to play a pre-recorded WAV file from Python® on the Arduino UNO Q.

The audio is generated entirely from the Python® / MPU side (via the ALSA audio subsystem), so no microcontroller sketch is required.

## Bricks Used

**This example does not use any Bricks.** It uses the `Speaker` peripheral from `arduino.app_peripherals.speaker`.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB speaker or USB headphones (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Connect a USB speaker (or USB headphones) to the Arduino UNO Q.
2. Run the App.
3. A short 440 Hz tone (`assets/audio/sample.wav`) is played once on the speaker.

You can replace `assets/audio/sample.wav` with any other uncompressed PCM WAV file. Sample rate, channel count and bit depth are read from the file header, so 16 kHz/44.1 kHz/48 kHz, mono and stereo, 8/16/24/32-bit WAVs all work without code changes.

## How it Works

Once the application starts, the device performs the following operations:

- **Loading the WAV file as a numpy array.**

```python
import numpy as np
wav_audio = np.fromfile(WAV_PATH, dtype=np.uint8)
```

`Speaker.play_wav()` expects the entire WAV file (header + PCM samples) wrapped in a `numpy.uint8` array. `np.fromfile` is the simplest way to obtain that.

- **Playing the audio with the static helper.**

```python
from arduino.app_peripherals.speaker import Speaker
Speaker.play_wav(wav_audio)
```

The static method takes care of:

  - parsing the WAV header (`sample_rate`, `channels`, `sampwidth`),
  - building a `Speaker` configured with the matching numpy dtype (`np.int16` for 16-bit PCM, `np.uint8` for 8-bit, etc.),
  - opening the ALSA device, writing the samples and closing the device when done.

If you need to control the device, the volume or any other parameter, see the **Play with Settings** example.

The high-level data flow looks like this:

```
WAV file → np.fromfile → Speaker.play_wav() → ALSA → USB speaker
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Python script (`main.py`)

The Python® component reads the file and triggers the playback.

- **`np.fromfile(WAV_PATH, dtype=np.uint8)`:** Loads the WAV file as a flat byte array. The `Speaker.play_wav()` helper parses the header internally.

- **`Speaker.play_wav(wav_audio)`:** Static helper that opens the first USB speaker, plays the audio with the correct format and closes the device automatically.

- **`App.run()`:** Keeps the Python® process alive so that App Lab can manage the start/stop lifecycle cleanly after the playback ends.

## Related Inspirational Examples
- Play with Settings
- Play PCM
