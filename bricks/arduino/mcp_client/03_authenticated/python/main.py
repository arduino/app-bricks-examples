# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import os

from arduino.app_bricks.mcp_client import MCPClient, HTTPEndpoint
from arduino.app_utils import Logger, App


logger = Logger(name="authenticated_mcp_client_example")

# `token` is sent as an "Authorization: Bearer" header;
# set GITHUB_MCP_PAT in app.yaml under the brick's `variables`.
github = HTTPEndpoint(
    name="github",
    url="https://api.githubcopilot.com/mcp/",
    token=os.getenv("GITHUB_MCP_PAT"),
)

# Some providers use custom headers instead of a bearer token:
# datadog = HTTPEndpoint(
#     name="datadog",
#     url="https://<your-datadog-mcp-domain>/mcp",
#     headers={
#         "DD-API-KEY": os.getenv("DD_API_KEY", ""),
#         "DD-APPLICATION-KEY": os.getenv("DD_APP_KEY", ""),
#     },
# )

client = MCPClient(endpoints=[github])

logger.info(client.get_tools())

App.run()
