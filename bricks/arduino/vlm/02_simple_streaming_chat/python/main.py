# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.vlm import VisionLanguageModel

vlm = VisionLanguageModel()

for chunk in vlm.chat_stream("Describe the image.", images=["/app/assets/chair.jpg"]):
    print(chunk, end="", flush=True)

App.run()
