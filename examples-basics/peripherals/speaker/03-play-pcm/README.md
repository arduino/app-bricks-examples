# Play PCM

The **Play PCM** example shows how to feed the `Speaker` peripheral with audio samples generated at runtime, without using a WAV file or any other audio asset.

## Description

This example uses `numpy` to synthesize a short C major scale: each note is a sine wave of a different frequency, generated as a `numpy.int16` array. The samples are sent directly to the `Speaker` peripheral, which interprets them as raw 16-bit signed little-endian PCM and streams them to the ALSA audio subsystem.

It is the simplest pattern to follow whenever you want to play synthesized audio (tones, beeps, generated voice samples, sensor sonification, ...) instead of pre-recorded files.

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
3. A short C major scale (C4 → C5) is played once, with each note generated on the fly.

To experiment, change the `SCALE_HZ` list, the `NOTE_DURATION_S` constant, the amplitude (`0.3` in `make_tone`), or replace the sine with a different waveform (square, triangle, ...).

## How it Works

Once the application starts, the device performs the following operations:

- **Generating PCM samples with numpy.**

```python
import numpy as np

t = np.arange(n_samples, dtype=np.float32) / SAMPLE_RATE
wave = 0.3 * np.sin(2 * np.pi * freq_hz * t)
samples = (wave * 32767).astype(np.int16)
```

The signal is generated as a `float32` sine in the range `[-0.3, 0.3]` and then scaled to the full `int16` range. `int16` matches the `S16_LE` ALSA format used by the speaker, so no further conversion is needed.

- **Configuring the Speaker.**

```python
from arduino.app_peripherals.speaker import Speaker
speaker = Speaker(sample_rate=16000, channels=1, format="S16_LE")
speaker.start()
```

The format string must be coherent with the data type produced by numpy. Use `"FLOAT_LE"` if you prefer to send the raw `float32` samples without rescaling.

- **Streaming samples note by note.**

```python
for freq in SCALE_HZ:
    samples = make_tone(freq, NOTE_DURATION_S)
    speaker.play(samples)
```

`Speaker.play()` accepts both `bytes` and `numpy.ndarray`. When given an array, it serializes it to the configured PCM format internally and pushes it to the playback queue. The call returns immediately, so a tight loop can produce audio in real time.

The high-level data flow looks like this:

```
numpy sine wave → Speaker.play(np.int16) → ALSA → USB speaker
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Python script (`main.py`)

The Python® component is fully responsible for both generating and playing the audio.

- **`make_tone(freq_hz, duration_s)`:** Builds a `numpy.int16` array containing one sine-wave note. The amplitude is kept at `0.3` to leave headroom and avoid clipping.

- **`Speaker(sample_rate=16000, channels=1, format="S16_LE")`:** Creates the speaker with parameters that match the generated samples.

- **`speaker.play(samples)`:** Enqueues the numpy array for playback. The Speaker handles the conversion to bytes using the configured format.

- **`time.sleep(...)`:** Waits long enough for all the queued notes to actually leave the speaker before calling `stop()`.

- **`speaker.stop()`:** Closes the ALSA device and stops the internal playback thread.

- **`App.run()`:** Keeps the Python® process alive so that App Lab can manage the start/stop lifecycle.

## Related Inspirational Examples
- Play Simple WAV
- Play with Settings
