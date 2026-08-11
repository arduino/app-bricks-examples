# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.video_imageclassification import VideoImageClassification

# Create a classification stream with default confidence threshold (0.3)
classification_stream = VideoImageClassification()


# Example: callback when "sunglasses" are detected
def sunglass_detected():
    print("Detected sunglasses!")


classification_stream.on_detect("sunglasses", sunglass_detected)


# Example: callback for all classifications
def all_detected(results):
    print("Classifications:", results)


classification_stream.on_detect_all(all_detected)

App.run()
