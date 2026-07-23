# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.llm import LargeLanguageModel
from arduino.app_utils import App

llm = LargeLanguageModel(model="genie:qwen3_4b_instruct_2507")
# This model needs to be selected accordingly in the Brick's configuration under "AI model" tab


def ask_prompt():
    prompt = "Hi, what can you do as an AI assistant?"
    for chunk in llm.chat_stream(prompt):
        print(chunk, end="", flush=True)
    print()
    raise StopIteration  # This stops the user loop


App.run(user_loop=ask_prompt)
