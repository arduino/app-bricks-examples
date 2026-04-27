# Microphone and Properties

The **Microphone and Properties** example shows three basic ways to access a `Microphone`: using the default settings, using an explicit configuration, and using context manager syntax. Each section starts the microphone, prints its main properties in the Python® console, and then releases it.

## Description

This example demonstrates the basic setup workflow for the `Microphone` peripheral. It starts with the simplest pattern, `Microphone()`, then shows how to pass custom settings such as `device`, `sample_rate`, `channels`, `format`, `buffer_size`, and `shared`. Finally, it introduces the `with Microphone() as mic:` syntax, which automatically starts and stops the microphone around a block of code.

The example does not record or stream audio yet. Its goal is to make microphone creation, configuration, property inspection, and lifecycle control easy to understand before moving to more advanced microphone examples.

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
3. Watch the Python® console print the default configuration, the custom configuration, and the context manager configuration
4. Stop the App from App Lab when you are done

## How it Works

Once the application is running, the device performs the following operations:

- **Creating a microphone with default settings.**

The first part of the example uses `Microphone()` without arguments. This is the simplest way to create a microphone instance:

```python
default_microphone = Microphone()
default_microphone.start()
print_microphone_properties(default_microphone)
default_microphone.stop()
```

- **Creating a microphone with custom settings.**

The second part defines the most important settings explicitly:

```python
MIC_DEVICE = Microphone.USB_MIC_1
MIC_SAMPLE_RATE = Microphone.RATE_44K
MIC_CHANNELS = Microphone.CHANNELS_MONO
MIC_FORMAT = "float32"
MIC_BUFFER_SIZE = Microphone.BUFFER_SIZE_BALANCED
MIC_SHARED = False
```

Those values are then passed to the constructor:

```python
custom_microphone = Microphone(
    device=MIC_DEVICE,
    sample_rate=MIC_SAMPLE_RATE,
    channels=MIC_CHANNELS,
    format=MIC_FORMAT,
    buffer_size=MIC_BUFFER_SIZE,
    shared=MIC_SHARED
)
custom_microphone.volume = 80
```

- **Accessing the microphone with context manager syntax.**

The third part uses `with Microphone() as mic:`. This pattern automatically starts the microphone when entering the block and stops it when leaving the block:

```python
with Microphone() as mic:
    print_microphone_properties(mic)
```

- **Printing the configured properties.**

The helper function `print_microphone_properties(...)` prints the main attributes and properties for each microphone instance:

```python
print(f"- requested_device: {microphone.device}")
print(f"- resolved_device: {microphone.device_stable_ref}")
print(f"- sample_rate: {microphone.sample_rate} Hz")
print(f"- channels: {microphone.channels}")
print(f"- format: {microphone.format.name}")
print(f"- buffer_size: {microphone.buffer_size} frames")
print(f"- volume: {microphone.volume}%")
print(f"- is_started: {microphone.is_started()}")
print(f"- shared: {microphone.shared}")
```

The high-level data flow looks like this:

```
Default Microphone → Start → Python® Console → Stop
Custom Microphone → Start → Python® Console → Stop
Context Manager → Auto Start → Python® Console → Auto Stop
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

- **`print_microphone_properties(...)`:** Helper function that avoids repeating the same property-printing code for each microphone instance.

- **`Microphone()`:** Creates a microphone using the default settings.

- **Custom configuration constants:** `MIC_DEVICE`, `MIC_SAMPLE_RATE`, `MIC_CHANNELS`, `MIC_FORMAT`, `MIC_BUFFER_SIZE`, and `MIC_SHARED` define the explicit microphone setup.

- **`Microphone(...)`:** Creates a microphone using the selected device and audio format settings.

- **`volume`:** Writable property used to set the software volume after construction.

- **`start()` / `stop()`:** Lifecycle methods used to open and release the microphone manually.

- **`with Microphone() as mic`:** Context manager pattern that starts and stops the microphone automatically around a block of code.

- **Property access:** `device`, `device_stable_ref`, `name`, `sample_rate`, `channels`, `format`, `buffer_size`, `volume`, `is_started()`, and `shared` show how to inspect the configured values and lifecycle state.

- **`App.run()`:** Keeps the app manageable from Arduino App Lab after the example code has been executed.

## Related Inspirational Examples
- `Hey Arduino!`
