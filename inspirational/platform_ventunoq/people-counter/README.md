# People Counter

The **People Counter** example counts the people who walk past the camera and shows how many are in view right now, over the live video with a box around each person.

**Note:** This example requires a camera connected to the Arduino® VENTUNO Q.

## Description

This App uses the `video_object_tracking` Brick, which runs an object detection model on the board's NPU and gives every object a tracking ID that stays the same while it is in view. The App follows only people. The `web_ui` Brick serves the page with the two counters.

- **People counted** is the number of distinct tracking IDs since the App started. A person is counted once they have been seen in 25 frames, so someone passing by for an instant is left out. A person who leaves the view and comes back later gets a new ID and is counted again.
- **In view** is the number of people counted who are on screen now. A person leaves it once they have been missing for a couple of seconds.

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

The Python script builds the `video_object_tracking` Brick for the `person` label and tunes its tracker for people walking in a crowd. A track is kept through up to 50 frames without a detection, a single detection is enough to report it, and a low overlap is enough to follow a person between frames. `min_detections_to_count=25` sets in how many frames a person must be seen before they count.

To know who is in view, the script sets an area as large as the camera frame and keeps it off the video. A person enters it when they are counted, and leaves it once they have been missing for a couple of seconds. The Brick calls `on_area_enter` and `on_area_exit` on these two events. On each of them the script reads `get_unique_objects_count()` and `get_objects_in_area()` and sends both numbers to the page, which shows them on the counter and briefly enlarges a number when it goes up.
