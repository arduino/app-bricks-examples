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

async def greet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_markdown(f"Hi **{user.first_name}**. This is UNO Q!")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f'🦜: {update.message.text}')

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
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
bot.on_text(echo)
bot.on_photo(handle_photo)

# Start the Arduino App framework using the bot's run method
App.run(user_loop=bot.run)