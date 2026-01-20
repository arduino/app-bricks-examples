# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

# EXAMPLE_NAME = "Telegram bot"
from arduino.app_bricks.telegram_bot import TelegramBot, Update, ContextTypes
from arduino.app_bricks.object_detection import ObjectDetection
from arduino.app_utils import App
from PIL import Image
from io import BytesIO

# Initialize the brick
bot = TelegramBot()
object_detection = ObjectDetection()


def greet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler for /hello command"""
    user = update.effective_user
    chat_id = update.message.chat_id
    bot.send_message(chat_id, f"Hi **{user.first_name}**. This is UNO Q!")


def help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler for /help command"""
    help_text = (
        "🤖 *Available Commands:*\n"
        "/hello - Greet the bot\n"
        "/help - Show this help message\n\n"
        "You can also send me any text message, and I will echo it back to you.\n"
        "Send me a photo, and I will perform object detection on it!"
    )
    chat_id = update.message.chat_id
    bot.send_message(chat_id, help_text)


def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler for text messages"""
    user_message = update.message.text
    chat_id = update.message.chat_id
    bot.send_message(chat_id, f"🦜: {user_message}")


def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler for photo messages"""
    chat_id = update.message.chat_id

    if not bot.send_message(chat_id, "📷: Detecting objects..."):
        return  # Failed to send initial message

    # Download photo using brick's synchronous method
    photo_bytes = bot.get_photo(update, context)
    if not photo_bytes:
        bot.send_message(chat_id, "❌: Failed to download photo")
        return

    # Image Processing
    image = Image.open(BytesIO(photo_bytes))

    results = object_detection.detect(image, confidence=0.1)
    img_with_boxes = object_detection.draw_bounding_boxes(image, results)

    output = BytesIO()
    img_with_boxes.save(output, format="PNG")
    output.seek(0)

    if not bot.send_photo(chat_id, photo=output, caption="✅: Here is the processed image!"):
        bot.send_message(chat_id, "❌: Failed to send processed image")


# --- Registration ---

bot.add_command("hello", greet)
bot.add_command("help", help)
bot.on_text(echo)
bot.on_photo(handle_photo)

# Start the Arduino App framework (bot starts automatically)
App.run()
