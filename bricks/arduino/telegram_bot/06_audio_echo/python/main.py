# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

bot = TelegramBot()


def echo_audio(sender: Sender, message: Message, audio_bytes: bytes, filename: str, size: int):
    """Echo back the received audio file."""
    caption = f"🎵 Audio received! File: {filename}, Size: {size / 1024:.1f} KB"
    if message.caption:
        caption += f"\nOriginal caption: {message.caption}"

    sender.reply_audio(audio_bytes, caption, filename)


bot.on_audio(echo_audio)

App.run()
