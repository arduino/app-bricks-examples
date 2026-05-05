# Play PCM

The **Play PCM** example shows how to feed the `Speaker` peripheral with audio samples generated at runtime, without using a WAV file or any other audio asset.

## Description

This example uses `numpy` to synthesize a short C major scale: each note is a sine wave of a different frequency, generated as a `numpy.int16` array and sent to the `Speaker` peripheral via `play_pcm()`. The Speaker streams the samples to the ALSA audio subsystem in chunks.

It is the simplest pattern to follow whenever you want to play synthesized audio (tones, beeps, generated voice samples, sensor sonification, ...) instead of pre-recorded files.

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

The signal is generated as a `float32` sine in the range `[-0.3, 0.3]` and then scaled to the full `int16` range. The `int16` dtype matches the `format=np.int16` configured on the speaker, so no further conversion is needed.

- **Configuring the Speaker.**

```python
from arduino.app_peripherals.speaker import Speaker
speaker = Speaker(
    sample_rate=Speaker.RATE_16K,
    channels=Speaker.CHANNELS_MONO,
    format=np.int16,
)
```

`format` must be a numpy dtype (or a dtype-like string such as `'<i2'`). Use `np.float32` if you prefer to send the raw `float32` samples without rescaling.

- **Streaming samples note by note.**

```python
with speaker:
    for freq in SCALE_HZ:
        samples = make_tone(freq, NOTE_DURATION_S)
        speaker.play_pcm(samples)
```

`speaker.play_pcm()` splits the input array into chunks of `buffer_size` frames and writes them to ALSA one after the other, blocking until each chunk is accepted. Using the speaker as a context manager calls `start()` / `stop()` automatically.

The high-level data flow looks like this:

```
numpy sine wave → speaker.play_pcm(np.int16) → ALSA → USB speaker
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Python script (`main.py`)

The Python® component is fully responsible for both generating and playing the audio.

- **`make_tone(freq_hz, duration_s)`:** Builds a `numpy.int16` array containing one sine-wave note. The amplitude is kept at `0.3` to leave headroom and avoid clipping.

- **`Speaker(sample_rate=Speaker.RATE_16K, channels=Speaker.CHANNELS_MONO, format=np.int16)`:** Creates the Speaker with parameters that match the generated samples. `RATE_16K` and `CHANNELS_MONO` are convenience constants exposed by the `Speaker` class.

- **`with speaker:`:** Opens and closes the ALSA device automatically.

- **`speaker.play_pcm(samples)`:** Sends the numpy array to the speaker, splitting it into `buffer_size` chunks internally. Blocks until ALSA has accepted the data.

- **`App.run()`:** Keeps the Python® process alive so that App Lab can manage the start/stop lifecycle.

## Related Inspirational Examples
- Play Simple WAV
- Play with Settings
