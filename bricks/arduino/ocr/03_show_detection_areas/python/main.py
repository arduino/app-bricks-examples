# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.ocr import OCR
from arduino.app_utils import App, Logger

logger = Logger("OCR Detection")

ocr = OCR()


def show_detections():
    result = ocr.extract_text("assets/text.png")
    for detection in result.detections:
        logger.info(f"Detected text: {detection.text} ({detection.confidence:.2f}) at {detection.bounding_box_xyxy}")
    raise StopIteration


App.run(user_loop=show_detections)
