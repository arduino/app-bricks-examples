# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.cloud_llm import CloudLLM, SQLMessagePersistence
from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_utils import App

# Share a single SQLStore instance across bricks that need it.
db = SQLStore("chat_history.db")
db.start()

llm = CloudLLM(
    api_key="YOUR_API_KEY",  # Replace with your actual API key
    system_prompt="You are a helpful assistant.",
).with_memory(
    max_messages=10,
    persistence=SQLMessagePersistence(sql_store=db, thread_id="demo-user"),
)


def ask_prompt():
    print(llm.chat("Remember that my favorite color is blue."))
    print(llm.chat("What is my favorite color?"))
    raise StopIteration


App.run(user_loop=ask_prompt)
