# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import os


def load_system_prompt():
    try:
        with open(os.path.join(os.path.dirname(__file__), "system_prompt.txt"), "r") as f:
            system_prompt = f.read()
            f.close()
    except Exception:
            system_prompt = "You are a generic AI Chatbot Assistant."
    return system_prompt