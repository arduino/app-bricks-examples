# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.pose_estimation import Pose, PoseEstimation

pose_estimation = PoseEstimation()

value = 50
STEP = 10


def on_arm(pose: Pose):
    global value
    if pose.event == "enter":
        if pose.name == "right_arm_raised":
            value = value + STEP
        if pose.name == "left_arm_raised":
            value = max(0, value - STEP)
        print(f"Value: {value}")


pose_estimation.on_pose("right_arm_raised", on_arm)
pose_estimation.on_pose("left_arm_raised", on_arm)

App.run()
