#!/bin/sh
# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0
# Installs the System Resources Logger v2 host agent on the board (UNO Q / VENTUNO Q).
#
# The App Lab container only sees its own processes and network. The agent runs the same
# Rust collector directly on the board and writes <app>/data/host-metrics.json, which the
# app then prefers: all processes, Wi-Fi, board OS, firmware versions (ethtool, UEFI).
#
#   sudo ./install.sh [APP_DIR] [INTERVAL]
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
APP_DIR=${1:-$(dirname "$SCRIPT_DIR")}
INTERVAL=${2:-5}
BIN_SRC="$APP_DIR/python/bin/sysmon-collector"
BIN_DST=/usr/local/bin/sysmon-collector
UNIT=/etc/systemd/system/sysmon-host.service

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo $0 $*" >&2
  exit 1
fi
if [ ! -f "$APP_DIR/app.yaml" ]; then
  echo "App folder not found: $APP_DIR (expected: the folder containing app.yaml)" >&2
  exit 1
fi
if [ ! -f "$BIN_SRC" ]; then
  echo "Binary missing: $BIN_SRC (build it with collector/build.sh or build.ps1)" >&2
  exit 1
fi
case "$(uname -m)" in
  aarch64|arm64) ;;
  *) echo "Warning: architecture $(uname -m), the bundled binary is for aarch64." >&2 ;;
esac

OWNER=$(stat -c %U "$APP_DIR")
install -m 0755 "$BIN_SRC" "$BIN_DST"
install -d -o "$OWNER" -m 0755 "$APP_DIR/data"

cat > "$UNIT" <<EOF
[Unit]
Description=System Resources Logger v2 - host agent
After=multi-user.target

[Service]
User=$OWNER
ExecStart=$BIN_DST --interval $INTERVAL --top 8 --out "$APP_DIR/data/host-metrics.json"
Restart=always
RestartSec=5
# Read every process (fd, fdinfo for GPU/NPU usage) without running as root.
AmbientCapabilities=CAP_SYS_PTRACE CAP_DAC_READ_SEARCH
CapabilityBoundingSet=CAP_SYS_PTRACE CAP_DAC_READ_SEARCH
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths="$APP_DIR/data"
PrivateTmp=yes
Nice=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now sysmon-host.service
sleep 3
if [ -s "$APP_DIR/data/host-metrics.json" ]; then
  echo "Host agent running: $APP_DIR/data/host-metrics.json"
else
  echo "The agent is not producing data yet: journalctl -u sysmon-host -n 50" >&2
fi
