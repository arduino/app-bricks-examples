# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.decision_model import DecisionModel, Noul
from arduino.app_utils import App

decision_model = DecisionModel()

PLANT = "Basil pot on the windowsill: soil moisture 12 %, last watered 6 days ago."


def water_plant():
    answers = decision_model.decide(
        state=PLANT,
        questions={"thirsty": Noul(instructions="Does the plant need water?")},
    )
    thirsty = answers.noul("thirsty")
    print(f"Needs water: {thirsty.is_true} (probability {thirsty.probability:.2f})")
    time.sleep(60)


App.run(water_plant)
