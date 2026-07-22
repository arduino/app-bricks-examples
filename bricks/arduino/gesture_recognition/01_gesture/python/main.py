# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.gesture_recognition import GestureRecognition
from arduino.app_utils.app import App

pd = GestureRecognition()
pd.on_gesture("Victory", lambda meta: print("All your bases are belong to us"))
pd.on_gesture("Open_Palm", lambda meta: print("Moving left!"), hand="left")
pd.on_gesture("Open_Palm", lambda meta: print("Moving right!"), hand="right")

App.run()
