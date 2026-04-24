# Recording from Microphone and File Save

The **Recording from Microphone and File Save** example shows how to record audio from a `Microphone` using `record_wav(duration)` and save the result to disk with different file-writing patterns. The script demonstrates a direct save with `write_bytes(...)`, a save using Python file context manager syntax, and a full variant where both the microphone and the file are handled with context managers.

## Description

This example demonstrates a simple file-save workflow with the `Microphone` peripheral. Instead of working chunk by chunk, the app uses `record_wav(duration)` to capture a complete fixed-duration recording and returns it as ready-to-save WAV data.

The example then shows three increasingly explicit ways to save that WAV data:

- saving it directly with `Path.write_bytes(...)`
- saving the same data with `with open(..., "wb") as file`
- repeating the recording using `with Microphone(...) as mic` together with a file context manager

This makes the example a good second step in a microphone learning path: after learning how to configure the microphone, you can immediately move to a complete recording-and-save flow, while also seeing common Python resource management patterns.

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
3. Watch the Python® console print the saved WAV file paths and sizes
4. Find the generated files in the local `recordings/` folder created by the app
5. Stop the App from App Lab when you are done

## How it Works

Once the application is running, the device performs the following operations:

- **Preparing a writable output directory.**

The example creates an output directory relative to the app runtime directory where the recorded files will be stored:

```python
OUTPUT_DIR = Path("recordings")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
```

This keeps the example simple and avoids relying on an absolute path such as `/recordings`.

- **Creating and starting the microphone.**

The example first creates a non-shared microphone instance and starts it explicitly:

```python
microphone = Microphone(shared=False)
microphone.start()
```

- **Recording and saving a WAV file with `write_bytes(...)`.**

The `record_wav(duration)` method captures audio for a fixed amount of time and returns WAV data ready to save:

```python
wav_audio = microphone.record_wav(duration=3)
WAV_OUTPUT_FILE.write_bytes(wav_audio.tobytes())
```

- **Saving the same WAV data with file context manager syntax.**

The example also shows the equivalent save operation using Python's file context manager:

```python
with open(WAV_OUTPUT_FILE_WITH_CONTEXT, "wb") as file:
    file.write(wav_audio.tobytes())
```

- **Stopping the microphone after the first recording pass.**

Once the first recording and its two save variants are complete, the example stops the microphone explicitly:

```python
microphone.stop()
```

- **Using both microphone and file context managers.**

The last part repeats the recording workflow using a microphone context manager together with a file context manager:

```python
with Microphone(shared=False) as mic:
    mic.start()
    wav_audio = mic.record_wav(duration=3)
    with open(WAV_OUTPUT_FILE_WITH_DOUBLE_CONTEXT, "wb") as file:
        file.write(wav_audio.tobytes())
```

This alternative shows how both resources can be managed with `with` blocks.

The high-level data flow looks like this:

```
record_wav(duration) → WAV bytes → Path.write_bytes(...)
record_wav(duration) → WAV bytes → with open(..., "wb")
with Microphone(...) → record_wav(duration) → with open(..., "wb")
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

- **Output directory setup:** `OUTPUT_DIR` creates a local `recordings/` folder relative to the app runtime directory.

- **Output paths:** `WAV_OUTPUT_FILE`, `WAV_OUTPUT_FILE_WITH_CONTEXT`, and `WAV_OUTPUT_FILE_WITH_DOUBLE_CONTEXT` are used to save the three resulting WAV files.

- **`microphone.start()`:** Opens the microphone before the first recording begins.

- **`record_wav(duration)`:** Records a fixed-duration WAV buffer and returns it as bytes stored in a NumPy array.

- **`write_bytes(...)`:** Saves the WAV output directly to a file path.

- **`with open(..., "wb") as file`:** Alternative file-save pattern that opens the destination path, writes the WAV bytes, and closes the file automatically.

- **`microphone.stop()`:** Stops the microphone after the first recording phase is complete.

- **`with Microphone(...) as mic`:** Alternative pattern that manages the microphone lifecycle around the recording block.

- **Nested `with` blocks:** Show how microphone access and file writing can both be handled with context manager syntax.

- **`App.run()`:** Keeps the app manageable from Arduino App Lab after the example code has been executed.

## Related Inspirational Examples
- `Microphone stream`
- `Microphone record PCM`
