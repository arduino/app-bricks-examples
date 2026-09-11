# app-bricks-examples

This repository contains all the source files for Examples based on Bricks, as well as the Learn section for Arduino App Lab.

You can find all examples in the [inspirational folder](./inspirational/), the [core-and-foundational folder](./core-and-foundational/) and the [bricks folder](./bricks/). 

You can find all the learn articles in the [learn-docs folder](./learn-docs/).

To learn more about Arduino App Lab, what it can do, and all its features, go to [docs.arduino.cc/software/app-lab](https://docs.arduino.cc/software/app-lab/).

## Check the alignment with app-bricks-py

The examples must use the bricks library as its API contract allows. Pyright analyzes the examples' Python sources resolving the library from a source checkout of [app-bricks-py](https://github.com/arduino/app-bricks-py): clone that repository next to this one, install its dependencies in its venv (`pip install -e ".[dev]"` from that checkout) and run:

```sh
task check:bricks-alignment:run
```

To list the bricks that have no examples yet:

```sh
task check:bricks-alignment:coverage
```

On pull requests the `check-bricks-alignment.yml` workflow runs the same analysis against the `main` branch of app-bricks-py and fails when the PR introduces new errors: when an example depends on a library change, merge that change first. The workflow can also be run manually against another app-bricks-py ref to verify an examples branch ahead of that merge. See `task check:bricks-alignment -- --help` for the other modes of the check script (JSON output, base/head diff).

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

#### Examples manifest

This project ships an [examples.json](./examples.json) manifest describing the core-and-foundational and bricks examples. The file is fully derived from the filesystem and must stay in sync with it: a CI check fails any pull request where the manifest is stale.

Available tasks:

- `task examples:gen-manifest` — regenerate `examples.json` from the filesystem.
- `task examples:check-manifest` — fail when `examples.json` does not match the filesystem.

After adding, removing or renaming an example, run `task examples:gen-manifest` and commit the updated manifest.

#### Code formatting

This project uses [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), and Ruff to maintain consistent code style.

Available tasks:

- `task fmt` — Run all formatters (Python + JS)
- `task fmt:python` — Format Python files with Ruff
- `task fmt:js` — Auto-fix ESLint issues and apply Prettier formatting on JS/web files (runs npm dependency setup automatically)
