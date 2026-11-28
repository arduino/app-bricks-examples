#!/bin/sh
# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0
# Removes the System Resources Logger v2 host agent.
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi
systemctl disable --now sysmon-host.service 2>/dev/null || true
rm -f /etc/systemd/system/sysmon-host.service /usr/local/bin/sysmon-collector
systemctl daemon-reload
echo "Host agent removed (the app's data/host-metrics.json file can be deleted)."
