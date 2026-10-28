# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.multimodal_llm import MultimodalLanguageModel
from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App

model = MultimodalLanguageModel(system_prompt="You are a helpful voice assistant. Answer briefly.")
microphone = Microphone()  # 16 kHz mono, the format the model expects for raw samples


def answer_request():
    print("Ask something, you have 5 seconds...")
    with microphone:
        recording = microphone.record_pcm(5)

    # The raw samples go to the model as they are, the answer is printed while it is generated
    for chunk in model.chat_stream("Answer the request in this recording.", audio=recording):
        print(chunk, end="", flush=True)
    print()


App.run(user_loop=answer_request)
