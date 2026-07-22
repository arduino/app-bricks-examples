# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_utils import App

# Replace with your authorized Telegram user IDs
# Use @userinfobot on Telegram to get your user ID
AUTHORIZED_USER_IDS = [123456789, 987654321]

# Whitelist is applied to ALL handlers: commands, text, and media
bot = TelegramBot(whitelist_user_ids=AUTHORIZED_USER_IDS)


def restricted_command(sender: Sender, message: Message):
    """Only authorized users can trigger this command."""
    sender.reply(f"✅ Access granted! Welcome {sender.first_name}.")


def restricted_text(sender: Sender, message: Message):
    """Only authorized users can send text messages."""
    sender.reply(f"🔒 Authorized text received: {message.text}")


bot.add_command("start", restricted_command, "Start the bot (authorized users only)")
bot.on_text(restricted_text)  # Whitelist also applies to handlers like on_text
bot.start()

App.run()
