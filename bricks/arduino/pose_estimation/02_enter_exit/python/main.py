# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.pose_estimation import PoseEstimation

pose_estimation = PoseEstimation(confidence=0.35, count_debounce_sec=1.0)

pose_estimation.on_enter(lambda: print("Somebody is in the room"))
pose_estimation.on_exit(lambda: print("The room is empty"))
pose_estimation.on_count_change(lambda count: print(f"People in view: {count}"))

App.run()
