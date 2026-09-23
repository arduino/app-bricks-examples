from arduino.app_bricks.ocr import OCR
from arduino.app_utils import App

ocr = OCR()

result = ocr.extract_text("assets/text.png")
for detection in result.detections:
    print(f"Detected text: {detection.text} ({detection.confidence:.2f}) at {detection.bounding_box_xyxy}")

App.run()
