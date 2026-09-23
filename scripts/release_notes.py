# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

"""Compose the release notes of a version from the git history.

Used by the release workflow (release.yml): the notes are the base description
of the GitHub release, reviewed by hand for stable releases. They compare the
version being released (the checked-out commit, tagged only when the release is
published) with the previous release:

- a pre-release (X.Y.ZrcN) is compared with the previous release of any kind,
  the last RC or the last stable, whichever is more recent;
- a stable release (X.Y.Z) is compared with the previous stable release.

"Previous" is by version order, not by date: the greatest existing tag lower than
the version being released, so a re-run for an existing version compares with the
release before it. The notes hold the table of the examples added, fixed and
renamed and removed (an example is a directory holding an app.yaml), the commits in between,
and the link to the full diff. Links point at the version tag, which exists once
the release is published.

Usage:
  release_notes.py --version 0.13.0rc3 --print-previous
  release_notes.py --version 0.13.0rc3 [--previous 0.13.0rc2] [--header header.md] --out body.md
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

EXAMPLES_ROOTS = ("bricks", "core-and-foundational", "inspirational")
VERSION_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:rc(\d+))?$")


def version_key(version: str) -> tuple[int, int, int, int, int]:
    """Sort key following PEP 440 for this grammar: X.Y.ZrcN < X.Y.Z."""
    m = VERSION_RE.match(version)
    if not m:
        raise ValueError(f"invalid version {version!r}: expected X.Y.Z or X.Y.ZrcN")
    major, minor, patch, rc = m.groups()
    return (int(major), int(minor), int(patch), 0 if rc is not None else 1, int(rc or 0))


def is_prerelease(version: str) -> bool:
    return version_key(version)[3] == 0


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def previous_version(version: str) -> str | None:
    """The greatest release tag lower than `version` (stable ones only for a stable version)."""
    tags = [t for t in git("tag", "--list").split() if VERSION_RE.match(t)]
    key = version_key(version)
    candidates = [t for t in tags if version_key(t) < key and (is_prerelease(version) or not is_prerelease(t))]
    return max(candidates, key=version_key) if candidates else None


def examples_at(ref: str) -> set[str]:
    """Example directories (holding an app.yaml) under the examples roots at `ref`."""
    files = git("ls-tree", "-r", "--name-only", ref, "--", *EXAMPLES_ROOTS).split("\n")
    return {f[: -len("/app.yaml")] for f in files if f.endswith("/app.yaml")}


def example_of(path: str, examples: set[str]) -> str | None:
    """The example directory a changed file belongs to, the deepest match."""
    matches = [e for e in examples if path.startswith(e + "/")]
    return max(matches, key=len) if matches else None


def example_changes(previous: str, head: str, examples: set[str]) -> tuple[dict[str, str], set[str]]:
    """Renames and content changes between two refs, at the example level.

    Git rename detection runs on every file of the examples trees: an old example
    whose files were mostly renamed into one new example is that example renamed,
    however much its app.yaml changed. The second value holds the examples (by
    their head path, or their previous path when removed) with any content change:
    a modified, added or deleted file, or a renamed file that is not identical.
    """
    votes: dict[str, dict[str, int]] = {}
    touched: set[str] = set()
    for line in git("diff", "-M", "--name-status", previous, head, "--", *EXAMPLES_ROOTS).split("\n"):
        if not line:
            continue
        status, *paths = line.split("\t")
        owners = [example_of(path, examples) for path in paths]
        if status.startswith("R") and owners[0] and owners[1]:
            votes.setdefault(owners[0], {}).setdefault(owners[1], 0)
            votes[owners[0]][owners[1]] += 1
            if status != "R100":
                touched.add(owners[1])
        else:
            touched.update(owner for owner in owners if owner)
    renamed: dict[str, str] = {}
    taken: set[str] = set()
    for old in sorted(votes):
        for new, _ in sorted(votes[old].items(), key=lambda item: -item[1]):
            if new != old and new not in taken:
                renamed[old] = new
                taken.add(new)
                break
    return renamed, touched


def examples_table(previous: str | None, head: str, repo: str, version: str) -> list[str]:
    """One column per kind of change, each listing its examples: new, fixed, renamed, removed."""
    head_examples = examples_at(head)
    if previous is None:
        new, fixed, renamed, removed = sorted(head_examples), [], [], []
    else:
        prev_examples = examples_at(previous)
        renames, touched = example_changes(previous, head, head_examples | prev_examples)
        # A renamed example is neither new nor removed; it is fixed too when its
        # content changed, which the new name in app.yaml alone already does.
        renames = {old: new for old, new in renames.items() if old in prev_examples - head_examples and new in head_examples - prev_examples}
        new = sorted(head_examples - prev_examples - set(renames.values()))
        fixed = sorted(e for e in (head_examples & prev_examples) | set(renames.values()) if e in touched)
        renamed = [f"`{old}` → {link(new, repo, version)}" for old, new in sorted(renames.items())]
        removed = sorted(prev_examples - head_examples - set(renames))
    if not (new or fixed or renamed or removed):
        return ["No example added, fixed, renamed or removed.", ""]

    columns = [
        [link(e, repo, version) for e in new],
        [link(e, repo, version) for e in fixed],
        renamed,
        [link(e, repo, previous or version) for e in removed],
    ]
    rows = [
        "| " + " | ".join(column[i] if i < len(column) else "" for column in columns) + " |"
        for i in range(max(len(column) for column in columns))
    ]
    return ["| New examples | Examples fixed | Examples renamed | Examples removed |", "|---|---|---|---|", *rows, ""]


def link(example: str, repo: str, ref: str) -> str:
    return f"[`{example}`](https://github.com/{repo}/tree/{ref}/{example})"


def commits_list(previous: str | None, head: str, repo: str) -> list[str]:
    rev = f"{previous}..{head}" if previous else head
    log = git("log", "--no-merges", "--format=%H%x09%s", rev).strip()
    if not log:
        return ["No commits.", ""]
    lines = []
    for entry in log.split("\n"):
        sha, subject = entry.split("\t", 1)
        lines.append(f"- [`{sha[:7]}`](https://github.com/{repo}/commit/{sha}) {subject}")
    return [*lines, ""]


def compose(version: str, previous: str | None, head: str, repo: str, header: str) -> str:
    lines = []
    if header:
        lines += [header.rstrip("\n"), ""]
    since = f"since [{previous}](https://github.com/{repo}/releases/tag/{previous})" if previous else "first release"
    lines += [f"## Examples ({since})", ""]
    lines += examples_table(previous, head, repo, version)
    lines += [f"## What's Changed ({since})", ""]
    lines += commits_list(previous, head, repo)
    if previous:
        lines += [f"**Full Changelog**: https://github.com/{repo}/compare/{previous}...{version}", ""]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--version", required=True, help="version being released (X.Y.Z or X.Y.ZrcN)")
    parser.add_argument("--previous", default="auto", help="previous release tag, 'auto' (default) to derive it, 'none' for no comparison")
    parser.add_argument("--head", default="HEAD", help="commit being released (default: HEAD)")
    parser.add_argument("--repo", default="arduino/app-bricks-examples", help="GitHub repository, for the links")
    parser.add_argument("--header", type=Path, help="markdown file placed before the generated sections")
    parser.add_argument("--out", type=Path, help="write the notes here (default: stdout)")
    parser.add_argument("--print-previous", action="store_true", help="print the previous release tag (empty when none) and exit")
    args = parser.parse_args()

    try:
        version_key(args.version)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 2

    if args.previous == "auto":
        previous = previous_version(args.version)
    elif args.previous == "none":
        previous = None
    else:
        previous = args.previous

    if args.print_previous:
        print(previous or "")
        return 0

    header = args.header.read_text() if args.header else ""
    notes = compose(args.version, previous, args.head, args.repo, header)
    if args.out:
        args.out.write_text(notes)
    else:
        print(notes, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
