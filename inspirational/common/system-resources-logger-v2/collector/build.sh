#!/bin/sh
# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0
# Builds the static aarch64 collector and copies it to python/bin/ (Linux / macOS / WSL).
set -eu
cd "$(dirname "$0")"
rustup target add aarch64-unknown-linux-musl >/dev/null
cargo test
cargo build --release --target aarch64-unknown-linux-musl
mkdir -p ../python/bin
cp target/aarch64-unknown-linux-musl/release/sysmon-collector ../python/bin/sysmon-collector
chmod 0755 ../python/bin/sysmon-collector
ls -l ../python/bin/sysmon-collector
