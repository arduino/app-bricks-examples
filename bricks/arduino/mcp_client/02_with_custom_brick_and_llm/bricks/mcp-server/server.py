# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

"""A minimal MCP server exposing its tools over streamable HTTP."""

from datetime import datetime
from zoneinfo import ZoneInfo

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Clock", host="0.0.0.0", port=8080)


@mcp.tool()
def get_current_datetime(timezone: str = "UTC") -> str:
    """Get the current date and time in the given IANA timezone (e.g. 'Europe/Rome', 'America/New_York')."""
    return datetime.now(ZoneInfo(timezone)).strftime("%A %Y-%m-%d %H:%M:%S %Z")


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
