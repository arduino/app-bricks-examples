# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.vibration_anomaly_detection import VibrationAnomalyDetection
from arduino.app_utils import *

logger = Logger("Vibration Anomaly Example")

# Create the Brick with a chosen anomaly threshold
vibration = VibrationAnomalyDetection(anomaly_detection_threshold=1.0)


# Register the callback to run when an anomaly is detected
def on_detected_anomaly(anomaly_score: float, classification: dict = None):
    print(f"[Anomaly] score={anomaly_score:.3f}")


# Expose a function that Arduino can call via Router Bridge
# Expecting accelerations in 'g' from the microcontroller
def record_sensor_movement(x_g: float, y_g: float, z_g: float):
    # Convert to m/s^2 if your model was trained in SI units
    G_TO_MS2 = 9.80665
    x = x_g * G_TO_MS2
    y = y_g * G_TO_MS2
    z = z_g * G_TO_MS2
    # Push a triple (x, y, z) into the sliding window
    vibration.accumulate_samples((x, y, z))


vibration.on_anomaly(on_detected_anomaly)

Bridge.provide("record_sensor_movement", record_sensor_movement)

model_info = vibration.get_model_info()
period = 1.0 / model_info.frequency if model_info and model_info.frequency > 0 else 0.02

# Run the host app (handles Router Bridge and our processing loop)
logger.info(f"Starting App... model_freq={getattr(model_info, 'frequency', 'unknown')}Hz period={period:.4f}s")

App.run()
