# Pose Detection

The **Pose Detection** game challenges you to match a list of body poses in front of the camera. The board detects your skeleton in real time, draws it on the video together with a bounding box, and marks each pose as found the moment you hold it.

**Note:** This example requires a camera connected to the Arduino VENTUNO Q.

## Description

This App turns the `pose_estimation` Brick into an interactive game. The Brick analyzes the camera stream on the board's NPU, locating 17 body keypoints per person and classifying four built-in poses: **Standing, Sitting, Right arm up and Left arm up**. The web interface shows the annotated video and a card for each pose: hold a pose until its card lights up, and match all four to win.

**Key features include:**

- Real-time skeleton overlay and bounding box, drawn by the model runner and streamed as MJPEG.
- Stable pose events: per-frame classifications are smoothed over time, so a card only lights up when you actually hold the pose.
- A "Move back" hint when your whole body does not fit in the picture.
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
                        │ pose / full body events    │ annotated MJPEG stream (port 5002)
                        ▼                            ▼
                   WebUI Brick   ─────────►    Frontend (Browser)
```

1. The model runner detects up to 10 people per frame, draws the skeleton and each person's bounding box on the video, and serves it as an MJPEG stream.
2. The Brick classifies the tracked person's pose and emits a stable `enter`/`exit` event for each of the four poses.
3. `main.py` forwards the pose events to the browser, together with a "full body visible" signal computed from the head and ankle keypoints.
4. The frontend keeps the game state: it marks found poses, counts them, plays the sound effects and shows the win screen.

## Understanding the Code

### 🔧 Backend (main.py)

The backend stays thin: it configures the Brick and forwards events. The bounding box the design calls for is drawn by the model runner itself, configured with `draw_bboxes` and `bbox_padding` (CSS-style top/right/bottom/left fractions of the box size, so the box includes head and feet):

```python
pose_estimation = PoseEstimation(
    draw_bboxes=True,
    bbox_padding=(0.15, 0.20, 0.15, 0.20),
    draw_low_confidence_points=False,
    debounce_sec=1.0,
)
```

Pose events go straight to the page, and a throttled `on_keypoints` callback distills the one extra signal the game needs: whether the head and both ankles are visible.

### 💻 Frontend (index.html + app.js)

The page embeds the runner's MJPEG stream in an `<img>` and keeps all the game state in the browser: a single `data-state` attribute (`loading`, `start`, `playing`, `win-pending`, `win`) drives what is visible via CSS. Pose `enter` events flip each card to its found state; when all four are found the win screen appears after a short pause. The "Move back" overlay is debounced with a small hysteresis so it does not flicker.

### 🛠️ Customizing the Game

- Adjust the bounding box padding or hide the box entirely with the `PoseEstimation` constructor arguments.
- Change the "full body" strictness by tuning `KEYPOINT_SCORE` in `main.py`.
- Swap the sounds in `assets/sounds/` (the bundled ones are CC0 from freesound.org).

## Troubleshooting

### The video does not appear

Make sure the camera is connected before starting the App, and reload the page: the stream needs the model runner to be up, and the page retries automatically every second.

### Poses are not detected

Stand a few steps back so your whole body is in the picture: the classifier needs the full skeleton. Uneven lighting or a half-framed body lowers the detection score.

### "Sitting" is hard to trigger

Sit sideways to the camera if a frontal chair pose is not recognized: with the thighs pointing at the lens the pose is geometrically ambiguous.
