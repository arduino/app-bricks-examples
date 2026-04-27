# Microphone Record PCM

The **Microphone Record PCM** example shows how to record a fixed amount of raw PCM audio from a `Microphone` using `record_pcm(duration)`. The script starts the microphone, records for a few seconds, prints a summary of the returned NumPy array, and then stops the microphone.

## Description

This example demonstrates the `record_pcm(duration)` method of the `Microphone` peripheral. Unlike a WAV recording, PCM data is returned as a raw NumPy array containing the captured samples. This is useful when you want to inspect, transform, analyze, or feed the audio data directly into another Python® workflow.

The example keeps the recording short and prints a few useful details such as sample count, duration, data type, numeric range, and the first samples.

## Bricks Used

**This example does not use any Bricks.** It shows direct use of the `Microphone` peripheral from Python®.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)
- USB-C® hub (x1)
- USB microphone (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Connect a USB microphone to the board through a USB-C® hub
2. Run the App
3. Watch the Python® console print the PCM recording summary
4. Stop the App from App Lab when you are done

## How it Works

Once the application is running, the device performs the following operations:

- **Configuring and starting the microphone.**

The example creates a microphone with an explicit sample rate, channel count, format, and buffer size:

```python
microphone = Microphone(
    device=PCM_DEVICE,
    sample_rate=PCM_SAMPLE_RATE,
    channels=PCM_CHANNELS,
    format=PCM_FORMAT,
    buffer_size=PCM_BUFFER_SIZE,
)

microphone.start()
```

- **Recording raw PCM samples.**

The `record_pcm(duration)` method records a fixed-duration buffer and returns the captured samples as a NumPy array:

```python
pcm_audio = microphone.record_pcm(PCM_DURATION_SECONDS)
```

- **Inspecting the returned data.**

The example prints a short summary of the returned audio buffer:

```python
print(f"- samples: {len(audio)}")
print(f"- dtype: {audio.dtype.name}")
print(f"- duration_seconds: {len(audio) / (sample_rate * channels):.2f}")
print(f"- first_10_samples: {audio[:10].tolist()}")
```

The high-level data flow looks like this:

```
Microphone.record_pcm(duration) → NumPy PCM array → Python® Console
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

- **PCM configuration constants:** `PCM_DEVICE`, `PCM_SAMPLE_RATE`, `PCM_CHANNELS`, `PCM_FORMAT`, `PCM_BUFFER_SIZE`, and `PCM_DURATION_SECONDS` define the recording setup.

- **`microphone.start()`:** Opens the microphone before the recording begins.

- **`record_pcm(duration)`:** Records a fixed-duration PCM buffer and returns it as a NumPy array.

- **`print_pcm_summary(...)`:** Helper function that prints the sample count, expected size, duration, numeric range, and a preview of the first samples.

- **`microphone.stop()`:** Stops the microphone after the PCM recording is complete.

- **`App.run()`:** Keeps the app manageable from Arduino App Lab after the example code has been executed.

## Related Inspirational Examples
- `Recording from microphone and file save`
- `Microphone stream`
