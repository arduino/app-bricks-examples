# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.llm import LargeLanguageModel
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App
from .prompts import load_system_prompt


def generate_prompt(_, data):
    try:
        prompt = data.get('prompt', '')
        # Use the plain text prompt for the LLM and stream the response
        for resp in llm.chat_stream(prompt):
            ui.send_message("response", resp)

        # Signal the end of the stream
        ui.send_message("stream_end", {})
    except Exception as e:
        ui.send_message("llm_error", {"error": str(e)})


def commands_handler(_, data):
    command = data.get('command', '')
    try:
        if command == "clear_chat":
            llm.stop_stream()
            llm.clear_memory()
            ui.send_message("command_ok", {"command": command})
        elif command == "stop_stream":
            llm.stop_stream()
            ui.send_message("command_ok", {"command": command})
        else:
            ui.send_message("command_error", {"command": command, "error": "Unknown command"})
    except Exception as e:
        ui.send_message("command_error", {"command": command, "error": str(e)})

llm = LargeLanguageModel(
                model="genie:qwen3-4b",
                system_prompt=load_system_prompt()
            )

llm.with_memory(20)

ui = WebUI()

ui.on_message("prompt", generate_prompt)
ui.on_message("commands", commands_handler)

App.run()
