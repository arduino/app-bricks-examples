# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.multimodal_llm import MultimodalLanguageModel
from arduino.app_peripherals.camera import Camera
from arduino.app_peripherals.microphone import Microphone
from arduino.app_utils import App
from arduino.app_utils.image import compressed_to_jpeg

model = MultimodalLanguageModel(system_prompt="You are a helpful visual assistant. Answer briefly.", max_tokens=120)
camera = Camera(adjustments=compressed_to_jpeg())  # Frames are JPEG images, as the model expects
microphone = Microphone()


def answer_about_scene():
    print("Ask a question about what the camera sees...")
    with microphone:
        # Recording stops when you pause after the question, None means nobody spoke
        question = microphone.record_until_pause(pause_s=1.0, max_s=10.0, timeout_s=10.0)
    if question is None:
        return

    frame = camera.capture(latest=True)  # The scene as it is now, not a frame buffered earlier
    if frame is None:
        print("No frame captured from the camera")
        return

    answer = model.chat("Answer the spoken question about this picture.", images=[frame.tobytes()], audio=question)
    print(answer, flush=True)


with camera:
    App.run(user_loop=answer_about_scene)
