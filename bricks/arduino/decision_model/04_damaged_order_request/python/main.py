# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.decision_model import Choice, DecisionModel, Noul
from arduino.app_utils import App

decision_model = DecisionModel()

REQUEST = "The blender I ordered arrived with a cracked jar. I paid with a gift card, please send me a new one instead of a refund."


def handle_request():
    started_at = time.perf_counter()
    answers = decision_model.decide(
        state=REQUEST,
        questions={
            "team": Choice(
                instructions="Which team should handle this request?",
                options={
                    "returns": "Refunds, replacements and damaged deliveries",
                    "billing": "Payments, invoices and charges",
                    "technical": "Product setup and faults",
                },
            ),
            "replacement": Noul(instructions="Does the customer want a replacement rather than a refund?"),
            "payment": Choice(instructions="How was the order paid?", options=["card", "cash", "gift card"]),
        },
    )
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    team = answers.choice("team")
    print(f"Team: {team.choice} (probability {team.probabilities[team.choice]:.2f})")
    replacement = answers.noul("replacement")
    print(f"Replacement wanted: {replacement.is_true} (probability {replacement.probability:.2f})")
    payment = answers.choice("payment")
    print(f"Paid by: {payment.choice} (probability {payment.probabilities[payment.choice]:.2f})")
    print(f"Request time: {elapsed_ms:.0f} ms")
    time.sleep(60)


App.run(handle_request)
