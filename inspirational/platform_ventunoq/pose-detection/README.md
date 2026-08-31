# Pose Detection

The **Pose Detection** game challenges you to match a list of body poses in front of the camera. The board detects your skeleton in real time, draws it on the video together with a bounding box, and marks each pose as found the moment you hold it.

**Note:** This example requires a camera connected to the Arduino VENTUNO Q.

## Description

This App turns the `pose_estimation` Brick into an interactive game. The Brick analyzes the camera stream on the board's NPU, locating 17 body keypoints per person and classifying four built-in poses: **Standing, Sitting, Right arm up and Left arm up**. The web interface shows the annotated video and a card for each pose: hold a pose until its card lights up, and match all four to win.

**Key features include:**

- Real-time skeleton overlay and bounding box, drawn by the model runner and streamed as MJPEG.
- Stable pose events: per-frame classifications are smoothed over time, so a card only lights up when you actually hold the pose.
- A "Move back" hint when your whole body does not fit in the picture.
- A badge when more than one person is in view, with a one-off note that the biggest figure is the one being tracked.
- Sound effects on game start, on every pose found and on victory.

## Bricks Used

- `pose_estimation`: detects people and their body keypoints on the camera stream, classifies the built-in poses and draws the skeleton overlay.
- `web_ui`: serves the game interface and streams events to the browser over WebSocket.

## Hardware Requirements

### Hardware

- Arduino VENTUNO Q (x1)
- USB-C® cable (x1)
- Camera (Integrated or USB camera)

**Note:** You can also run this example using your Arduino VENTUNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. **Connect the camera**

   Make sure a camera is connected to the board before running the App.

2. **Run the App**

   Launch the App from Arduino App Lab and open the web interface at `<board-ip>:7000`.

3. **Get in position**

   Stand where your whole body fits in the picture. If you are too close, the game shows "Move back".

4. **Play**

   Press **Start Game** and try the poses on the right, one at a time. Hold each pose for about a second until its card turns green. Match all four to win, then press **Play again** for another round.

## How it Works

```
   Camera   ──►   pose_estimation Brick   ──►   Model runner (NPU)
                        │                            │
                        │ pose / readable            │ annotated MJPEG stream (port 5002)
                        │ people count               │
                        ▼                            ▼
                   WebUI Brick   ─────────►    Frontend (Browser)
```

1. The model runner detects up to 10 people per frame, draws the skeleton and each person's bounding box on the video, and serves it as an MJPEG stream.
2. The Brick classifies the tracked person's pose and emits a stable `enter`/`exit` event for each of the four poses.
3. `main.py` forwards the pose events to the browser, together with the Brick's readability signal and the people count.
4. The frontend keeps the game state: it marks found poses, counts them, plays the sound effects and shows the win screen.

## Understanding the Code

### 🔧 Backend (main.py)

The backend stays thin: it configures the Brick and forwards events. The bounding box the design calls for is drawn by the model runner itself, configured with `draw_bboxes` and `bbox_padding` (CSS-style top/right/bottom/left fractions of the box size, so the box includes head and feet):

```python
pose_estimation = PoseEstimation(
    confidence=0.45,
    draw_bboxes=True,
    bbox_padding=(0.15, 0.20, 0.15, 0.20),
    draw_low_confidence_points=False,
    count_debounce_sec=1.0,
    out_of_frame_tolerance=0.05
)
```

Pose events go straight to the page. Two more signals travel with them: `on_readable_change`, which reports when the Brick cannot read the tracked skeleton, and the people count behind the multiple-people badge. Both are sent again to every client as it connects, so a reloaded page starts from the current state instead of waiting for the next change.

### 💻 Frontend (index.html + app.js)

The page embeds the runner's MJPEG stream in an `<img>` and keeps all the game state in the browser: a single `data-state` attribute (`loading`, `start`, `playing`, `win-pending`, `win`) drives what is visible via CSS. Pose `enter` events flip each card to its found state; when all four are found the win screen appears after a short pause. The "Move back" overlay follows the Brick's readability signal directly, which is already debounced, so the page keeps no timers of its own.

### 🛠️ Customizing the Game

- Adjust the bounding box padding or hide the box entirely with the `PoseEstimation` constructor arguments.
- Change how strict the framing requirement is with `out_of_frame_tolerance`, and how easily a partly visible person is detected at all with `confidence`.
- Swap the sounds in `assets/sounds/` (the bundled ones are CC0 from freesound.org).

## Troubleshooting

### The video does not appear

Make sure the camera is connected before starting the App, and reload the page: the stream needs the model runner to be up, and the page retries automatically every second.

### Poses are not detected

Stand a few steps back so your whole body is in the picture. The detection score is the average of your 17 keypoint scores, so a half-framed body or uneven lighting pushes it below the `confidence` threshold this example sets, and the board stops seeing you at all.

### The game says there are multiple people but I am alone

A mirror or another reflective surface in view is detected as a second person, because to the model a reflection is a person. The detector can also get it wrong on its own: it may split one body into two overlapping skeletons, or mistake an object for a person. It is harmless either way: the Brick always follows the biggest figure, so the game plays with you and the only effect is the badge.

### "Sitting" is hard to trigger

Sit sideways to the camera if a frontal chair pose is not recognized: with the thighs pointing at the lens the pose is geometrically ambiguous.
