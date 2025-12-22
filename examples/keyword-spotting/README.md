# Hey Arduino!

The **Hey Arduino!** example triggers a LED matrix animation whenever the keyword "Hey Arduino" is detected through a microphone.

To use this example, we need to use **Network Mode**, as it requires a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) (to connect the microphone).

Network mode is selected when launching the Arduino App Lab. You can read more about this the [Network Mode section](/learn/first-setup#option-2-remote-connect-ssh).

## Bricks Used

- `keyword_spotting` - this Brick is designed to detect sound patterns, triggering event in case of a match.

## Hardware and Software Requirements

### Hardware

- Arduino® UNO Q
- [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub)
- USB microphone (or headset)
- A power supply (5 V, 3 A) for the USB hub (e.g. a phone charger)

### Software

- Arduino App Lab

## How to Use the Example

### Hardware Setup

1. Connect an USB-C® hub to the board
2. Connect a USB microphone or headset to the USB-C® hub.
3. Power the USB-C hub from a 5V power source (e.g. phone charger).

![Setting up the USB-C® hub](assets/docs_assets/hardware-setup.png)

### Launch the App

1. Make sure we are connected to the board using the **Network mode** (selected when launching Arduino App Lab).
2. Launch the App by clicking on the "Play" button in the top right corner. Wait until the App has launched.
    ![Launching an App](assets/docs_assets/launch-app.png)

3. Say the words "Hey Arduino" into the microphone.
4. An animation on the LED matrix should trigger (heart animation).

### How it Works

This example uses the `keyword_spotting` Brick, which is designed to detect specified keywords. A pre-trained model is used particularly for identifying **"Hey Arduino"**.

The Brick monitors the audio continuously, and when it detects the keyword, it calls the microcontroller to activate an animation on the LED matrix, using the Bridge tool.

![How Hey Arduino! works](assets/docs_assets/keyword-spotting.png)

### Understanding the Code

On the Linux (Python) side:

- `spotter = KeywordSpotting()` - initializes an audio listener that monitors microphone input
- `spotter.on_detect("hey_arduino", on_keyword_detected)` - if "Hey Arduino" is detected, call the `on_keyword_detected()` function
- `Bridge.call("keyword_detected")` - inside the callback function, we use the Bridge tool to tell the microcontroller that the keyword has been spotted!

On the microcontroller (sketch) side:

- `Bridge.provide("keyword_detected", wake_up);` - we receive a call to "wake up" from the Python side.
- `playAnimation(HeartAnim, 8, 1, 50);` - plays an animation when the keyword is identified.
