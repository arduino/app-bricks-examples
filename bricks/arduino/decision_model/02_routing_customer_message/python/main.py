# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import time

from arduino.app_bricks.decision_model import Choice, DecisionModel, Noul, Score
from arduino.app_utils import App

decision_model = DecisionModel()

MESSAGE = "Hi, I was charged twice for my last order and nobody answers the phone. Please fix this today!"


def route_message():
    started_at = time.perf_counter()
    answers = decision_model.decide(
        state=MESSAGE,
        questions={
            "department": Choice(
                instructions="Which department should handle this customer message?",
                options={
                    "billing": "Payments, invoices, refunds and double charges",
                    "shipping": "Delivery status, lost or damaged parcels",
                    "technical": "Product not working, setup and firmware problems",
                },
            ),
            "urgency": Score(
                instructions="How urgent is this message?",
                levels=["Can wait a week", "Should be handled in a few days", "Needs an answer today"],
            ),
            "angry": Noul(instructions="Is the customer angry?"),
        },
    )

    elapsed_ms = (time.perf_counter() - started_at) * 1000
    department = answers.choice("department")
    urgency = answers.score("urgency")
    angry = answers.noul("angry")
    print(f"Department: {department.choice} (confidence {department.confidence:.2f})")
    print(f"Urgency: {urgency.level} (score {urgency.score:.1f} of {len(urgency.legend) - 1})")
    print(f"Angry customer: {angry.is_true} (probability {angry.probability:.2f})")
    print(f"Request time: {elapsed_ms:.0f} ms")
    time.sleep(60)


App.run(route_message)
