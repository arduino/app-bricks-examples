# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

# Replace with your Telegram chat ID
# Send a message to your bot and check the chat_id
TARGET_CHAT_ID = 123456789

bot = TelegramBot()


def start_command(sender: Sender, message: Message):
    """Start scheduling recurring messages."""
    task_id = bot.schedule_message(
        chat_id=sender.chat_id,
        message_text="⏰ This is a recurring message!",
        interval_seconds=60,  # Send every 60 seconds
    )
    sender.reply(f"✅ Scheduled recurring message! Task ID: {task_id}")


bot.add_command("start", start_command, "Start recurring messages")

App.run()
