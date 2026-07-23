# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.visual_anomaly_detection import VisualAnomalyDetection
from arduino.app_utils.image import draw_anomaly_markers

anomaly_detection = VisualAnomalyDetection()

# Image can be provided as bytes or PIL.Image
with open("/app/assets/image.jpg", "rb") as f:
    img = f.read()

out = anomaly_detection.detect(img)
if out and "detection" in out:
    for i, anomaly in enumerate(out["detection"]):
        # For every anomaly detected, print its details
        detected_anomaly = anomaly.get("class_name", None)
        score = anomaly.get("score", None)
        bounding_box = anomaly.get("bounding_box_xyxy", None)
        print(f"Anomaly Detected! '{detected_anomaly}' with score: {score} and bounding box coordinates: {bounding_box}")

# Draw the bounding boxes and save the resulting image
out_image = draw_anomaly_markers(image=img, detection=out)
if out_image is not None:
    out_image.save("result.png")

App.run()
