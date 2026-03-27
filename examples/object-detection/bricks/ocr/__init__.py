import requests
import json
import os
import base64
import io

class OcrDetection():
 
    def __init__(self, server_url: str = "http://tesserect-server:8884/tesseract"):
         self.server_url = server_url 

    def detect(self, image_path: str, lang: str = "eng"):
        # Prepare the options and file payload
        options = {"languages": [lang]}
        files = {
            "file": self._prepare_image(image_path),
            "options": (None, json.dumps(options), "application/json")
        }
    
        response = requests.post(self.server_url, files=files)
        response.raise_for_status()  # Raise error if request failed
    
        # Parse JSON response
        result = response.json()
        return result["data"]["stdout"]

    def _prepare_image(self, image_input):

        # binary image
        if isinstance(image_input, bytes):
            return io.BytesIO(image_input)

        # string input
        if isinstance(image_input, str):

            # file path
            if os.path.exists(image_input):
                return open(image_input, "rb")

            # base64
            image_bytes = base64.b64decode(image_input)
            return io.BytesIO(image_bytes)