# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.cloud_llm import CloudLLM
from arduino.app_utils import App

llm = CloudLLM()
llm.with_memory(0)


def ask_prompt():
    print(llm.chat("Remember that my favorite color is blue."))
    print(llm.chat("What is my favorite color?"))
    raise StopIteration


App.run(user_loop=ask_prompt)
