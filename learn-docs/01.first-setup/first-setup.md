---
title: First Setup
description: Get to know the Arduino App Lab.
author: Karl Söderby
tags: [Apps, Bricks, Sketches, Python, SBC]
icon: Settings
category: basic
---

![Hero Image](assets/first-setup-hero.png)

The Arduino App Lab is a user-friendly software tool for creating and launching **Apps** on the Arduino UNO Q board.

Apps can consist of a Linux part (written in Python), and a microcontroller part (written in Arduino / C++). The Linux system is capable of running anything from AI models to web servers, while the microcontroller can interact with the real world.

## Setting Up the UNO Q 

The UNO Q board can be programmed in three different modes:
- **USB-C® (desktop mode)** - connect to the board via USB, using the Arduino App Lab desktop version.
- **Remote Connect (desktop mode)** - connect to the board remotely using the Arduino App Lab (via SSH connection).
- **Single-Board Computer (SBC)** the board is programmed directly on the board, using a screen, keyboard, and mouse.

> To use Remote and Single Board Computer modes, we need first to connect the board via USB and run the first setup. In this setup, we will enter Wi-Fi® credentials and set a password for the board that is used when logging in using Single Board Computer mode.

![Different programming modes.](assets/connectoptions.png)

### Option 1: Host Computer (USB-C®)

If we are using a regular computer (referred to as "host" computer), use the instructions below:

1. Start the Arduino App Lab on a computer.
2. Connect a board to the computer via the USB-C® connector on the board.
3. Select the board in the Arduino App Lab (the USB option).
4. Run the installation flow. We will be asked to provide Wi-Fi® credentials, as well as renaming the board and selecting a password (default is `arduino`).
5. We are done! ☑️

The installation flow will ensure we have the latest version running on the board.

### Option 2: Network Mode (SSH)

The [Network Mode](/learn/network-mode) option allows us to access the board over the local Wi-Fi® network (over SSH).

This option is only available after the board has been configured (updating and adding Wi-Fi credentials.)

1. Start the Arduino App Lab
2. Make sure the board is connected to Wi-Fi® (this is visible in the bottom bar of the Arduino App Lab)
3. Select the "Network" option.
4. We are done! ☑️

We can now connect to the board while we're on the same network, and use the Arduino App Lab in the exact same way as if it was connected via USB-C®!

### Option 3: Single-Board Computer (SBC)

> To use the Single Board Computer (SBC) mode, we will need to set up the board, using option number 1 (desktop/USB mode).

To use the board as a single board computer, we can follow the instructions below:

1. Connect a USB-C® dongle to the board's USB-C connector.
2. Power the USB-C® dongle with a separate USB-C® cable, using a 5V power supply (e.g., phone charger, computer USB port).
3. Connect a keyboard, mouse, and display to the USB-C® dongle, using the available USB and HDMI connections.
4. The board will boot as soon as it is powered, and we will be prompted with login credentials, which is `arduino / arduino` by default (this is set during the configuration of the board).

![Setting up the board as an SBC](assets/sbc.png)

When the board is powered, the Linux OS will launch, which also has the Arduino App Lab installed. The Arduino App Lab will launch directly after login.

Once it is launched, we are able to run Apps directly from the board itself!

This approach is covered in more detail in the [Single-Board Computer tutorial](/learn/single-board-computer).

### Bonus Option: SBC & Network Mode

While the board is setup as an SBC, we can also access it using the [Network Mode](/learn/network-mode), which allows us to use the board as a standalone computer, but with access from our regular computer.

This gives us flexibility in developing Apps on our computer, and testing them out locally on the board at the same time.

### Auto-Update

During startup, the system will look for available updates and automatically install them. At the end of the update process, the Arduino App Lab must be restarted.

## Launching Our First App

We can launch our first App, by using an existing example. Click on the **"Examples"** tab in the left sidebar to access them.

![Click on "Examples"](assets/find-examples.png)

Select an example, and click on the **"Run"** button, located in the top right corner.

![Click on "Run"](assets/launch-application.png)

Each example provides documentation on how the example works, and what **Bricks** are used. Bricks are the building blocks of our App, and we will cover that in the next tutorial.

> To modify any of the built-in examples, we need to duplicate them. This is done by clicking the arrow next to the Example name.

## Monitoring the App

After launching an App, we can monitor it through the **"Console"** tab. Here we will find three other tabs:
- **Start-up** - this tab shows the logs of the start-up process (the launch).
- **main** - this tab shows the Python logs of an App (e.g., if we use `print()` in the `main.py` file).
- **Sketch** - this tab shows the serial data from the sketch (if we use `Monitor.print()` in the sketch).

## How Does an App Work?

When we click on the **"Run"** button, an assembly process will start:

1. The **Arduino sketch** is uploaded to the microcontroller.
2. The **Python script** is launched on the Linux system.
3. The two systems then run separately, but can communicate with each other. 

All Apps run fully on the board, as well as the compilation of the sketch. When using the Arduino App Lab, the examples and Apps we see are the ones present on the board, and are not stored on our local computer.

### Application Examples

There's a large variety of Apps that can run on the UNO Q. 

One example could be running an image recognition model on the Linux side using a camera. If it detects something, it sends a signal to the sketch side, which could make a light blink or produce a loud noise.

![Example 1](assets/image_classification.png)

Another example could be measuring temperature on the microcontroller, and sending it to the Linux side. On the Linux side, we launch a web server, where we can view real-time data from our temperature sensor! 

![Example 2](assets/temperature.png)

## Next Steps

In this tutorial, we have learned how to set up our hardware, and touched upon the concept of "Apps". In the next tutorial, we will go deeper into how an App works, and the most important things to consider when creating one!