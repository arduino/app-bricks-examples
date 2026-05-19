# app-bricks-examples

Example applications based on Arduino Bricks for the Arduino UNO Q.

## Update licenses

### Requirements
- Python 3.13+
- Taskfile (https://taskfile.dev/docs/installation)
- `licensed` 5.0.6 (https://github.com/licensee/licensed)
- `ruff` 0.14.2 (https://docs.astral.sh/ruff/installation/) **(please install it via pipx)**

> NOTE: Make sure each requirement is available in PATH.

### Local workflows

#### License checks
- Run `task license:headers` to update SPDX headers and validate REUSE compliance.
- Run `task license:deps` to refresh cached dependency license records with `licensed`.
- Run `task license` to execute both checks.

The REUSE virtualenv is recreated and cleaned up automatically. The `.venv` used by `licensed` is kept after the task completes and recreated on the next dependency-license run.

#### Format checks
- Run `task fmt:python` to check and auto-format python codebase following defined base rules.
- Run `task fmt` to check and auto-format both python and javascript/html/css codebase.