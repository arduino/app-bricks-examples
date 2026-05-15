# app-bricks-examples

Example applications based on Arduino Bricks for the Arduino UNO Q.

## Code Formatting

This project uses ESLint and Prettier to maintain consistent code style. Linting and formatting run **automatically on every commit** via Husky.

**Setup:**

- `task init:npm` - Install npm dependencies and setup Husky git hooks (run once at project setup)

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

The REUSE virtualenv is recreated and cleaned up automatically. The `.venv` used by `licensed` is kept after the task completes and recreated on the next dependency-license run.
