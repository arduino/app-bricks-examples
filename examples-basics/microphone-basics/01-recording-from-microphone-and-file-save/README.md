# Recording from Microphone and File Save

The **Recording from Microphone and File Save** example shows how to record audio from a `Microphone` using `record_wav(duration)` and save the result to a WAV file on disk.

## Description

This example demonstrates a simple record-and-save workflow with the `Microphone` peripheral. The app starts the microphone, records a fixed-duration WAV buffer, converts it to bytes, and writes it to a file using standard Python file handling.

This example shows a complete recording flow that produces a real audio file, while keeping the code short and easy to follow.

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
3. Wait for the recording to complete
4. Watch the Python® console print the path of the generated WAV file
5. Find the saved file in the local `recordings/` folder created by the app
6. Stop the App from App Lab when you are done

## How it Works

Once the application is running, the device performs the following operations:

- **Preparing a writable output directory.**

The example creates a local folder where the recorded file will be stored:

```python
OUTPUT_DIR = Path("recordings")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
```

- **Creating and starting the microphone.**

The example creates a non-shared microphone instance and starts it before recording:

```python
microphone = Microphone(shared=False)
microphone.start()
```

- **Recording a fixed-duration WAV buffer.**

The `record_wav(duration)` method captures audio for a fixed amount of time and returns WAV data:

```python
wav_audio = microphone.record_wav(duration=3)
```

- **Converting the WAV data to bytes and saving it to a file.**

The recorded WAV data is converted to bytes and written to `recordings/microphone-recording.wav`:

```python
wav_audio_bytes = wav_audio.tobytes()

with open(WAV_OUTPUT_FILE, "wb") as file:
    file.write(wav_audio_bytes)
```

- **Printing the saved file path.**

At the end of the recording flow, the example prints the output file path in the Python® console:

```python
print(f"WAV file saved in path: {WAV_OUTPUT_FILE}")
```

The high-level data flow looks like this:

```
record_wav(duration) → WAV bytes → with open(..., "wb")
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

- **Output directory setup:** `OUTPUT_DIR` creates a local `recordings/` folder relative to the app runtime directory.

- **Output file path:** `WAV_OUTPUT_FILE` defines where the recorded WAV file will be saved.

- **`microphone.start()`:** Opens the microphone before the recording begins.

- **`record_wav(duration)`:** Records a fixed-duration WAV buffer.

- **`wav_audio.tobytes()`:** Converts the recorded WAV data to raw bytes so it can be written to disk.

- **`with open(..., "wb") as file`:** Opens the destination file in binary write mode, saves the recorded bytes, and closes the file automatically.

- **`microphone.stop()`:** Stops the the microphone itself.

- **`App.run()`:** Keeps the app manageable from Arduino App Lab after the example code has been executed.

## Related Inspirational Examples
- `Hey Arduino!`
