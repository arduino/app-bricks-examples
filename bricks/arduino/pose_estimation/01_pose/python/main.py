# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.pose_estimation import PoseEstimation

pose_estimation = PoseEstimation()
pose_estimation.on_pose("standing", lambda pose: print(f"Standing: {pose.event}"))
pose_estimation.on_pose("sitting", lambda pose: print(f"Sitting: {pose.event}"))
pose_estimation.on_pose("left_arm_raised", lambda pose: print(f"Left arm raised: {pose.event}"))
pose_estimation.on_pose("right_arm_raised", lambda pose: print(f"Right arm raised: {pose.event}"))

App.run()
