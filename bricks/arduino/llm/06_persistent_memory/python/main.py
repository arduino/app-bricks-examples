# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.cloud_llm import SQLMessagePersistence
from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_bricks.llm import LargeLanguageModel
from arduino.app_utils import App

db = SQLStore("llm_persistent_demo.db")
db.start()

llm = LargeLanguageModel(
    system_prompt="You are a helpful assistant.",
).with_memory(
    max_messages=10,
    persistence=SQLMessagePersistence(sql_store=db, thread_id="llm-demo-conversation"),
)


def ask_prompt():
    prompt = "Hi, what can you do as an AI assistant?"
    print(llm.chat(prompt))
    print()
    raise StopIteration  # This stops the user loop


App.run(user_loop=ask_prompt)
