# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.gesture_recognition import GestureRecognition
from arduino.app_utils.app import App

pd = GestureRecognition()
pd.on_enter(lambda: print("Hi there!"))
pd.on_exit(lambda: print("Goodbye!"))

App.run()
