# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

"""Generate or check the examples manifest (examples.json).

The manifest is fully derived from the filesystem:
- core-and-foundational: one entry per category folder (NN- prefixes define the
  order), each holding its examples in folder order.
- bricks: one entry per brick (A-Z), each holding its examples in folder order.

An example is a directory containing an app.yaml file. Example IDs are the
`examples:` namespace prefix followed by the example path relative to the
repository root.

Usage:
    python3 scripts/examples_manifest.py --write   # (re)generate examples.json
    python3 scripts/examples_manifest.py --check   # fail if examples.json is stale
"""

import argparse
import json
import sys
from pathlib import Path

MANIFEST = "examples.json"
CORE_ROOT = "core-and-foundational"
BRICKS_ROOT = "bricks"


def is_example(path: Path) -> bool:
    return path.is_dir() and (path / "app.yaml").is_file()


def example_entry(path: Path) -> dict:
    return {"id": f"examples:{path.as_posix()}"}


def core_section(repo: Path) -> list:
    root = repo / CORE_ROOT
    section = []
    for category in sorted(p for p in root.iterdir() if p.is_dir()):
        examples = [example_entry(p.relative_to(repo)) for p in sorted(category.iterdir()) if is_example(p)]
        if examples:
            section.append({"category": category.name, "examples": examples})
    return section


def bricks_section(repo: Path) -> list:
    root = repo / BRICKS_ROOT
    section = []
    for namespace in sorted(p for p in root.iterdir() if p.is_dir()):
        for brick in sorted(p for p in namespace.iterdir() if p.is_dir()):
            examples = [example_entry(p.relative_to(repo)) for p in sorted(brick.iterdir()) if is_example(p)]
            if examples:
                section.append({"brick": f"{namespace.name}:{brick.name}", "examples": examples})
    return section


def render(repo: Path) -> str:
    manifest = {
        "core-and-foundational": core_section(repo),
        "bricks": bricks_section(repo),
    }
    return json.dumps(manifest, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write the manifest to examples.json")
    mode.add_argument("--check", action="store_true", help="fail when examples.json does not match the filesystem")
    args = parser.parse_args()

    repo = Path(__file__).resolve().parent.parent
    expected = render(repo)
    manifest_path = repo / MANIFEST

    if args.write:
        manifest_path.write_text(expected)
        print(f"{MANIFEST} written.")
        return 0

    if not manifest_path.is_file():
        print(f"::error::{MANIFEST} is missing. Run 'task examples:gen-manifest' and commit the result.")
        return 1
    if manifest_path.read_text() != expected:
        print(f"::error::{MANIFEST} is out of date. Run 'task examples:gen-manifest' and commit the result.")
        return 1
    print(f"{MANIFEST} is up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
