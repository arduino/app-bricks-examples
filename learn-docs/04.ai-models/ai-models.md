---
title: AI Models
description: Learn how AI models work, where to find them, and how to use them in an App.
author: Karl Söderby
tags: [AI, ML, Models]
icon: AI
category: basic
---

![AI Models in the Arduino App Lab](assets/ai-hero.png)

Several Bricks rely on pre-trained AI models that can run in the Arduino App Lab. These models are integral to the functionality of the Bricks, allowing them to perform complex tasks with high accuracy.

## How AI Models Work

AI models are algorithms trained on specific datasets, enabling them to perform tasks such as image recognition, audio analysis, and motion detection. These models learn patterns and features from the data, which they use to make predictions or decisions. For example:

- **Image Recognition**: Models are trained on large datasets containing images of various objects (e.g., birds, vehicles, people) to learn distinguishing features.
- **Audio Analysis**: Models process audio files to extract keywords or identify specific sounds.
- **Motion Detection**: Models analyze motion data from an Inertial Measurement Unit (IMU) to detect and interpret movement patterns.

![Computer vision model example.](assets/how-ai-model-work.png)

A model might be trained to identify a specific object by analyzing hundreds or thousands of images of that object, thereby learning its unique characteristics. In a computer vision project, the model can process real-time footage from a camera to identify the object if it appears in the frame.

Another example is an audio AI model, trained specifically to identify certain keywords, such as "Hey" and "Arduino." Continuously monitoring and classifying the audio, if a match occurs, we can act upon it.
- Try this out in the [Hey Arduino](/examples) example.

## How Models Run on the UNO Q

Once the App is started, AI models will run locally on the board. The Brick uses the AI model to perform specific AI tasks, like object detection, image or audio classification, etc.

The Brick provides an interface that can be used in the Python script to perform various operations, such as real-time object detection. This interaction allows us to integrate AI capabilities into our Apps seamlessly, leveraging the power of pre-trained models.

## Next Steps

In this guide, we have explored how AI models work and how they are integrated with Bricks. Models play a key role when building advanced Apps, as they make them smarter and more precise in decision-making.

In the next guide, we will examine some **built-in example Apps** that utilize these Bricks and models, providing practical insights into their implementation and use cases.