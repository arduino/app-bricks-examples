# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.cloud_llm import SQLMessagePersistence
from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_bricks.vlm import VisionLanguageModel
from arduino.app_utils import App

db = SQLStore("vlm_persistent_demo.db")
db.start()

vlm = VisionLanguageModel(
    system_prompt="You are a helpful visual assistant.",
).with_memory(
    max_messages=10,
    persistence=SQLMessagePersistence(sql_store=db, thread_id="vlm-demo-conversation"),
)


def ask_prompt():
    images = ["/app/assets/chair.jpg"]
    prompt = "Describe the image and its details"
    print("FIRST ANSWER:")
    print(vlm.chat(prompt, images=images))

    print("SECOND ANSWER (based on memory, no image provided):")
    prompt_2 = "Now summarize the image description and its details"
    print(vlm.chat(prompt_2))

    # Clear memory
    vlm.clear_memory()
    print("Memory cleared for this thread.")

    raise StopIteration  # This ends the user loop


App.run(user_loop=ask_prompt)
