# App register and start bricks

The **App register and start bricks** example shows how the App runtime manages the lifecycle of bricks at the lowest level. A plain `Greeter` class is registered manually on the `App` controller via `App.register()` and started explicitly via `App.start_brick()`, without relying on the `@brick` decorator or the all-in-one `App.run()` helper.

## Description

This example demonstrates how a user-defined class is wired to the App runtime by calling the underlying lifecycle primitives directly. The App controller exposes `App.register()` to add a brick to its waiting queue, `App.start_brick()` to start a single brick and spawn a worker thread for its `loop`/`execute` methods, `App.loop()` to keep the main thread alive until a shutdown signal, and `App.stop_brick()` to stop a running brick. Putting them together gives you full manual control over when each brick starts and stops, which is the same machinery that the higher-level `@brick` decorator and `App.run()` use under the hood.

## Bricks Used

**This example does not use any pre-built Bricks.** It defines a custom class and drives its lifecycle using the App controller's low-level API.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App
2. Watch the Python® console print the greeting every second, emitted by the brick's loop method

## How it Works

Once the application is running, the device performs the following operations:

- **Defining a plain brick class.**

No decorators are used. The App runtime discovers any method named `loop` (or decorated with `@brick.loop`) and runs it repeatedly in a dedicated worker thread:

```python
class Greeter:
    def loop(self):
        print("Hello from the Greeter brick")
        time.sleep(1)
```

- **Instantiating the class.**

```python
greeter = Greeter()
```

- **Registering the brick manually.**

`App.register()` adds the brick to the App's internal waiting queue so it can be managed by the controller:

```python
App.register(greeter)
```

- **Starting the brick manually.**

`App.start_brick()` starts a single brick immediately, spawning one worker thread per runnable method (`loop`/`execute`):

```python
App.start_brick(greeter)
```

- **Keeping the main thread alive.**

`App.loop()` blocks the main thread until a shutdown signal (Ctrl+C):

```python
App.loop()
```

- **Stopping the brick manually.**

`App.stop_brick()` stops the worker thread cleanly on shutdown:

```python
App.stop_brick(greeter)
```

The low-level lifecycle looks like this:

```
Instantiate Class → App.register() → App.start_brick() → App.loop() → App.stop_brick()
```

This is exactly what the higher-level flow (`@brick` + `App.run()`) performs automatically behind the scenes.

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component defines a class and drives its lifecycle with the App controller primitives.

- **`Greeter`:** A regular Python class with a `loop` method. The App runtime will discover the method by name and run it in a worker thread.

- **`App.register(greeter)`:** Adds the brick instance to the App's waiting queue so the controller can manage it.

- **`App.start_brick(greeter)`:** Starts the specific brick instance, spawning one worker thread per loop/execute method.

- **`App.loop()`:** Keeps the main thread alive, blocking until a KeyboardInterrupt (Ctrl+C) occurs.

- **`App.stop_brick(greeter)`:** Stops the worker thread for this brick on shutdown.

## Related Inspirational Examples
- `Real time accelerometer`
- `Home climate monitoring and storage`
