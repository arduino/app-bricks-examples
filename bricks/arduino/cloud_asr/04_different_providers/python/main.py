# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.cloud_asr import CloudASR, CloudProvider

cloud_asr_openai = CloudASR(provider=CloudProvider.OPENAI_TRANSCRIBE, api_key="YOUR__OPENAI_API_KEY")
cloud_asr_google = CloudASR(provider=CloudProvider.GOOGLE_SPEECH, api_key="YOUR_GOOGLE_API_KEY")


def transcribe():
    text = cloud_asr_openai.transcribe()
    print(f"Detected speech: {text}")

    text = cloud_asr_google.transcribe()
    print(f"Detected speech: {text}")
    raise StopIteration


App.run(user_loop=transcribe)
