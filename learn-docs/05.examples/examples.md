---
title: Built-in Examples
description: Discover ready-made examples to launch in under a minute.
author: Karl Söderby
tags: [Examples]
icon: Group
category: basic
---

In the previous guides, we have gone through:
- How we [set up our board](/learn/first-setup) for the first time.
- What [Apps](/learn/apps) are, and how they are structured.
- What [Bricks](/learn/bricks) are, and how they can be imported into our App.
- What [AI models](/learn/ai-models) are and how they are embedded in Bricks.

In this guide, we will shift the attention to some ready-made examples that we can load directly to our Arduino® UNO Q board.

## Example 1: Weather Forecast

The **Weather Forecast** fetches local weather data and displays an icon (sunny, cloudy, rainy) on the UNO Q's LED Matrix.

The Weather Forecaster example uses the `weather_forecast` Brick, which fetches data from [open-meteo.com](https://open-meteo.com/).

To use this example:
1. Navigate to the **"Examples"** available in the side menu.
2. Click on **"Weather Forecaster"**.
3. Click on the **"Run Example"** button (top right corner).

Once finished, we wait a few seconds, and then a weather icon should be visible on the LED Matrix.

How this App works:
- The Linux side fetches data from the [open-meteo.com](https://open-meteo.com/) service.
- Data is processed, and by using the `bridge` Brick, we send information to the microcontroller.
- The microcontroller checks which weather it is, and displays a frame that matches it.

![How the App works.](assets/how-bricks-work.png)

## Example 2: Object Detection

The **Object Detection** example allows us to upload an image and run it through an AI model to identify objects inside the image.

The Object Detection example uses the `objectdetection` Brick for detecting objects in the image, and the `web-ui` Brick to host the web server.

To launch this example:
1. Navigate to the **"Examples"** available in the side menu
2. Click on **"Detect Objects on Images"**
3. Click on the **"Run Example"** button (top right corner)

Once finished, open the browser and enter
- `http://localhost:7000` - using the browser on the board,
- `http://<board-hostname>.local:7000` - using the browser on a computer on the same network.

> The board's name is the name we set during the installation of the board. If we name it `john`, it is `http://john.local:7000`. Often, the browser automatically opens at the correct address. 

To use the example once it is running:
1. Upload an image (e.g., of a cat, tree, or a car)
2. Click on the **"Run Detection"** button
3. Wait a few seconds for it to run. Then, a box should appear around the object, with a green box around the object identified.

![Cat detected!](assets/cat.png)

This example makes use of the `objectdetection` Brick, based on the `yolox-object-detection` model.

## Summary

In this guide, we have explored some of the starter examples, how they function, and how to load them to our UNO Q board. These examples serve as a great starting point for getting started with the UNO Q board.

> Detailed documentation can be found under each Example. Several more examples can be found in the **"Examples"** section, available from the left side menu. 

In the next guide, we will take a look at how we can use the board as a **Single-Board Computer (SBC)**.