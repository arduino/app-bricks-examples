# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

import os
from arduino.app_bricks.cloud_llm import CloudLLM
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App


llm = CloudLLM(
    api_key=os.getenv("API_KEY"), # Make sure to set your API key in the environment variable
    system_prompt="You are a bedtime story teller. Tell short, funny and relaxing stories that are suitable for children. Use a simple language and avoid long sentences.",
)
llm.with_memory()

ui = WebUI()

def generate_story(_, msg):
    for resp in llm.chat_stream(msg):
        ui.send_message("response", resp)

ui.on_message("generate_story", generate_story)

App.run()
