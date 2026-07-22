# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.motion_detection import MotionDetection
from arduino.app_utils import App, Bridge

motion_detection = MotionDetection(confidence=0.4)


# Register function to receive samples from sketch
def record_sensor_movement(x: float, y: float, z: float):
    # Acceleration from sensor is in g. While we need m/s^2.
    x = x * 9.81
    y = y * 9.81
    z = z * 9.81

    # Append the values to the sensor buffer. These samples will be sent to the model.
    global motion_detection
    motion_detection.accumulate_samples((x, y, z))


# Eg. Register the function to be called from the Arduino sketch
Bridge.provide("record_sensor_movement", record_sensor_movement)


# Register action to take after successful detection
def on_updown_movement_detected(classification: dict):
    print("updown movement detected!")


motion_detection.on_movement_detection("updown", on_updown_movement_detected)

App.run()
