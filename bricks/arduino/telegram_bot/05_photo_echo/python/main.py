# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

bot = TelegramBot()


def echo_photo(sender: Sender, message: Message, photo_bytes: bytes, filename: str, size: int):
    """Echo back the received photo."""
    caption = f"📸 Photo received! Size: {size / 1024:.1f} KB"
    if message.caption:
        caption += f"\nOriginal caption: {message.caption}"

    sender.reply_photo(photo_bytes, caption)


bot.on_photo(echo_photo)

App.run()
