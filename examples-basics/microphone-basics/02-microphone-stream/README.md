# Microphone Stream

The **Microphone Stream** example shows how to consume audio data continuously from a `Microphone` using the `stream()` generator. The script starts the microphone, reads a few streamed chunks, prints a summary for each one, and then stops the stream.

## Description

This example demonstrates the streaming workflow of the `Microphone` peripheral. Instead of calling `capture()` manually for each chunk, the code uses `stream()` to receive audio chunks continuously in a `for` loop. This is useful when you want to process live microphone data incrementally.

The example keeps the loop short by stopping after a small number of chunks, so the console output remains easy to inspect. For each received chunk, the script prints a compact summary with the number of samples, the data type, and the minimum and maximum values.

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
3. Watch the Python® console print a summary for each streamed audio chunk
4. Stop the App from App Lab when you are done

## How it Works

Once the application is running, the device performs the following operations:

- **Creating and starting the microphone.**

The example creates a non-shared microphone instance and starts it explicitly before entering the stream loop:

```python
microphone = Microphone(shared=False)
microphone.start()
```

- **Reading audio chunks from `stream()`.**

The `stream()` method yields one audio chunk at a time:

```python
for audio_chunk in microphone.stream():
    print_chunk_summary(received_chunks, audio_chunk)
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
Microphone.stream() → Audio Chunks → Python® Console
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

- **`STREAM_CHUNK_LIMIT`:** Keeps the example short by limiting the number of streamed chunks processed before stopping.

- **`print_chunk_summary(...)`:** Helper function that prints the number of samples, data type, and numeric range of each received chunk.

- **`microphone.start()`:** Opens the microphone before streaming begins.

- **`microphone.stream()`:** Returns a generator that yields audio chunks continuously while the microphone is running.

- **`microphone.stop()`:** Stops the stream by stopping the microphone itself.

- **`App.run()`:** Keeps the app manageable from Arduino App Lab after the example code has been executed.

## Related Inspirational Examples
- - `Hey Arduino!`
