# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_utils.image import draw_bounding_boxes, get_image_bytes
from arduino.app_bricks.video_objectdetection import VideoObjectDetection

# Initialize detector with custom confidence and debounce settings
video_detector = VideoObjectDetection(confidence=0.4, camera_preview=True)


# Callback for all detections: one dict argument for the detections and one `frame` argument for the camera
# preview frame as JPEG bytes, which is None when no preview frame is available yet (or camera_preview is off)
def on_all_detections(detections: dict, frame: bytes | None):
    print("All detections:", detections)
    if frame is None:
        return
    image_with_bb = draw_bounding_boxes(frame, detections)
    image_bytes = get_image_bytes(image_with_bb)
    if image_bytes is None:
        print("Could not encode the annotated frame")
        return
    # Do something with the image with bounding boxes (e.g., save it, etc.)
    with open("/app/latest_frame_with_detections.jpg", "wb") as f:
        f.write(image_bytes)


video_detector.on_detect_all(on_all_detections)

# Run the application (keeps the video detection loop active)
App.run()
