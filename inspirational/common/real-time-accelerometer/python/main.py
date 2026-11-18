# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.motion_detection import MotionDetection
from collections import deque
import time


# Instantiate the MotionDetection brick with a confidence threshold
CONFIDENCE = 0.4
motion_detection = MotionDetection(confidence=CONFIDENCE)

# Create a logger for this app
logger = Logger("real-time-accelerometer")
logger.debug(f"MotionDetection instantiated with confidence={CONFIDENCE}")

# Movement labels recognized by the model
LABELS = ('idle', 'snake', 'updown', 'wave')

# Last classification probabilities, one entry per label
detection = {label: 0.0 for label in LABELS}

# Instantiate WebUI brick
web_ui = WebUI()

# Expose a simple HTTP API to fetch the latest detection
def _get_detection():
    return dict(detection)

web_ui.expose_api("GET", "/detection", _get_detection)

# When a client connects, send the current detection immediately
def on_client_connected(sid: str):
    logger.debug(f"Client connected: {sid} - sending current detection")
    web_ui.send_message('movement', dict(detection))

web_ui.on_connect(on_client_connected)
logger.debug("Registered on_connect handler for WebUI")


def on_movement_detected(classification: dict):
    """Callback function to handle movement detection and notify WebUI clients."""
    logger.debug(f"on_movement_detected called with: {classification}")
    if not classification:
        logger.debug("on_movement_detected received empty classification, returning")
        return

    try:
        detection.update({label: classification.get(label, 0.0) for label in LABELS})

        logger.debug(f"Updated detection: {detection}")

        # Broadcast update to connected websocket client
        try:
            web_ui.send_message('movement', dict(detection))
            logger.debug("Broadcasted 'movement' message to WebUI client")
        except Exception as e:
            logger.warning(f"Failed to broadcast 'movement' message: {e}")

    except Exception as e:
        logger.exception(f"on_movement_detected: Error: {e}")

# Register movement callbacks
for label in LABELS:
    motion_detection.on_movement_detection(label, on_movement_detected)
logger.debug(f"Registered movement detection callbacks for {','.join(LABELS)}")

# Bridge handler: called from the sketch via Bridge.notify("record_sensor_movement", x, y, z)
# buffer of samples for the simple time-series chart
SAMPLES_MAX = 200
samples = deque(maxlen=SAMPLES_MAX)

# Provide a simple API to fetch recent samples for the frontend chart
def _get_samples():
    # return a list copy so the deque isn't exposed directly
    return list(samples)

web_ui.expose_api("GET", "/samples", _get_samples)
logger.info("Exposed GET /samples API")

def record_sensor_movement(x: float, y: float, z: float):
    logger.debug(f"record_sensor_movement called with raw g-values: x={x}, y={y}, z={z}")
    try:
        # Convert g -> m/s^2 for the detector
        x_ms2 = x * 9.81
        y_ms2 = y * 9.81
        z_ms2 = z * 9.81

        # Forward samples to the motion_detection brick
        motion_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))
        logger.debug("Forwarded sensor sample to motion_detection.accumulate_samples")

        # Use raw x,y,z for the lightweight chart
        sample = {
            "t": time.time(),
            "x": float(x),
            "y": float(y),
            "z": float(z)
        }

        # push into local buffer and broadcast to connected UIs
        samples.append(sample)
        try:
            web_ui.send_message('sample', sample)
        except Exception:
            # do not break on websocket failures
            logger.debug('Failed to emit sample websocket message')

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
logger.info("Starting App...")
App.run()
