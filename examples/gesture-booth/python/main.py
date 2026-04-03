# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.hand_gesture_tracking import HandGestureTracking
from arduino.app_peripherals.camera import Camera
from arduino.app_utils.image.adjustments import cropped_to_aspect_ratio
from arduino.app_utils.app import App


ui = WebUI()

camera = Camera(resolution=(1280, 960), fps=30, codec="MJPG", adjustments=cropped_to_aspect_ratio((4, 3)))
camera.start()

pd = HandGestureTracking(camera)
pd.on_gesture("None", lambda meta: ui.send_message('gesture_detected', {'gesture': 'None'}))
pd.on_gesture("Closed_Fist", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Closed Fist'}))
pd.on_gesture("Open_Palm", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Open Palm'}))
pd.on_gesture("Pointing_Up", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Pointing Up'}))
pd.on_gesture("Thumb_Down", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Thumb Down'}))
pd.on_gesture("Thumb_Up", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Thumb Up'}))
pd.on_gesture("Victory", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Victory'}))
pd.on_gesture("ILoveYou", lambda meta: ui.send_message('gesture_detected', {'gesture': 'Rock'}))

App.run()
