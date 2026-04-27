# app-bricks-examples

Example applications based on Arduino Bricks for the Arduino UNO Q.

## Update licenses

### Requirements
- Python 3.13+
- Taskfile (https://taskfile.dev/docs/installation)
- `licensed` 5.0.6 (https://github.com/licensee/licensed)

> NOTE: Make sure each requirement is available in PATH.

### Local workflow
- Run `task license:headers` to update SPDX headers and validate REUSE compliance.
- Run `task license:deps` to refresh cached dependency license records with `licensed`.
- Run `task license` to execute both checks.

The temporary virtualenvs used by the license tasks are recreated and cleaned up automatically.
