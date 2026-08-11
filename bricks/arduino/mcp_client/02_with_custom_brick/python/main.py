# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.mcp_client import MCPClient, HTTPEndpoint
from arduino.app_utils import Logger, App

logger = Logger(name="with_custom_brick_example")

# The MCP server is deployed with the app (see bricks/mcp-server).
gateway = HTTPEndpoint(name="demo", url="http://mcp-server:8080/mcp")

client = MCPClient(endpoints=[gateway])

logger.info(client.list_tools())

App.run()
