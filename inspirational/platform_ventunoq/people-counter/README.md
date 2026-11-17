# People Counter

The **People Counter** example counts the people who walk past the camera and shows how many are in view right now, over the live video with a box around each person.

**Note:** This example requires a camera connected to the Arduino® VENTUNO Q.

## Description

This App uses the `video_object_tracking` Brick, which runs an object detection model on the board's NPU and gives every object a tracking ID that stays the same while it is in view. The App follows only people. The `web_ui` Brick serves the page with the two counters.

- **People counted** is the number of distinct tracking IDs since the App started. A person is counted once they have been seen in 25 frames, so someone passing by for an instant is left out. A person who leaves the view and comes back later gets a new ID and is counted again.
- **In view** is the number of people counted who are on screen now. A person leaves it once they have been missing for 35 frames, about a second and a half.

## Bricks Used

- `video_object_tracking`: tracks the people in the camera stream, counts them and draws their boxes on the video.
- `web_ui`: serves the web page and sends it the counters over WebSocket.

## Hardware Requirements

- Arduino® VENTUNO Q (x1)
- USB camera (x1)

## How to Use the Example

1. Connect the camera to the board.
2. Launch the App by clicking the **Run** button in the top right corner of Arduino App Lab.
3. The App opens in your browser. You can also open it at `<board-ip>:7000`.
4. Walk in front of the camera. Once you have been in view for a moment, both counters go up.

## How it Works

```
   Camera   ──►   video_object_tracking Brick   ──►   Edge Impulse inference service (NPU)
                        │                │
                        │ area entries   │ video with boxes (port 4912)
                        │ and exits      │
                        ▼                ▼
                   main.py ──► WebUI Brick ──►  Frontend (Browser)
```

1. The Brick sends every camera frame to the inference service, which runs the model and its tracker and returns the tracked people, each with its own ID.
2. The Brick draws a box around each person on the video and serves it as an MJPEG stream.
3. The Brick calls `on_area_enter` when a person starts to count and `on_area_exit` when it stops following them.
4. `main.py` reads the two numbers from the Brick on each of these events and sends them to the page.
5. The frontend shows the video with the two numbers over it.

## Understanding the Code

### 🔧 Backend (main.py)

The camera is asked for 1280x720, and two camera adjustments shape every frame. The first crops it to 16:9 when the webcam delivers another shape. The second mirrors the video, like a webcam preview.

The Brick follows only the `person` label, and its tracker is tuned for people walking in a crowd. A track is kept through up to 35 frames without a detection, a single detection is enough to report it, and a low overlap is enough to follow a person between frames. `min_detections_to_count=25` sets in how many frames a person must be seen before they count. The frames do not have to be consecutive. A person who goes missing for a few frames and comes back with the same ID keeps the ones already seen.

```python
tracker = VideoObjectTracking(
    camera=Camera(
        resolution=(1280, 720),
        fps=30,
        codec="MJPG",
        adjustments=cropped_to_aspect_ratio((16, 9)) | flipped_h(),
    ),
    labels_to_track=["person"],
    keep_grace=35,
    min_detections=1,
    iou_threshold=0.05,
    min_detections_to_count=25,
)
tracker.set_rectangular_area(*WHOLE_FRAME, relative=True, visible=False)
```

To know who is in view, the script sets an area as large as the camera frame and keeps it off the video. A person enters it when they are counted, and leaves it once they have been missing for 35 frames, about a second and a half. The Brick calls `on_area_enter` and `on_area_exit` on these two events. On each of them the script reads `get_unique_objects_count()` and `get_objects_in_area()` and sends both numbers to the page.

The Brick delivers these events one at a time and in order, so the last message sent carries the latest numbers. The numbers are also sent to every page as it connects, so a reloaded page shows the current count at once.

### 💻 Frontend (index.html + app.js)

The page shows the Brick's MJPEG stream in an `<img>` covering the window, and asks for it again every second until the Brick serves it. Until then an overlay says that the camera is starting.

The two numbers sit over the video, "People counted" in a card and "In view" in a strip below it. A number grows briefly when it goes up. The count is written with a dot every three digits, and from one million on it uses a smaller size to stay in its card.

## Troubleshooting

### The video does not appear

Make sure the camera is connected before starting the App, and reload the page. The page retries every second until the Brick serves the video.

### In view goes down a moment after a person leaves

The Brick keeps a person for 35 frames after it stops seeing them, because the tracker may still find them again with the same ID. That is about a second and a half at the 20 to 25 frames per second the board processes, and longer when the camera delivers fewer, in a dim room for example. A person hidden for a moment by someone walking in front of them stays in view instead of leaving and coming back. A lower `keep_grace` makes the number go down sooner, and counts more people twice in a crowd.

### People counted grows more than the people who walked by

In a crowd people hide each other, and the tracker may give a person it lost a new ID, which counts as another person. A person who leaves the view and comes back is also counted again. Many of the extra IDs the tracker opens this way last only a moment. `min_detections_to_count` steadies the count against them, because an ID counts only once it has been seen in 25 frames in total, about one second. A higher value also leaves out the IDs that last a little longer, and a person then has to stay in view longer to be counted.

### A person walking past quickly is not counted

A person seen in fewer than 25 frames does not count. Lower `min_detections_to_count` to count them too.
