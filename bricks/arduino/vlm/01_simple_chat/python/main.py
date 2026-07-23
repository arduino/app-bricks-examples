# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.vlm import VisionLanguageModel

vlm = VisionLanguageModel()

print(vlm.chat("Describe the image.", images=["assets/chair.jpg"]))

App.run()
