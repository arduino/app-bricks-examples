# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

FROM python:3.13-slim

RUN pip install --no-cache-dir "mcp>=1.10" tzdata

WORKDIR /app
COPY server.py .

EXPOSE 8080

CMD ["python", "server.py"]
