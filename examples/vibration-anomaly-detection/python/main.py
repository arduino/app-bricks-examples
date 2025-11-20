# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.vibration_anomaly_detection import VibrationAnomalyDetection

logger = Logger("vibration-detector")

ui = WebUI()

vibration_detection = VibrationAnomalyDetection(anomaly_detection_threshold=1.0)

def get_fan_status(anomaly_detected: bool):
    return {
        "anomaly": anomaly_detected,
        "status_text": "Anomaly detected!" if anomaly_detected else "No anomaly"
    }


# Register action to take after successful detection
def on_detected_anomaly(anomaly_score: float, classification: dict):
    print(f"Detected anomaly. Score: {anomaly_score}")
    ui.send_message('fan_status_update', get_fan_status(True))

vibration_detection.on_anomaly(on_detected_anomaly)

def record_sensor_movement(x: float, y: float, z: float):
    logger.debug(f"record_sensor_movement called with raw g-values: x={x}, y={y}, z={z}")
    try:
        # Convert g -> m/s^2 for the detector
        x_ms2 = x * 9.81
        y_ms2 = y * 9.81
        z_ms2 = z * 9.81

        # Forward samples to the vibration_detection brick
        vibration_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))

    except Exception as e:
        logger.exception(f"record_sensor_movement: Error: {e}")
        print(f"record_sensor_movement: Error: {e}")

# Register the Bridge RPC provider so the sketch can call into Python
try:
    logger.debug("Registering 'record_sensor_movement' Bridge provider")
    Bridge.provide("record_sensor_movement", record_sensor_movement)
    logger.debug("'record_sensor_movement' registered successfully")
except RuntimeError:
    logger.debug("'record_sensor_movement' already registered")

# Let the App runtime manage bricks and run the web server
App.run()
