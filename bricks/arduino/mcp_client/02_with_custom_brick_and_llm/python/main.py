# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.mcp_client import MCPClient, HTTPEndpoint
from arduino.app_bricks.cloud_llm import CloudLLM, CloudModel
from arduino.app_utils import Logger, App

logger = Logger(name="with_custom_brick_and_llm_example")

# The MCP server is built and deployed with the app (see bricks/mcp-server);
# the model answers by calling its get_current_datetime tool.
mcp = MCPClient(endpoints=[HTTPEndpoint(name="clock", url="http://mcp-server:8080/mcp")])

llm = CloudLLM(
    model=CloudModel.GOOGLE_GEMINI,
    api_key="YOUR_API_KEY",  # Replace with your actual API key
    tools=mcp.get_tools(),
)


def ask_prompt():
    logger.info(llm.chat("What time is it in Rome?"))
    raise StopIteration


App.run(user_loop=ask_prompt)
