---
title: Single Board Computer (SBC)
description: Set up the UNO Q as a Single-Board Computer with a display, mouse & keyboard.
author: Karl Söderby
tags: [SBC, Debian, Linux, Terminal]
icon: Computer
category: basic
---

![UNO Q as a Single Board Computer (SBC)](assets/sbc-hero.png)

The UNO Q board can be used as a **Single Board Computer (SBC)**. Through the USB-C connector (using a dongle), we can connect a screen, keyboard & mouse and interact with it.

The operating system (Linux) provides a user interface, with a desktop and basic applications such as a browser and terminal. The **Arduino App Lab** editor is also pre-installed on the board, which means we can launch Apps directly from the board itself!

In this guide, we will go through the necessary steps to set up our board as an SBC.

> The board can be directly set up as an SBC without the need for a host computer.

> While the board is in SBC mode, we can still access it from our computer using [Network Mode](/learn/network-mode)

## Requirements

To use the board as an SBC, we will need the following:
- USB-C dongle (with an HDMI connector)
- Power supply powering our USB-C dongle (either directly from a computer's USB port or a phone charger rated at 5V)
- Screen and an HDMI cable
- Keyboard & mouse

> Apple's USB-C dongle has been tested and does not work properly with the UNO Q. A large variety of other USB-C dongles from various manufacturers have been tested and confirmed to be working.

![Single Board Computer.](assets/sbc.png)

## Hardware Setup

The UNO Q board only has **one USB-C® connector**. This means that if we want to use it as an SBC, the USB-C® port needs to have a **USB dongle** connected, so we can connect a mouse, keyboard, and screen.

1. Connect a USB dongle to the UNO Q's USB-C connector.
2. Connect a mouse, keyboard, and screen to the USB dongle.
3. Finally, power the USB dongle via USB-C®, using either our computer's USB port or a phone charger rated at 5V.

Note that since we are using the USB-C® connector, we need to use the **"Network"** option if we want to access the board from the Arduino App Lab on a computer.

## First Boot

After powering the board, we should see the **Linux Desktop** launching on the screen, where we need to enter our credentials. The default credentials are `arduino` / `arduino`, but this can also be specified during the setup of the board.

![Linux OS.](assets/debian.png)

After entering the credentials, the computer starts the **Arduino App Lab**, which is identical to the one used on a regular computer. The Arduino App Lab will directly start looking for updates.

After the update is complete, we can now start using the Arduino App Lab, as we would do it from our host computer!

![Arduino App Lab.](assets/app-lab.png)

### Troubleshooting

Some common troubleshooting topics are listed below:

- **Board is not starting** - if the green power LED on the board is not ON, check that the power supply is correct. Note that we need to power the USB-C dongle from a 5V power source.
- **Username / Password incorrect** - if we are unable to use `arduino` / `arduino`, we may have already configured a password.
- **Screen not responding** - if the board is ON, but the screen is not showing anything, try resetting the board. Alternatively, we can also try another USB dongle.
- **Keyboard / mouse not responding** - if the keyboard or mouse is not responding, it may be incompatible with the device.

## Network Mode

While the board is set up as an SBC, we can also access the board using [Network Mode](/learn/network-mode). Network Mode allows us to connect to the board over the local Wi-Fi® network, using the Arduino App Lab.

When starting the Arduino App Lab desktop application and the UNO Q is connected to the local network, the board should appear. 

This is a great way of using the board as a standalone computer, but also being able to access it via our computer.

## Other Usage

The UNO Q board is designed to run Apps using the Arduino App Lab, but since it is running a Linux OS, it is possible to do a wide range of things on the board as well.

As Linux is not an operating system developed by Arduino, the documentation is not included here, but we can visit the official OS documentation to learn more. The Linux OS running on the board supports a large variety of packages.

See the sections below to get some inspiration for what we can do with the board in an SBC mode.

### Terminal

The board has a terminal that can be launched (`CTRL+ALT+T` or through the menu). This allows us to run commands such as:
- Installing packages & applications
- Navigating directories
- Running code (e.g. Python scripts)

We can, for example, install a text editor (e.g. `gedit`), write code through it, and run it via the terminal.

![Using the terminal.](assets/terminal.png)

### Browser

Through the OS default browser, we can also browse the Internet.

![Using the browser.](assets/browser.png)

## Summary

In this guide, we learned about setting the board up as an **SBC**, short for **Single Board Computer**. We have learned that the UNO Q can be used as a standalone computer, provided that we use a power supply, USB dongle, keyboard & mouse, and an external monitor.