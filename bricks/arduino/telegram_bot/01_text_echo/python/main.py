# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

bot = TelegramBot()


def echo_text(sender: Sender, message: Message):
    """Echo back the received text message."""
    sender.reply(f"You said: {message.text}")


bot.on_text(echo_text)

App.run()
