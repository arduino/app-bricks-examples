# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.object_detection import ObjectDetection
from PIL import Image
import io
import base64
import time

object_detection = ObjectDetection()

def on_detect_objects(client_id, data):
    """Callback function to handle object detection requests."""
    try:
        image_data = data.get('image')
        confidence = data.get('confidence', 0.5)
        if not image_data:
            ui.send_message('detection_error', {'error': 'No image data'})
            return

        image_bytes = base64.b64decode(image_data)
        pil_image = Image.open(io.BytesIO(image_bytes))

        start_time = time.time() * 1000
        results = object_detection.detect(pil_image, confidence=confidence)
        diff = time.time() * 1000 - start_time

        if results is None:
            ui.send_message('detection_error', {'error': 'No results returned'})
            return

        img_with_boxes = object_detection.draw_bounding_boxes(pil_image, results)

        if img_with_boxes is not None:
            img_buffer = io.BytesIO()
            img_with_boxes.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            b64_result = base64.b64encode(img_buffer.getvalue()).decode("utf-8")
        else:
            # If drawing fails, send back the original image
            img_buffer = io.BytesIO()
            pil_image.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            b64_result = base64.b64encode(img_buffer.getvalue()).decode("utf-8")

        response = {
            'success': True,
            'result_image': b64_result,
            'detection_count': len(results.get("detection", [])) if results else 0,
            'processing_time': f"{diff:.2f} ms"
        }
        ui.send_message('detection_result', response)

    except Exception as e:
        ui.send_message('detection_error', {'error': str(e)})

ui = WebUI()
ui.on_message('detect_objects', on_detect_objects)

App.run()