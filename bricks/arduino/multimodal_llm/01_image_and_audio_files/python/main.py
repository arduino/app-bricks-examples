# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.multimodal_llm import MultimodalLanguageModel
from arduino.app_utils import App

model = MultimodalLanguageModel()


def ask_prompt():
    # The recording holds the question, the text prompt tells the model to answer it
    answer = model.chat(
        "Answer the spoken request about this image.",
        images=["assets/chair.jpg"],
        audio="assets/question.wav",
    )
    print(answer, flush=True)
    raise StopIteration  # This stops the user loop


App.run(user_loop=ask_prompt)
