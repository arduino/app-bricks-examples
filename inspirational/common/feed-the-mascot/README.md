# Feed the Mascot

The **Feed the Mascot** game asks you to feed the Arduino mascot with the objects around you. Bring an object in front of the camera and into the feed zone: the mascot eats it, and every three bites it grows, from baby to young to adult.

**Note:** This example requires a camera connected to the Arduino® VENTUNO Q.

## Description

This App turns the `video_object_tracking` Brick into a game. The Brick runs an object detection model with object tracking on the camera stream, so every object keeps the same identity while it stays in view, and it reports each object entering an area of the video. That area is the feed zone, with the mascot drawn on it: every object entering it is a bite. People are left out, so only the objects you hold count.

**Key features include:**

- Live video, mirrored like a webcam preview, with a box around every tracked object, in the color of its class, labelled with its class, its number and its confidence.
- A feed zone drawn by the Brick in white dashes with a black edge, visible on any background.
- One bite per object entering the zone, also for several objects brought in together, up to nine.
- Three growth stages for the mascot, with a bite and a growth animation.
- A confidence level, set with a slider or typed in, to trade more detected objects for fewer mistaken ones.
- Tips for better detection, shown once at start and kept in the side panel.

## Bricks Used

- `video_object_tracking`: tracks the objects on the camera stream, reports the ones entering the feed zone and streams the video with the boxes and the zone.
- `web_ui`: serves the game interface and streams the game state to the browser over WebSocket.

## Hardware Requirements

### Hardware

- Arduino® VENTUNO Q (x1)
- USB camera (x1)

**Note:** You can also run this example using your Arduino VENTUNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-hub-8-in-1) with a mouse, keyboard and display attached.

## How to Use the Example

1. **Connect the camera**

   Make sure a camera is connected to the board before running the App: without one the App does not start.

2. **Run the App**

   Launch the App from Arduino App Lab and open the web interface at `<board-ip>:7000`.

3. **Feed the mascot**

   Hold an object in front of the camera, a cup, a bottle or a book, and move it into the feed zone. The mascot opens its mouth, and the panel on the left fills one slot. Take the object out and bring in another one, or the same one again after a couple of seconds.

4. **Make it grow**

   Every three bites a level is complete and the mascot grows. After nine bites it is fully grown and the game shows how long it took: press **Play again** for another round.

## How it Works

```
   Camera   ──►   video_object_tracking Brick   ──►   Edge Impulse inference service (NPU)
                        │                │
                        │ area entries   │ video with boxes and feed zone (port 4912)
                        ▼                ▼
                   main.py ──► WebUI Brick ──►  Frontend (Browser)
```

1. The Brick sends every camera frame to the inference service, which runs the model and its tracker and returns the tracked objects, each with its own number.
2. The Brick draws the boxes and the feed zone on the video, serves it as an MJPEG stream, and calls `on_area_enter` when an object enters the zone.
3. `main.py` keeps the game: it counts the bites, completes the levels and times the game, and sends the state to the page.
4. The frontend shows the video, places the mascot over the feed zone and plays the animations.

## Understanding the Code

### 🔧 Backend (main.py)

The Brick gets every frame at 1280x720, whatever the webcam delivers: the camera is asked for that resolution, and two camera adjustments crop each frame to 16:9 and resize it when the webcam offers another one. So the feed zone, set in camera pixels, stays in the same place of the video, and the boxes the Brick draws stay sharp once the page stretches the video over the window. A third adjustment mirrors the video, like a webcam preview: the Brick detects and draws on the mirrored frames, so the boxes match what the page shows and the labels read correctly. People are left out of everything the Brick reports and draws:

```python
tracker = VideoObjectTracking(
    camera=Camera(
        resolution=(1280, 720),
        codec="MJPG",
        adjustments=cropped_to_aspect_ratio((16, 9)) | resized((1280, 720)) | flipped_h(),
    ),
    labels_to_ignore=["person"],
)
tracker.set_rectangular_area(*FEED_ZONE)
```

Every `on_area_enter` event is a bite, with one exception: an object of the class eaten in the last two seconds does not count. The tracker sometimes loses an object for a moment and finds it again as a new one, and without this pause the mascot would eat it twice. Two objects of different classes brought in together still count as two bites.

The game state is sent to the page on every change and to every page as it connects, so a reloaded page picks up the game where it was.

### 💻 Frontend (index.html + app.js)

The page shows the Brick's MJPEG stream in an `<img>` covering the window, and computes where the feed zone falls on the page from the zone in camera pixels and the size of the video. The mascot and the "FEED ZONE" label are placed there. A single `data-state` attribute (`loading`, `tips`, `playing`, `won`) drives what is visible via CSS. The bite and growth animations are CSS keyframes, restarted on every bite.

### 🛠️ Customizing the Game

- Move or resize the feed zone by changing `FEED_ZONE` in `main.py`: the page follows it.
- Change how many bites the mascot needs with `BITES_TO_GROW_UP`, and the levels shown in the panel in `index.html`.
- Feed the mascot only some objects by passing `labels_to_track` to the Brick, for example `["cup", "bottle", "banana"]`.

## Troubleshooting

### The video does not appear

Make sure the camera is connected before starting the App, and reload the page: the page retries every second until the Brick serves the video.

### The objects are not detected

Use a plain, light background behind the objects and a well lit room. Objects of medium size, held whole in the picture, are detected best; transparent or very thin objects are hard for the model. Lowering the confidence detects more objects, and more mistaken ones.

### The mascot eats an object twice

The model may give an object two different classes, a vase seen as a potted plant for example: two classes are two bites. Hold the object still and in full view while it is in the feed zone.
