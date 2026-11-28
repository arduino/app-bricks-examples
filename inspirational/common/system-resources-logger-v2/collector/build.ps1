# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Builds the static aarch64 collector and copies it to python\bin\ (Windows).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
rustup target add aarch64-unknown-linux-musl | Out-Null
cargo test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cargo build --release --target aarch64-unknown-linux-musl
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$bin = Join-Path $PSScriptRoot '..\python\bin'
New-Item -ItemType Directory -Force $bin | Out-Null
Copy-Item -Force 'target\aarch64-unknown-linux-musl\release\sysmon-collector' (Join-Path $bin 'sysmon-collector')
Get-Item (Join-Path $bin 'sysmon-collector') | Select-Object FullName, Length
