# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_utils.image import draw_bounding_boxes, get_image_bytes
from arduino.app_bricks.video_objectdetection import VideoObjectDetection

# Initialize detector with custom confidence and debounce settings
video_detector = VideoObjectDetection(confidence=0.4, camera_preview=True)


# Callback for all detections (must take one dict argument for detections and one bytes argument for the camera preview frame)
def on_all_detections(detections: dict, frame: bytes):
    print("All detections:", detections)
    if frame is None:
        return
    image_with_bb = draw_bounding_boxes(frame, detections)
    # Do something with the image with bounding boxes (e.g., save it, etc.)
    with open("/app/latest_frame_with_detections.jpg", "wb") as f:
        f.write(get_image_bytes(image_with_bb))


video_detector.on_detect_all(on_all_detections)

# Run the application (keeps the video detection loop active)
App.run()
