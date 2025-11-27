# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import json
import time
import math
import threading
from datetime import datetime
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.vibration_anomaly_detection import VibrationAnomalyDetection

logger = Logger("vibration-detector")

ui = WebUI()

# --- Configuration Constant ---
USE_FAKE_DATA = False # Set to True to use simulated data, False to use real sensor data via Bridge RPC
# ------------------------------

vibration_detection = VibrationAnomalyDetection(anomaly_detection_threshold=1.0)

def on_override_th(value: float):
    logger.info(f"Setting new anomaly threshold: {value}")
    vibration_detection.anomaly_detection_threshold = value

ui.on_message("override_th", lambda sid, threshold: on_override_th(threshold))

def get_fan_status(anomaly_detected: bool):
    return {
        "anomaly": anomaly_detected,
        "status_text": "Anomaly detected!" if anomaly_detected else "No anomaly"
    }


# Register action to take after successful detection
def on_detected_anomaly(anomaly_score: float, classification: dict):
    print(f"Detected anomaly. Score: {anomaly_score}")
    anomaly_payload = {
        "score": anomaly_score,
        "timestamp": datetime.now().isoformat()
    }
    ui.send_message('anomaly_detected', json.dumps(anomaly_payload))
    ui.send_message('fan_status_update', get_fan_status(True))

vibration_detection.on_anomaly(on_detected_anomaly)

def record_sensor_movement(x: float, y: float, z: float):
    logger.debug(f"record_sensor_movement called with raw g-values: x={x}, y={y}, z={z}")
    try:
        # Convert g -> m/s^2 for the detector
        x_ms2 = x * 9.81
        y_ms2 = y * 9.81
        z_ms2 = z * 9.81

        # Forward raw data to UI for plotting
        ui.send_message('sample', {'x': x_ms2, 'y': y_ms2, 'z': z_ms2})

        # Forward samples to the vibration_detection brick
        vibration_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))

    except Exception as e:
        logger.exception(f"record_sensor_movement: Error: {e}")
        print(f"record_sensor_movement: Error: {e}")

if USE_FAKE_DATA:
    # Faking sensor data for UI testing
    def generate_fake_data():
        logger.info("Starting fake data generation")
        start_time = time.time()
        while True:
            current_time = time.time() - start_time
            # Generate wave patterns for x, y, and z
            x = 0.5 * math.sin(2 * math.pi * 0.5 * current_time)  # 0.5 Hz frequency
            y = 0.3 * math.sin(2 * math.pi * 1.0 * current_time + (math.pi / 2))  # 1.0 Hz frequency, 90-degree phase shift
            z = 0.8 * math.cos(2 * math.pi * 0.2 * current_time)  # 0.2 Hz frequency, using cosine

            # Introduce a sudden anomaly occasionally
            if int(current_time) % 20 == 0 and int(current_time) != 0:
                x += 0.5 * math.sin(2 * math.pi * 10 * current_time) # high frequency noise
                y += 0.5 * math.cos(2 * math.pi * 10 * current_time)

            record_sensor_movement(x, y, z)
            time.sleep(0.1)  # 10 Hz data rate

    fake_data_thread = threading.Thread(target=generate_fake_data, daemon=True)
    fake_data_thread.start()
else:
    # Register the Bridge RPC provider so the sketch can call into Python
    try:
        logger.debug("Registering 'record_sensor_movement' Bridge provider")
        Bridge.provide("record_sensor_movement", record_sensor_movement)
        logger.debug("'record_sensor_movement' registered successfully")
    except RuntimeError:
        logger.debug("'record_sensor_movement' already registered")


# Let the App runtime manage bricks and run the web server
App.run()
