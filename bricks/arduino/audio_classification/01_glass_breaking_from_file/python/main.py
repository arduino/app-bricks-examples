# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.audio_classification import AudioClassification

classification = AudioClassification.classify_from_file("assets/glass_breaking.wav")
print("Result:", classification)

App.run()
