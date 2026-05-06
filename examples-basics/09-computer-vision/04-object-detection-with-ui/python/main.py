# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to perform object detection on an image sent from the UI, and send back the results with bounding boxes drawn on the image.

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI                         # Import the WebUI class to create a web-based user interface 
from arduino.app_bricks.object_detection import ObjectDetection     # Import the ObjectDetection class to perform object detection on images
from PIL import Image                                               # Import the Image class from the Pillow library to handle image processing
import io
import base64
import time

object_detection = ObjectDetection()                                # Initialize the ObjectDetection brick to perform object detection tasks

# Define a callback function to handle object detection requests from the UI. 
# This function will be called when the UI sends a message with the 'detect_objects' event, 
# and it will perform object detection on the provided image and send back the results.
def on_detect_objects(client_id, data):
    """Callback function to handle object detection requests."""
    try:
        image_data = data.get('image')             # Get the base64-encoded image data from the message sent by the UI
        confidence = data.get('confidence', 0.5)   # Get the confidence threshold from the message, or use a default value of 0.5 if not provided
        if not image_data:
            ui.send_message('detection_error', {'error': 'No image data'})
            return

        image_bytes = base64.b64decode(image_data)         # Decode the base64-encoded image data into bytes
        pil_image = Image.open(io.BytesIO(image_bytes))    # Create a PIL image from the decoded bytes

        start_time = time.time() * 1000
        results = object_detection.detect(pil_image, confidence=confidence)  # Perform object detection on the input image with the specified confidence threshold
        diff = time.time() * 1000 - start_time

        if results is None:
            ui.send_message('detection_error', {'error': 'No results returned'})
            return

        img_with_boxes = object_detection.draw_bounding_boxes(pil_image, results) # Draw bounding boxes around the detected objects in the input image

        # Convert the resulting image with bounding boxes back to base64 to send it back to the UI
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

        # Prepare the response with the detection results, including the processed image, 
        # the count of detected objects, and the processing time, and send it back to the UI
        response = {
            'success': True,
            'result_image': b64_result,
            'detection_count': len(results.get("detection", [])) if results else 0,
            'processing_time': f"{diff:.2f} ms"
        }
        ui.send_message('detection_result', response) # Send the detection results back to the UI with the 'detection_result' event

    except Exception as e:
        ui.send_message('detection_error', {'error': str(e)})

ui = WebUI() # Initialize the WebUI brick to create a web-based user interface for sending images and receiving detection results
# Register the callback function to handle 'detect_objects' messages from the UI, which will trigger the object detection process 
# when an image is sent from the UI
ui.on_message('detect_objects', on_detect_objects) 

App.run()