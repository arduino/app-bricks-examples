# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import json
from datetime import datetime
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.vibration_anomaly_detection import VibrationAnomalyDetection

logger = Logger("vibration-detector")

vibration_detection = VibrationAnomalyDetection(anomaly_detection_threshold=1.0)

def on_override_th(value: float):
    logger.info(f"Setting new anomaly threshold: {value}")
    vibration_detection.anomaly_detection_threshold = value

ui = WebUI()
ui.on_message("override_th", lambda sid, threshold: on_override_th(threshold))

def get_fan_status(anomaly_detected: bool):
    return {
        "anomaly": anomaly_detected,
        "status_text": "Anomaly detected!" if anomaly_detected else "No anomaly"
    }

# Register action to take after successful detection
def on_detected_anomaly(anomaly_score: float, classification: dict):
    anomaly_payload = {
        "score": anomaly_score,
        "timestamp": datetime.now().isoformat()
    }
    ui.send_message('anomaly_detected', json.dumps(anomaly_payload))
    ui.send_message('fan_status_update', get_fan_status(True))

vibration_detection.on_anomaly(on_detected_anomaly)

def record_sensor_movement(x: float, y: float, z: float):
    # Convert g -> m/s^2 for the detector
    x_ms2 = x * 9.81
    y_ms2 = y * 9.81
    z_ms2 = z * 9.81

    # Forward raw data to UI for plotting
    ui.send_message('sample', {'x': x_ms2, 'y': y_ms2, 'z': z_ms2})

    # Forward samples to the vibration_detection brick
    vibration_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))

# Register the Bridge RPC provider so the sketch can call into Python
Bridge.provide("record_sensor_movement", record_sensor_movement)

App.run()
