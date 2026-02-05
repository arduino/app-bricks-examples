# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_utils.image import draw_anomaly_markers
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.visual_anomaly_detection import VisualAnomalyDetection
from PIL import Image
import io
import base64
import time
import os
from pathlib import Path

anomaly_detection = VisualAnomalyDetection()

SCRIPT_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = SCRIPT_DIR / "assets"
os.makedirs(IMAGES_DIR, exist_ok=True)

def on_detect_anomalies(client_id, data):
    """Callback function to handle anomaly detection requests."""
    try:
        image_data = data.get('image')
        if not image_data:
            ui.send_message('detection_error', {'error': 'No image data'})
            return

        image_bytes = base64.b64decode(image_data)
        pil_image = Image.open(io.BytesIO(image_bytes))

        start_time = time.time() * 1000
        results = anomaly_detection.detect(pil_image)
        diff = time.time() * 1000 - start_time

        if results is None:
            ui.send_message('detection_error', {'error': 'No results returned'})
            return

        img_with_markers = draw_anomaly_markers(pil_image, results)

        if img_with_markers is not None:
            img_buffer = io.BytesIO()
            img_with_markers.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            b64_result = base64.b64encode(img_buffer.getvalue()).decode("utf-8")
        else:
            img_buffer = io.BytesIO()
            pil_image.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            b64_result = base64.b64encode(img_buffer.getvalue()).decode("utf-8")

        response = {
            'success': True,
            'result_image': b64_result,
            'detection_count': len(results) if results else 0,
            'processing_time': f"{diff:.2f} ms"
        }
        ui.send_message('detection_result', response)

    except Exception as e:
        ui.send_message('detection_error', {'error': str(e)})

ui = WebUI()
ui.on_message('detect_anomalies', on_detect_anomalies)

App.run()
