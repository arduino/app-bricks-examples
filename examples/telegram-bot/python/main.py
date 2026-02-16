# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

# EXAMPLE_NAME = "Telegram bot"
from arduino.app_bricks.telegram_bot import TelegramBot, Sender, Message
from arduino.app_bricks.object_detection import ObjectDetection
from arduino.app_utils import App
from PIL import Image
from io import BytesIO

# Initialize bricks
bot = TelegramBot()
obj_detection = ObjectDetection()


def greet(sender: Sender, message: Message):
    """Handle /hello command - super simple API with reply helper!"""
    sender.reply(f"👋 Hi {sender.first_name}! This is Arduino UNO Q!")


def help_cmd(sender: Sender, message: Message):
    """Handle /help command"""
    help_text = (
        "🤖 *Arduino Bot Commands:*\n\n"
        "/hello - Get a greeting\n"
        "/help - Show this help\n"
        "/record - Record and send a video clip\n\n"
        "Send me:\n"
        "📝 Text to echo it back\n"
        "📷 Photo for object detection\n"
    )
    sender.reply(help_text)


def echo(sender: Sender, message: Message):
    """Echo text messages - using convenient reply helper!"""
    sender.reply(f"🦜: {message.text}")


def detect_objects(
    sender: Sender,
    message: Message,
    photo: bytes,
    filename: str,
    size: int,
):
    """Detect objects in photos - photo data passed as parameter!"""
    # Notify user we're processing
    sender.reply("📷 Detecting objects...")

    # Process image
    image = Image.open(BytesIO(photo))
    results = obj_detection.detect(image, confidence=0.1)
    img_with_boxes = obj_detection.draw_bounding_boxes(image, results)

    # Send result using reply_photo helper
    output = BytesIO()
    img_with_boxes.save(output, format="PNG")
    output.seek(0)

    caption = f"✅ Found {len(results)} object(s)!" if results else "No objects detected"

    if not sender.reply_photo(output.getvalue(), caption):
        sender.reply("❌ Failed to send processed image")


# Register handlers - clean and simple API!
bot.add_command("hello", greet, "Get a personalized greeting")
bot.add_command("help", help_cmd, "Show available commands")
bot.on_text(echo)
bot.on_photo(detect_objects)

# Start the Arduino App framework (bot starts automatically)
App.run()
