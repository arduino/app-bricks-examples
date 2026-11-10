# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.decision_model import Choice, DecisionModel, Noul
from arduino.app_utils import App

decision_model = DecisionModel()

RECEIPT = "/app/assets/receipt.jpg"


def check_receipt():
    started_at = time.perf_counter()
    answers = decision_model.decide(
        state="The customer says the blender arrived cracked and attached this photo of the receipt.",
        questions={
            "team": Choice(
                instructions="Which team should handle this request?",
                options={
                    "returns": "Refunds, replacements and damaged deliveries",
                    "billing": "Payments, invoices and charges",
                    "technical": "Product setup and faults",
                },
            ),
            "blender": Noul(instructions="Does the receipt list a blender?"),
            "payment": Choice(instructions="How was the order paid?", options=["card", "cash", "gift card"]),
        },
        image=RECEIPT,
    )
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    team = answers.choice("team")
    print(f"Team: {team.choice} (probability {team.probabilities[team.choice]:.2f})")
    blender = answers.noul("blender")
    print(f"Blender on the receipt: {blender.is_true} (probability {blender.probability:.2f})")
    payment = answers.choice("payment")
    print(f"Paid by: {payment.choice} (probability {payment.probabilities[payment.choice]:.2f})")
    print(f"Request time: {elapsed_ms:.0f} ms")
    time.sleep(60)


App.run(check_receipt)
