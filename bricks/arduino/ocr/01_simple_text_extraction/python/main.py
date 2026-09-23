from arduino.app_bricks.ocr import OCR
from arduino.app_utils import App

ocr = OCR()

result = ocr.extract_text("assets/text.png")
print(result.text)

App.run()
