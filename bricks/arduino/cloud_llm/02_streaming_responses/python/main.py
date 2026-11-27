# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.cloud_llm import CloudLLM
from arduino.app_utils import App

llm = CloudLLM()


def ask_prompt():
    for token in llm.chat_stream("Explain why the sky appears blue in three short sentences."):
        print(token, end="", flush=True)
    print()
    raise StopIteration


App.run(user_loop=ask_prompt)
