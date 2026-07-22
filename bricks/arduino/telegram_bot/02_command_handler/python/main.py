# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

bot = TelegramBot()


def start_command(sender: Sender, message: Message):
    """Handle /start command."""
    sender.reply(f"👋 Welcome {sender.first_name}! I'm your Telegram bot.")


def hello_command(sender: Sender, message: Message):
    """Handle /hello command."""
    sender.reply(f"Hello {sender.first_name}! How can I help you today?")


bot.add_command("start", start_command, "Start the bot")
bot.add_command("hello", hello_command, "Say hello")

App.run()
