# Microphone Capture and Stream

The **Microphone Capture and Stream** example shows two ways to read audio from a `Microphone`: with a single `capture()` call and with the continuous `stream()` generator. The script starts the microphone, reads one chunk explicitly, then reads a few streamed chunks, prints a summary for each one, and finally stops the stream.

## Description

This example demonstrates two closely related workflows of the `Microphone` peripheral. It starts with `capture()`, which reads a single audio chunk, and then moves to `stream()`, which keeps producing chunks continuously in a `for` loop. This makes the example a good introduction to the relationship between one-shot chunk capture and continuous streaming.

The example keeps the streamed part short by stopping after a small number of chunks, so the console output remains easy to inspect. For each received chunk, the script prints a compact summary with the number of samples, the data type, and the minimum and maximum values.

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
3. Watch the Python® console print a summary for the chunk returned by `capture()` and for each streamed audio chunk
4. Stop the App from App Lab when you are done

## How it Works

Once the application is running, the device performs the following operations:

- **Creating and starting the microphone.**

The example creates a non-shared microphone instance and starts it explicitly before entering the stream loop:

```python
microphone = Microphone(shared=False)
microphone.start()
```

- **Reading a single audio chunk with `capture()`.**

The example first shows the most direct way to read one chunk from the microphone:

```python
captured_chunk = microphone.capture()
```

If a chunk is available, it is printed with the same helper used later for the stream:

```python
if captured_chunk is not None:
    print_chunk_summary("Single chunk captured with capture()", captured_chunk)
```

`capture()` can also return `None` if no audio is available at that moment.

- **Reading audio chunks continuously from `stream()`.**

The `stream()` method yields one audio chunk at a time:

```python
for audio_chunk in microphone.stream():
    print_chunk_summary(f"Stream chunk {received_chunks}", audio_chunk)
```

Each `audio_chunk` is a NumPy array containing the samples captured for that step of the stream.

- **Stopping the stream after a few chunks.**

The example stops the microphone explicitly after a fixed number of chunks:

```python
if received_chunks >= STREAM_CHUNK_LIMIT:
    microphone.stop()
```

The high-level data flow looks like this:

```
Microphone.capture() → Single Audio Chunk → Python® Console
Microphone.stream() → Audio Chunks → Python® Console
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

- **`STREAM_CHUNK_LIMIT`:** Keeps the example short by limiting the number of streamed chunks processed before stopping.

- **`print_chunk_summary(...)`:** Helper function that prints the number of samples, data type, and numeric range of each received chunk.

- **`microphone.start()`:** Opens the microphone before streaming begins.

- **`microphone.capture()`:** Reads a single chunk from the microphone and returns it as a NumPy array, or `None` if no audio is available yet.

- **`microphone.stream()`:** Returns a generator that yields audio chunks continuously while the microphone is running.

- **`microphone.stop()`:** Stops the stream by stopping the microphone itself.

- **`App.run()`:** Keeps the app manageable from Arduino App Lab after the example code has been executed.

## Related Inspirational Examples
- `Hey Arduino!`
