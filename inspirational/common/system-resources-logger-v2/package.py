# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

"""Builds the release archives, by default in the parent folder of the project
(`python package.py <folder>` to choose another one):

- system-resources-logger-v2.zip      the app (English + French), to import in App Lab
- sysmon-v2-lang-<code>.zip           one optional language pack per language
- sysmon-v2-lang-all.zip              every language pack at once

A language pack only holds assets/lang/<code>.js: unzip it into the app folder on the board.
"""

import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(ROOT)
APP = "system-resources-logger-v2"
APP_ITEMS = ["app.yaml", "README.md", "README.fr.md", "python", "assets", "host-agent"]
EXECUTABLES = {"python/bin/sysmon-collector", "host-agent/install.sh", "host-agent/uninstall.sh"}
STAMP = (2026, 1, 1, 0, 0, 0)

LANGS = {
    "de": "Deutsch",
    "es": "Español",
    "fi": "Suomi",
    "it": "Italiano",
    "ja": "日本語",
    "pt": "Português",
    "ru": "Русский",
    "uk": "Українська",
    "zh": "简体中文",
}

PACK_README = """System Resources Logger v2 - language pack: {name} ({code})

Install / Installation:
  Unzip this archive into the app folder on the board, e.g.
    python3 -m zipfile -e sysmon-v2-lang-{code}.zip ~/ArduinoApps/system-resources-logger-v2/
  It adds assets/lang/{code}.js. Reload the dashboard: the {code_upper} button appears.

Remove / Supprimer:
  rm ~/ArduinoApps/system-resources-logger-v2/assets/lang/{code}.js
"""


def add(z: zipfile.ZipFile, arcname: str, data: bytes, executable: bool = False):
    info = zipfile.ZipInfo(arcname, STAMP)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3  # Unix: keeps the permission bits below
    info.external_attr = (0o100755 if executable else 0o100644) << 16
    z.writestr(info, data)


def app_files():
    for item in APP_ITEMS:
        path = os.path.join(ROOT, item)
        if os.path.isfile(path):
            yield item, path
            continue
        for folder, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in ("__pycache__", "lang")]
            for name in sorted(files):
                full = os.path.join(folder, name)
                yield os.path.relpath(full, ROOT).replace("\\", "/"), full


def build_app():
    target = os.path.join(OUT, f"{APP}.zip")
    with zipfile.ZipFile(target, "w") as z:
        for rel, full in app_files():
            with open(full, "rb") as f:
                add(z, f"{APP}/{rel}", f.read(), rel in EXECUTABLES)
    return target


def build_pack(codes, target):
    with zipfile.ZipFile(target, "w") as z:
        for code in codes:
            with open(os.path.join(ROOT, "lang-packs", f"{code}.js"), "rb") as f:
                add(z, f"assets/lang/{code}.js", f.read())
        if len(codes) == 1:
            code = codes[0]
            text = PACK_README.format(name=LANGS[code], code=code, code_upper=code.upper())
            add(z, f"README-lang-{code}.txt", text.encode("utf-8"))
    return target


def main():
    os.makedirs(OUT, exist_ok=True)
    built = [build_app()]
    built += [build_pack([c], os.path.join(OUT, f"sysmon-v2-lang-{c}.zip")) for c in LANGS]
    built.append(build_pack(list(LANGS), os.path.join(OUT, "sysmon-v2-lang-all.zip")))
    for path in built:
        with zipfile.ZipFile(path) as z:
            assert z.testzip() is None, path
        print(f"{os.path.getsize(path) / 1024:8.1f} KB  {os.path.basename(path)}")


if __name__ == "__main__":
    main()
