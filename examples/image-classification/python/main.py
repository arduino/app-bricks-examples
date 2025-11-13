# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.image_classification import ImageClassification
from PIL import Image
import io
import base64
import time

image_classification = ImageClassification()

def on_classify_image(client_id, data):
    """Callback function to handle image classification requests."""
    try:
        image_data = data.get('image')
        image_type_raw = data.get('image_type')
        if image_type_raw:
            image_type = image_type_raw.split('/')[-1]
        else:
            image_type = 'jpeg'
        confidence = data.get('confidence', 0.25)
        if not image_data:
            ui.send_message('classification_error', {'error': 'No image data'})
            return

        image_bytes = base64.b64decode(image_data)
        pil_image = Image.open(io.BytesIO(image_bytes))

        start_time = time.time() * 1000
        results = image_classification.classify(pil_image, image_type=image_type, confidence=confidence)
        diff = time.time() * 1000 - start_time

        if results is None:
            ui.send_message('classification_error', {'error': 'No results returned'})
            return

        response = {
            'success': True,
            'results': results,
            'processing_time': f"{diff:.2f} ms"
        }
        ui.send_message('classification_result', response)

    except Exception as e:
        ui.send_message('classification_error', {'error': str(e)})

ui = WebUI()
ui.on_message('classify_image', on_classify_image)

App.run()