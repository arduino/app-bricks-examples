# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.keyword_spotting import KeywordSpotting
from arduino.app_utils import App


spotting = KeywordSpotting()
spotting.on_detect("hey_arduino", lambda: print("Hey arduino detected!"))

App.run()
