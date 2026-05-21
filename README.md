# app-bricks-examples

This repository contains all the source files for Examples based on Bricks, as well as the Learn section for Arduino App Lab.

You can find all examples in the [examples folder](./examples/). 

You can find all the learn articles in the [learn-docs folder](./learn-docs/).

To learn more about Arduino App Lab, what it can do, and all its features, go to [docs.arduino.cc/software/app-lab](https://docs.arduino.cc/software/app-lab/).

## Update licenses

### Requirements

- `Python` 3.13+
- `Taskfile` (https://taskfile.dev/docs/installation)
- `npm` (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- `licensed` 5.0.6 (https://github.com/licensee/licensed)
- `ruff` 0.14.2 (https://docs.astral.sh/ruff/installation/)

> NOTE: Make sure each requirement is available in PATH.

### Local workflows

#### License checks

This project uses [Licensed](https://github.com/licensee/licensed) and [REUSE](https://reuse.readthedocs.io/en/stable/) to mantain licenses versioning and SPDX headers.

Available tasks:

- `task license:headers` — update SPDX headers and validate REUSE compliance.
- `task license:deps` — refresh cached dependency license records with licensed.
- `task license` — execute both checks.

The REUSE virtualenv is recreated and cleaned up automatically. The `.venv` used by `licensed` is kept after the task completes and recreated on the next dependency-license run.

#### Code formatting

This project uses [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), and Ruff to maintain consistent code style.

Available tasks:

- `task fmt` — Run all formatters (Python + JS)
- `task fmt:python` — Format Python files with Ruff
- `task fmt:js` — Auto-fix ESLint issues and apply Prettier formatting on JS/web files (runs npm dependency setup automatically)
