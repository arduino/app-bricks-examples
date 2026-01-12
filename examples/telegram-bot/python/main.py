# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

# EXAMPLE_NAME = "Telegram bot"
from arduino.app_bricks.telegram_bot import TelegramBot, Update, ContextTypes
from arduino.app_bricks.object_detection import ObjectDetection
from arduino.app_utils import App
from PIL import Image
from io import BytesIO
import threading
import time

# Initialize the brick
bot = TelegramBot()
object_detection = ObjectDetection()

chat_id = 0  # Global variable to store the chat ID of the last interaction

async def greet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global chat_id
    chat_id = update.effective_chat.id
    print(f"Updated chat_id to {chat_id}")
    user = update.effective_user
    await update.message.reply_markdown(f"Hi **{user.first_name}**. This is UNO Q!")

async def help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global chat_id
    chat_id = update.effective_chat.id
    print(f"Updated chat_id to {chat_id}")
    help_text = (
        "🤖 *Available Commands:*\n"
        "/hello - Greet the bot\n"
        "/help - Show this help message\n\n"
        "You can also send me any text message, and I will echo it back to you.\n"
        "Send me a photo, and I will perform object detection on it!"
    )
    await update.message.reply_markdown(help_text)

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global chat_id
    chat_id = update.effective_chat.id
    print(f"Updated chat_id to {chat_id}")
    await update.message.reply_text(f'🦜: {update.message.text}')

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global chat_id
    chat_id = update.effective_chat.id
    print(f"Updated chat_id to {chat_id}")
    await update.message.reply_text("📷: Detecting objects...")
    
    photo_file = await update.message.photo[-1].get_file()
    photo_bytes = await photo_file.download_as_bytearray()
    
    # Image Processing
    image = Image.open(BytesIO(photo_bytes))

    results = object_detection.detect(image, confidence=0.1)
    img_with_boxes = object_detection.draw_bounding_boxes(image, results)

    output = BytesIO()
    img_with_boxes.save(output, format='PNG')
    output.seek(0)
    
    await update.message.reply_photo(photo=output, caption="✅: Here is the processed image!")

# --- Registration ---

bot.add_command("hello", greet)
bot.add_command("help", help)
bot.on_text(echo)
bot.on_photo(handle_photo)

def proactive_messages():
    """Send proactive messages in a separate thread"""
    time.sleep(60)  # Wait 60 seconds before sending the delayed message, in order to allow time for initial interaction
    bot.send_message(f"Hi, this is a proactive event from UNO Q Telegram Bot, I'm using the chat_id of the last interaction. Chat ID: {chat_id}", chat_id=chat_id)

# Start the proactive messages thread
message_thread = threading.Thread(target=proactive_messages, daemon=True)
message_thread.start()

# Start the Arduino App framework using the bot's run method
App.run(user_loop=bot.run)