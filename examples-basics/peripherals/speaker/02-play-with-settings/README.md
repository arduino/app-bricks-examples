# Play with Settings

The **Play with Settings** example builds on **Play Simple WAV** by showing how to pick a specific USB speaker and adjust its playback volume before sending audio to it.

## Description

This example demonstrates three useful features of the `Speaker` peripheral when more than one USB speaker may be present, or when the application needs deterministic playback levels:

1. listing the USB speakers connected to the board with `ALSASpeaker.list_usb_devices()`,
2. selecting a specific device using the `USB_SPEAKER_1` / `USB_SPEAKER_2` macros,
3. setting the playback volume via the `speaker.volume` property (a software volume in the 0-100 range, applied to each PCM chunk before it is sent to ALSA).

The audio is once again a short 16-bit PCM WAV file shipped with the project.

## Bricks Used

**This example does not use any Bricks.** It uses the `Speaker` peripheral from `arduino.app_peripherals.speaker`.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB speaker or USB headphones (x1, or more to test multi-device selection)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Connect one (or more) USB speakers to the Arduino UNO Q.
2. Run the App.
3. The Python® console prints the list of detected speakers and the current volume.
4. The script sets the volume to 60% and plays `assets/audio/sample.wav` on `USB_SPEAKER_1`.

To play on a second speaker, change `Speaker.USB_SPEAKER_1` to `Speaker.USB_SPEAKER_2` in `main.py`.

## How it Works

Once the application starts, the device performs the following operations:

- **Listing the USB speakers.**

```python
from arduino.app_peripherals.speaker import Speaker, ALSASpeaker
print(ALSASpeaker.list_usb_devices())
```

`list_usb_devices()` is a static method on `ALSASpeaker` (the concrete class returned by the `Speaker(...)` factory). It returns the ALSA device names (in the form `CARD=...,DEV=...`) of every USB speaker enumerated on the board, in stable order.

- **Selecting a specific speaker and configuring the format.**

```python
import numpy as np
speaker = Speaker(
    device=Speaker.USB_SPEAKER_1,
    sample_rate=Speaker.RATE_16K,
    channels=Speaker.CHANNELS_MONO,
    format=np.int16,
)
```

`USB_SPEAKER_1` / `USB_SPEAKER_2` map to the first / second USB speaker in the list, so you don't need to hard-code the underlying ALSA device string. The audio format is expressed as a numpy dtype: `np.int16` corresponds to 16-bit signed PCM, which matches the WAV file shipped with this example. Other valid choices include `np.float32`, `np.uint8`, `'<i2'`, etc.

- **Adjusting the volume.**

```python
print(speaker.volume)        # current value (0-100)
speaker.volume = 60          # set to 60%
```

`speaker.volume` is a property that exposes a software volume control: each PCM sample is multiplied (and clipped) by the configured factor before being written to ALSA. Values must be in the `0-100` range; anything else raises `ValueError`.

- **Playing the audio.**

```python
with speaker:
    speaker.play_wav(wav_audio)
```

Using the speaker as a context manager calls `start()` on entry and `stop()` on exit, so the ALSA device is opened and released automatically. `speaker.play_wav()` (the instance method, distinct from the static helper used in **Play Simple WAV**) plays a WAV blob assuming its sample rate / channels match the speaker configuration.

The high-level data flow looks like this:

```
ALSASpeaker.list_usb_devices() → pick USB_SPEAKER_1 → speaker.volume = 60 → play_wav() → ALSA → USB speaker
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Python script (`main.py`)

The Python® component drives the whole flow.

- **`ALSASpeaker.list_usb_devices()`:** Returns the list of available USB speaker ALSA devices. The method lives on `ALSASpeaker`, not on the `Speaker` factory. Useful at startup to verify that the expected hardware is connected.

- **`Speaker(device=Speaker.USB_SPEAKER_1, sample_rate=..., channels=..., format=np.int16)`:** Creates the Speaker bound to the first USB speaker, configured for 16-bit signed PCM at 16 kHz, mono. Replace `USB_SPEAKER_1` with `USB_SPEAKER_2` (and so on) to address other speakers, or pass a stable ALSA reference such as `"CARD=USB,DEV=0"`.

- **`speaker.volume`:** Property exposing the software volume in percent (0-100). Read it for the current value, assign to it to change the level.

- **`with speaker:`:** Opens and closes the ALSA device automatically (equivalent to `speaker.start()` / `speaker.stop()`).

- **`speaker.play_wav(wav_audio)`:** Plays the WAV blob through the configured device.

- **`App.run()`:** Keeps the Python® process alive so that App Lab can manage the start/stop lifecycle.

## Related Inspirational Examples
- Play Simple WAV
- Play PCM
