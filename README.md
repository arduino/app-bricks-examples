# app-bricks-examples

This repository contains all the source files for Examples based on Bricks, as well as the Learn section for Arduino App Lab.

You can find all examples in the [examples folder](./examples/). 

You can find all the learn articles in the [learn-docs folder](./learn-docs/).

To learn more about Arduino App Lab, what it can do, and all its features, go to [docs.arduino.cc/software/app-lab](https://docs.arduino.cc/software/app-lab/).

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
