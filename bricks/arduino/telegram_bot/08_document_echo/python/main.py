# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

bot = TelegramBot()


def echo_document(sender: Sender, message: Message, document_bytes: bytes, filename: str, size: int):
    """Echo back the received document file."""
    caption = f"📄 Document received! File: {filename}, Size: {size / 1024:.1f} KB"
    if message.caption:
        caption += f"\nOriginal caption: {message.caption}"

    sender.reply_document(document_bytes, filename, caption)


bot.on_document(echo_document)

App.run()
