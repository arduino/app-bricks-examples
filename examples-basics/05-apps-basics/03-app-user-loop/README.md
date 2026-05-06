# App user loop

The **App user loop** example shows the `user_loop` option of `App.run`. A plain Python® function is passed to the App runtime, which calls it repeatedly on the main thread while still managing every registered brick in the background.

## Description

This example demonstrates how to drive a main-thread loop through the App runtime. Instead of blocking on an idle wait, `App.run(user_loop=loop)` invokes the provided function once per iteration, giving you a simple place to run periodic Python® code without giving up the App lifecycle (bricks, shutdown handling, etc.). It provides a foundation for building apps that need a lightweight periodic task on the Python® side.

## Bricks Used

**This example does not use any Bricks.** It focuses on the App user loop entry point.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App
2. Watch the Python® console print a new iteration message every second

## How it Works

Once the application is running, the device performs the following operations:

- **Defining the user loop.**

The `loop` function holds the periodic work that should run on the main thread:

```python
def loop():
    global counter
    counter += 1
    print(f"User loop iteration #{counter}")
    time.sleep(1)
```

- **Handing the loop to the App runtime.**

`App.run(user_loop=loop)` starts every registered brick and then calls `loop()` repeatedly until a shutdown signal is received:

```python
App.run(user_loop=loop)
```

The high-level lifecycle looks like this:

```
App.run(user_loop=loop) → start bricks → call loop() repeatedly → shutdown on signal
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component defines the periodic function and delegates its execution to the App.

- **`counter`:** Module-level variable that tracks the iteration number across calls.

- **`loop()`:** User-defined function executed on every iteration; it increments the counter, prints a message, and sleeps for one second.

- **`App.run(user_loop=loop)`:** Starts the App runtime and drives the user loop on the main thread until shutdown.

## Related Inspirational Examples
- `Mascot jump game`
- `System resources logger`
