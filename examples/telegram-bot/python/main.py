# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

# EXAMPLE_NAME = "Telegram bot"
from arduino.app_bricks.telegram_bot import TelegramBot, Message
from arduino.app_bricks.object_detection import ObjectDetection
from arduino.app_utils import App
from PIL import Image
from io import BytesIO

# Initialize bricks
bot = TelegramBot()
obj_detection = ObjectDetection()


def greet(msg: Message):
    """Handle /hello command - super simple API!"""
    bot.send(msg.chat_id, f"👋 Hi {msg.user_name}! This is Arduino UNO Q!")


def help_cmd(msg: Message):
    """Handle /help command"""
    help_text = (
        "🤖 *Arduino Bot Commands:*\n\n"
        "/hello - Get a greeting\n"
        "/help - Show this help\n\n"
        "Send me text to echo it back!\n"
        "Send me a photo for object detection!"
    )
    bot.send(msg.chat_id, help_text)


def echo(msg: Message):
    """Echo text messages - no more Update/Context!"""
    bot.send(msg.chat_id, f"🦜: {msg.text}")


def detect_objects(msg: Message):
    """Detect objects in photos - photo already downloaded!"""
    if not msg.photo_bytes:
        bot.send(msg.chat_id, "❌ No photo received")
        return

    # Notify user we're processing
    if not bot.send(msg.chat_id, "📷 Detecting objects..."):
        return

    # Process image
    image = Image.open(BytesIO(msg.photo_bytes))
    results = obj_detection.detect(image, confidence=0.1)
    img_with_boxes = obj_detection.draw_bounding_boxes(image, results)

    # Send result
    output = BytesIO()
    img_with_boxes.save(output, format="PNG")
    output.seek(0)

    caption = f"✅ Found {len(results)} object(s)!" if results else "No objects detected"

    if not bot.send_photo(msg.chat_id, output.getvalue(), caption):
        bot.send(msg.chat_id, "❌ Failed to send processed image")


# Register handlers - clean and simple API!
bot.add_command("hello", greet, "Get a personalized greeting")
bot.add_command("help", help_cmd, "Show available commands")
bot.on_text(echo)
bot.on_photo(detect_objects)

# Start the Arduino App framework (bot starts automatically)
App.run()
