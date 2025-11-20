---
title: Arduino UNO Q
description: An overview of the Arduino UNO Q board featuring a Linux system and a microcontroller. 
author: Karl Söderby
tags: [UNO Q, Overview]
icon: UNO
category: basic
---

![Arduino UNO Q](assets/uno-q-hero.png)

The **Arduino UNO Q** is a development board featuring the Qualcomm Dragonwing™ QRB2210 System-on-Chip, (referred to as the "MPU" or "Linux side"), and an STM32U585 microcontroller (MCU). This combination means we are able to program the board as a "traditional" Arduino (using the STM32U585), but also run Linux applications, for example in **Python**.

The duality of the board enables us to create projects that can, for example:
- Record a sensor value **(MCU side)**
- Record a camera input **(Linux side)**
- Run an AI model to identify objects on the camera **(Linux side)**
- Stream the data to a web server hosted locally **(Linux side)**

> This guide provides a brief overview of the UNO Q board. For more detailed information, please visit the [official documentation page for UNO Q](https://docs.arduino.cc/hardware/uno-q/)

## Arduino UNO Q Overview

The UNO Q has the same form factor as the classic Arduino UNO, but with a lot of new features:
- **Qualcomm Dragonwing™ QRB2210** featuring an MPU running a Debian OS (Linux)
- **STM32U585** Microcontroller Unit (MCU)
- **WCBN3536A** Wi-Fi® / Bluetooth Low Energy® chip
- Pin headers for connecting electronic components
- SPI and I2C (Qwiic) connectors
- A blue 13x8 LED matrix
- USB-C connector for connection to computer / USB dongle
- High-speed headers for connecting Arduino carriers

![Arduino® UNO Q overview](assets/uno-q.png)

## Pinout

![UNO Q Pinout](assets/pinout.png)

### Important Notes

The board has different operating voltages:
- The MCU operates at **3.3V**, meaning the GPIOs and analog pins are 3.3V only.
- The SoC operates at **1.8V**, meaning the high-speed headers on the bottom of the board are 1.8V only.

>The difference in voltage is particularly important when using the high-speed headers. As they operate on 1.8V, connecting higher voltage components can damage the board.

## The Qwiic Connector

The Qwiic Connector is an I2C port that allows us to connect [Modulino nodes](https://store.arduino.cc/collections/modulino) and other Qwiic compatible components to our projects. Modulino nodes are small breakout boards, each providing a specific functionality such as:
- Temperature sensing
- LED pixels
- Buttons
- Distance measuring

![Modulino nodes & Qwiic.](assets/modulino.png)