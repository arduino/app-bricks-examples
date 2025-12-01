# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.audio_classification import AudioClassification
import time
import os
import io
import base64
import json

# Global state
AUDIO_DIR = "/app/assets/audio"

def parse_data(data):
    if isinstance(data, str):
        return json.loads(data)
    return data if isinstance(data, dict) else {}

def on_run_classification(sid, data):
    try:
        parsed_data = parse_data(data)
        confidence = parsed_data.get('confidence', 0.5)
        audio_data = parsed_data.get('audio_data')
        selected_file = parsed_data.get('selected_file')

        input_audio = None
        if audio_data:
            audio_bytes = base64.b64decode(audio_data)
            input_audio = io.BytesIO(audio_bytes)
        elif selected_file:
            file_path = os.path.join(AUDIO_DIR, selected_file)
            if not os.path.exists(file_path):
                ui.send_message('classification_error', {'message': f'Sample file not found: {selected_file}'}, sid)
                return
            with open(file_path, "rb") as f:
                input_audio = io.BytesIO(f.read())
        if input_audio:
            start_time = time.time() * 1000
            results = AudioClassification.classify_from_file(input_audio, confidence)
            diff = time.time() * 1000 - start_time

            response_data = { 'results': results, 'processing_time': diff }
            if results:
                response_data['classification'] = { 'class_name': results["class_name"], 'confidence': results["confidence"] }
            else:
                response_data['error'] = "No objects detected in the audio. Try to lower the confidence threshold."

            ui.send_message('classification_complete', response_data, sid)
        else:
            ui.send_message('classification_error', {'message': "No audio available for classification"}, sid)

    except Exception as e:
        ui.send_message('classification_error', {'message': str(e)}, sid)

# Initialize WebUI
ui = WebUI()

# Handle socket messages
ui.on_message('run_classification', on_run_classification)

# Start the application
App.run()