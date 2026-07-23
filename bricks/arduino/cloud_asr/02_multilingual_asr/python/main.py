# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.cloud_asr import CloudASR

cloud_asr = CloudASR(
    api_key="YOUR_API_KEY",  # Replace with your actual API key
    language="it",  # Set language to Italian
)


def transcribe():
    text = cloud_asr.transcribe()
    print(f"Detected speech: {text}")


App.run(user_loop=transcribe)
