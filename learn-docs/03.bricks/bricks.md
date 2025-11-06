---
title: What is a Brick?
description: Learn about Bricks, the code building blocks for Apps.
author: Karl Söderby
tags: [Bricks, AI Models]
icon: Brick
category: basic
---

![Bricks in the Arduino App Lab](assets/brick-hero.png)

[Bricks](/bricks) are **code building blocks** that can be used in our Apps. They are designed to make the App design and coding easier, by making complex code available through only a couple of lines of code.

Bricks vary in functionality: some embed AI models (computer vision, audio recognition), others are used to provide networking & web interfaces. But they are used in the same way: by importing them into the `main.py` script of our App.

In this tutorial, we will learn about:
- How they are used in an App
- How a Brick works
- What Bricks are available

## How Bricks are Used in Apps

Bricks are imported into the `main.py` (Python) file that runs on the Linux system. When importing a Brick, we can access its functions, such as making requests to a weather API service, launching a web server, or classifying the video input of a camera.

For example, importing the `weather_forecast` Brick will make it possible to use:
 - `get_forecast_by_city("London")`

Where the API call to the weather forecast platform is already pre-made and ready to be used.

![How Bricks work](assets/how-bricks-work.png)

## How to Import a Brick to an App

To import a Brick to an App, we can click on the **"Add Brick"** button inside an App.

![Click the "Add Brick" button](assets/add-brick-1.png)

From the list, we can select a Brick, and add it to our App:

![Find a Brick and add it](assets/add-brick-2.png)

## What Type of Bricks are Available?

There are a number of Bricks to choose from when developing our App, and the list is updated frequently. To see the current list of Bricks that are available, navigate to the [Bricks](/bricks) section.

This section contains an up-to-date list of Bricks, with detailed API documentation available.

### Web UI Brick

The Web UI Brick is used to create a web server running on the Linux system. The Web UI Brick launches the content of a folder named `assets` that is stored in the App folder.

![Assets folder](assets/web-ui-brick.png)

When using it inside of `main.py`, we just use `WebUI()` to start the web server.

The HTML file contains the web page of the App's user interface. The JavaScript file contains the logic to communicate with the Web UI Brick.

### Bricks with AI Models

Some Bricks are a bit more advanced and embed AI models.

With the models, we can, for example, connect a USB camera and run a real-time object detection (see **Code Scanner** example that uses the `camera_code_detection` Brick).

These models are designed to run on the Linux system, meaning that Apps run entirely on the UNO Q device and require no additional hardware or service to operate.

### Examples Based on Bricks

There are several examples that showcase how a Brick works, and all are available in the [Examples](/examples) section.

## Next Steps

Bricks are used to build Apps in just minutes. In this guide, we have learned a little bit about how they work and which ones are available.

In the next guide, we will take a look at **AI models**, which ones are readily available, and what they do.