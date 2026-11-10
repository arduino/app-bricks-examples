# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.decision_model import DecisionModel
from arduino.app_utils import App

decision_model = DecisionModel()

ROOM = "Living room: temperature 23.0 °C, relative humidity 80 %."


def control_dehumidifier():
    humid = decision_model.check(
        state=ROOM,
        instructions="Is the air in this room too humid?",
        true_description="The humidity is higher than what people find comfortable",
        false_description="The humidity is comfortable or low",
    )
    if humid.is_true:
        print(f"The air is too humid (probability {humid.probability:.2f}): dehumidifier on")
    else:
        print(f"The humidity is comfortable (probability of too humid {humid.probability:.2f}): dehumidifier off")
    time.sleep(60)


App.run(control_dehumidifier)
