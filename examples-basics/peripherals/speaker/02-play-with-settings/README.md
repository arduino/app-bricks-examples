# Play with Settings

The **Play with Settings** example builds on **Play Simple WAV** by showing how to pick a specific USB speaker and adjust its playback volume before sending audio to it.

## Description

This example demonstrates three useful features of the `Speaker` peripheral when more than one USB speaker may be present, or when the application needs deterministic playback levels:

1. listing the USB speakers connected to the board with `Speaker.list_usb_devices()`,
2. selecting a specific device using the `USB_SPEAKER_1` / `USB_SPEAKER_2` macros,
3. reading and setting the playback volume via the ALSA mixer (`get_volume`, `set_volume`).

The audio is once again a short 16-bit PCM WAV file shipped with the project.

## Bricks Used

**This example does not use any Bricks.** It uses the `Speaker` peripheral from `arduino.app_peripherals.speaker`.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB speaker (x1, or more to test multi-device selection)

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
from arduino.app_peripherals.speaker import Speaker
print(Speaker.list_usb_devices())
```

`list_usb_devices()` is a static method that returns the ALSA `plughw:` device strings of every USB speaker enumerated on the board, in stable order.

- **Selecting a specific speaker.**

```python
speaker = Speaker(
    device=Speaker.USB_SPEAKER_1,
    sample_rate=sample_rate,
    channels=channels,
    format="S16_LE",
)
```

`USB_SPEAKER_1` / `USB_SPEAKER_2` are convenience macros that map to the first / second USB speaker in the list, so you don't need to hard-code the underlying ALSA device string.

- **Adjusting the volume.**

```python
print(speaker.get_volume())   # -1 if no mixer is available
speaker.set_volume(60)        # 0 - 100
```

`get_volume()` returns the current playback level on the ALSA mixer of the selected card (or `-1` if the device exposes no mixer). `set_volume()` accepts an integer between `0` and `100`.

- **Playing the audio.**

```python
speaker.start()
speaker.play(frames)
speaker.stop()
```

The `start` / `play` / `stop` sequence is identical to the **Play Simple WAV** example.

The high-level data flow looks like this:

```
list_usb_devices() → pick USB_SPEAKER_1 → set_volume(60) → play() → ALSA → USB speaker
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Python script (`main.py`)

The Python® component drives the whole flow.

- **`Speaker.list_usb_devices()`:** Returns the list of available USB speaker ALSA devices. Useful at startup to verify that the expected hardware is connected.

- **`Speaker(device=Speaker.USB_SPEAKER_1, ...)`:** Creates the Speaker bound to the first USB speaker. Replace with `USB_SPEAKER_2`, `USB_SPEAKER_3`, ... to address other speakers, or pass an explicit `plughw:CARD=...` string.

- **`speaker.get_volume()`:** Reads the current volume in percent. Returns `-1` when the device has no controllable mixer.

- **`speaker.set_volume(60)`:** Sets the volume to 60%. Raises `ValueError` for values outside `0-100`.

- **`speaker.start()` / `speaker.play(frames)` / `speaker.stop()`:** Same lifecycle as in the simple WAV example.

- **`App.run()`:** Keeps the Python® process alive so that App Lab can manage the start/stop lifecycle.

## Related Inspirational Examples
- Play Simple WAV
- Play PCM
