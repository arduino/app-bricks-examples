# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

bot = TelegramBot()


def echo_video(sender: Sender, message: Message, video_bytes: bytes, filename: str, size: int):
    """Echo back the received video file."""
    caption = f"🎬 Video received! File: {filename}, Size: {size / 1024:.1f} KB"
    if message.caption:
        caption += f"\nOriginal caption: {message.caption}"

    sender.reply_video(video_bytes, caption, filename)


bot.on_video(echo_video)

App.run()
