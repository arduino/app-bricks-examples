# MCU Monitor - Sending Log Messages from Microcontroller

The **MCU Monitor** example demonstrates how to use the Monitor class to send log messages from the microcontroller to the Arduino App Lab Serial Monitor. It sends a "Hello UNO Q" message every second, which can be viewed in the console tab using the RouterBridge library.

## Description

This example shows how to use the Monitor class for logging from the microcontroller to the Arduino App Lab Serial Monitor. 
The Arduino sketch initializes the Monitor and sends a message every second.

The Monitor class enables sending log messages from the Arduino sketch to the Arduino App Lab enviroment through the RouterBridge library, providing visibility into microcontroller activity for debugging and monitoring purposes.

## Bricks Used

**This example does not use any Bricks.** It shows direct Router Bridge communication between Python® and Arduino.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App
    ![Arduino App Lab - Run App](assets/docs_assets/app-lab-run-app.png)
2. View the log messages in the Arduino App Lab Serial Monitor inside the Console tab, showing "Hello UNO Q" printed every second

## How it Works

Once the application is running, the device prints "Hello UNO Q" to the Serial monitor.

The high-level data flow looks like this:

```
Arduino Monitor → Router Bridge → Arduino App Lab Console Output
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Hardware (`sketch.ino`)

The Arduino code demonstrates the Monitor class for sending log messages.

- **Initializing the Monitor:** The Arduino sketch initializes the Monitor class in the setup function:

```cpp
    void setup() {
      Monitor.begin();  // Initialize the Monitor
    }
```

- **Execution:** The Arduino sketch sends log messages using the Monitor class every second:
```cpp
    void loop() {
      Monitor.println("Hello UNO Q"); // Transmit the string "Hello UNO Q" followed by a newline character
      delay(1000);
    }
```

## Related Inspirational Examples
