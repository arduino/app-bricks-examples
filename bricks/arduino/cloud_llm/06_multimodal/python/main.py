# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.cloud_llm import CloudLLM, CloudModel
from arduino.app_utils import App

llm = CloudLLM(
    model=CloudModel.GOOGLE_GEMINI,
    api_key="YOUR_API_KEY",  # Replace with your actual API key
)


def ask_prompt():
    print(
        llm.chat(message="Describe the following image. Provide a bullet-point summary of the discovered objects", images=["/app/assets/image.jpg"])
    )
    raise StopIteration


App.run(user_loop=ask_prompt)
