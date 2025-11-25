# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import json
from arduino.app_utils import Frame

class AppFrame(Frame):
    """Extended Frame app_utils class with application-specific metadata.

    This subclass of `arduino.app_utils.Frame` takes care of Frame validation
    and array management while adding application-specific attributes used
    in the LED matrix tool app.
    
    Usage:

        # Create from JSON-serializable dict from API payload
        frame = AppFrame.from_json({
            "id": 1,
            "name": "My Frame",
            "position": 0,
            "duration_ms": 1000,
            "rows": [[0, 255, 0], [255, 0, 255]],
            "brightness_levels": 256,
        })

        # Convert to JSON-serializable dict for API responses
        json_dict = frame.to_json()

        # Create from database record dict
        record = {
            "id": 1,
            "name": "My Frame",
            "position": 0,
            "duration_ms": 1000,
            "rows": json.dumps([[0, 255, 0], [255, 0, 255]]),
            "brightness_levels": 256,
        }
        frame = AppFrame.from_record(record)

        # Convert to database record dict for storage
        record_dict = frame.to_record()

        # Create empty AppFrame
        empty_frame = AppFrame.create_empty(
            id=2,
            name="Empty Frame",
            position=1,
            duration_ms=500,
            brightness_levels=256,
        )

        # Export to C string for embedding in source code
        c_string = frame.to_c_string()

        # Mutate array values in-place
        frame.set_value(0, 0, 128)

        # Mutate array in-place
        frame.set_array(frame.arr * 0.5)
    """
    def __init__(
            self,
            id: int,
            name: str,
            position: int,
            duration_ms: int,
            arr,
            brightness_levels: int = 256
        ):
        """Initialize the AppFrame instance with application-specific attributes.
        
        Args:
            arr (numpy.ndarray): The array data for the frame.
            brightness_levels (int): Number of brightness levels (default 256).
        
        Attributes:
            id (int): database ID of the frame.
            name (str): user-defined name of the frame.
            position (int): user-defined position/order of the frame.
            duration_ms (int): duration in milliseconds for animated frames.
        """
        super().__init__(arr, brightness_levels=brightness_levels)  # Initialize base Frame attributes
        self.id = id
        self.name = name
        self.position = position
        self.duration_ms = duration_ms

    # -- JSON serialization/deserialization for frontend --------------------------------
    @classmethod
    def from_json(cls, data: dict) -> "AppFrame":
        """Reconstruct an AppFrame from a JSON-serializable dict.

        This is the constructor used both for frontend payloads and
        for DB records.
        """
        id = data.get('id')
        name = data.get('name')
        position = data.get('position')
        duration_ms = data.get('duration_ms')
        rows = data.get('rows')
        brightness_levels = data.get('brightness_levels')
        return cls.from_rows(id, name, position, duration_ms, rows, brightness_levels=brightness_levels)

    def to_json(self) -> dict:
        """Convert to a JSON-serializable dict for API responses"""
        return {
            "id": self.id,
            "name": self.name,
            "rows": self.arr.tolist(),
            "brightness_levels": int(self.brightness_levels),
            "position": self.position,
            "duration_ms": int(self.duration_ms) if self.duration_ms is not None else 1000
        }

    # -- record serialization/deserialization for DB storage --------------------------------

    @classmethod
    def from_record(cls, record: dict) -> "AppFrame":
        """Reconstruct an AppFrame from a database record dict."""
        id = record.get('id')
        name = record.get('name')
        position = record.get('position')
        duration_ms = record.get('duration_ms')
        rows = json.loads(record.get('rows'))
        brightness_levels = record.get('brightness_levels')
        return cls.from_rows(id, name, position, duration_ms, rows, brightness_levels=brightness_levels)

    def to_record(self) -> dict:
        """Convert to a database record dict for storage."""
        return {
            "id": self.id,
            "name": self.name,
            "rows": json.dumps(self.arr.tolist()),
            "brightness_levels": int(self.brightness_levels),
            "position": self.position,
            "duration_ms": int(self.duration_ms) if self.duration_ms is not None else 1000
        }

    # -- other exports ----------------------------------------------------
    def to_c_string(self) -> str:
        """Export the frame as a C vector string.

        The Frame is rescaled to the 0-255 range prior to exporting as board-compatible C source.

        Returns:
            str: C source fragment containing a const array initializer.
        """
        c_type = "uint32_t"
        scaled_arr = self.rescale_quantized_frame(scale_max=255)

        parts = [f"const {c_type} {self.name}[] = {{"]
        rows = scaled_arr.tolist()
        # Emit the array as row-major integer values, preserving row breaks for readability
        for r_idx, row in enumerate(rows):
            line = ", ".join(str(int(v)) for v in row)
            if r_idx < len(rows) - 1:
                parts.append(f"  {line},")
            else:
                parts.append(f"  {line}")
        parts.append("};")
        parts.append("")
        return "\n".join(parts)
    
    # -- create empty AppFrame --------------------------------
    @classmethod
    def create_empty(
        cls,
        id: int,
        name: str,
        position: int,
        duration_ms: int,
        brightness_levels: int = 256,
    ) -> "AppFrame":
        """Create an empty AppFrame with all pixels set to 0.

        Args:
            id (int): database ID of the frame.
            name (str): user-defined name of the frame.
            position (int): user-defined position/order of the frame.
            duration_ms (int): duration in milliseconds for animated frames.
            width (int): width of the frame in pixels.
            height (int): height of the frame in pixels.
            brightness_levels (int): number of brightness levels (default 256).

        Returns:
            AppFrame: newly constructed empty AppFrame instance.
        """
        import numpy as np
        height = 8
        width = 13
        arr = np.zeros((height, width), dtype=np.uint8)
        return cls(id, name, position, duration_ms, arr, brightness_levels=brightness_levels)

    # -- array/value in-place mutations wrappers --------------------------------
    def set_array(self, arr) -> "AppFrame":
        super().set_array(arr)
        return self

    def set_value(self, row: int, col: int, value: int) -> None:
        return super().set_value(row, col, value)

    # -- animation export --------------------------------
    def to_animation_hex(self) -> list[str]:
        """Convert frame to animation format: 5 hex strings [hex0, hex1, hex2, hex3, duration_ms].
        
        This format is used by Arduino_LED_Matrix library for animations.
        Each frame in an animation is represented as:
        - 4 uint32_t values (128 bits total) for binary pixel data
        - 1 uint32_t value for duration in milliseconds
        
        Returns:
            list[str]: List of 5 hex strings in format ["0xHHHHHHHH", "0xHHHHHHHH", "0xHHHHHHHH", "0xHHHHHHHH", "duration"]
        """
        # Rescale to 0-255 range for threshold
        arr_scaled = self.rescale_quantized_frame(scale_max=255)
        height, width = arr_scaled.shape
        
        # Convert to binary presence (non-zero pixels -> 1)
        pixels = (arr_scaled > 0).astype(int).flatten().tolist()
        
        # Pad to 128 bits (4 * 32)
        if len(pixels) > 128:
            raise ValueError(f"Pixel buffer too large: {len(pixels)} > 128")
        pixels += [0] * (128 - len(pixels))
        
        # Pack into 4 uint32_t hex values
        hex_values = []
        for i in range(0, 128, 32):
            value = 0
            for j in range(32):
                bit = int(pixels[i + j]) & 1
                value |= bit << (31 - j)
            hex_values.append(f"0x{value:08x}")
        
        # Append duration_ms as last value
        duration = int(self.duration_ms) if self.duration_ms is not None else 1000
        hex_values.append(str(duration))
        
        return hex_values

    # -- Frame.from_rows override (for subclass construction only) ---------------------------
    @classmethod
    def from_rows(
        cls,
        id: int,
        name: str,
        position: int,
        duration_ms: int,
        rows: list[list[int]] | list[str],
        brightness_levels: int = 256,
    ) -> "AppFrame":
        """Create an AppFrame from frontend rows.

        **Do NOT use it in the app directly, please use `AppFrame.from_json()` or `AppFrame.from_record()` instead.**
        
        This method overrides Frame.from_rows which constructs a Frame and it is intended
        only for subclass construction and coherence with Frame API.

        We delegate parsing/validation to Frame.from_rows and then construct an
        AppFrame instance with subclass-specific attributes.

        Args:
            rows (list | list[str]): frontend rows representation (list of lists or list of strings).
            brightness_levels (int): number of brightness levels (default 256).
        
        Attributes:
            id (int): database ID of the frame.
            name (str): user-defined name of the frame.
            position (int): user-defined position/order of the frame.
            duration_ms (int): duration in milliseconds for animated frames.

        Returns:
            AppFrame: newly constructed AppFrame instance.
        """
        # Use Frame to parse rows into a numpy array/frame and to validate it
        frame_instance = super().from_rows(rows, brightness_levels=brightness_levels)

        # Get the validated numpy array as a writable copy
        arr = frame_instance.arr.copy()

        # Construct an AppFrame using the validated numpy array and brightness_levels
        return cls(id, name, position, duration_ms, arr, brightness_levels=frame_instance.brightness_levels)

