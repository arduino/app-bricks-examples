# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.object_detection import ObjectDetection
from arduino.app_utils.image import draw_bounding_boxes

object_detection = ObjectDetection()

# Image can be provided as bytes or PIL.Image
with open("assets/image.jpg", "rb") as f:
    img = f.read()

out = object_detection.detect(img)
# You can also provide a confidence level
# out = object_detection.detect(frame, confidence = 0.35)
if out and "detection" in out:
    for i, obj_det in enumerate(out["detection"]):
        # For every object detected, print its details
        detected_object = obj_det.get("class_name", None)
        confidence = obj_det.get("confidence", None)
        bounding_box = obj_det.get("bounding_box_xyxy", None)
        print(f"Object Detected! '{detected_object}' with confidence: {confidence}% and bounding boxes coordinates: {bounding_box}")

# Draw the bounding boxes and save the resulting image
out_image = draw_bounding_boxes(image=img, detection=out)
if out_image is not None:
    out_image.save("result.png")

App.run()
