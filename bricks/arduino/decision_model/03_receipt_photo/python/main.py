# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.decision_model import DecisionModel
from arduino.app_utils import App

decision_model = DecisionModel()

RECEIPT = "/app/assets/receipt.jpg"


def check_receipt():
    started_at = time.perf_counter()
    blender = decision_model.check(
        state="The customer says the blender arrived cracked and attached this photo of the receipt.",
        instructions="Does the receipt list a blender?",
        image=RECEIPT,
    )
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    print(f"Blender on the receipt: {blender.is_true} (probability {blender.probability:.2f})")
    print(f"Request time: {elapsed_ms:.0f} ms")
    time.sleep(60)


App.run(check_receipt)
