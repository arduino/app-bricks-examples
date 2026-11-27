# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.cloud_asr import CloudASR, CloudProvider

# This example uses two providers, so it needs two API keys.
# The Brick Configuration holds a single API_KEY, so set both keys here in the code:
# a key passed to CloudASR takes precedence over the one in the Brick Configuration.
cloud_asr_openai = CloudASR(
    provider=CloudProvider.OPENAI_TRANSCRIBE,
    api_key="YOUR_OPENAI_API_KEY",  # Replace with your OpenAI API key
)
cloud_asr_google = CloudASR(
    provider=CloudProvider.GOOGLE_SPEECH,
    api_key="YOUR_GOOGLE_API_KEY",  # Replace with your Google API key
)


def transcribe():
    text = cloud_asr_openai.transcribe()
    print(f"[OpenAI] Detected speech: {text}")

    text = cloud_asr_google.transcribe()
    print(f"[Google] Detected speech: {text}")
    raise StopIteration


App.run(user_loop=transcribe)
