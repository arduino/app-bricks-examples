# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import json
from dataclasses import dataclass

from arduino.app_utils.ledmatrix import Frame, FrameDesigner, c_identifier


@dataclass
class StoredFrame:
    """A frame of the painter: the pixels, held by an `arduino.app_utils` Frame, plus the metadata
    the app keeps in its database. Composition keeps the two apart: Frame validates and encodes the
    pixels, this class only adds what the app needs to list, order and animate frames.
    """

    frame: Frame
    id: int | None = None  # assigned by the database, None until the frame is saved
    name: str = ""  # empty until the database assigns "Frame <id>"
    position: int | None = None  # order in the frame list, None to append the frame
    duration_ms: int = 1000  # how long the frame stays on in an animation

    @classmethod
    def from_payload(cls, data: dict, template: FrameDesigner) -> "StoredFrame":
        """Build a frame from a page request or a database record.

        The pixels must fit the template's matrix. They are brought to the template's brightness
        levels; values above them are read as 8-bit, the format saved by older versions of the app.

        Raises:
            KeyError, TypeError, ValueError: on missing or malformed fields.
        """
        rows = data["rows"]
        if isinstance(rows, str):  # database records keep the rows as JSON text
            rows = json.loads(rows)
        levels = int(data.get("brightness_levels") or template.brightness_levels)
        size = {"width": template.width, "height": template.height}
        try:
            frame = Frame.from_rows(rows, levels, **size)
        except ValueError:
            frame = Frame.from_rows(rows, 256, **size)
        if frame.brightness_levels != template.brightness_levels:
            frame = frame.quantize(template.brightness_levels)
        fid, position = data.get("id"), data.get("position")
        duration = data.get("duration_ms")
        return cls(
            frame=frame,
            id=int(fid) if fid is not None else None,
            name=data.get("name") or "",
            position=int(position) if position is not None else None,
            duration_ms=int(duration or 1000),  # a frame cannot last 0 ms: 0 means the default, as in the page
        )

    def to_payload(self) -> dict:
        """The frame as the page expects it."""
        return {
            "id": self.id,
            "name": self.name,
            "rows": self.frame.arr.tolist(),
            "brightness_levels": self.frame.brightness_levels,
            "position": self.position,
            "duration_ms": self.duration_ms,
        }

    def to_record(self) -> dict:
        """The frame as the database stores it."""
        return {**self.to_payload(), "rows": json.dumps(self.frame.arr.tolist())}

    @property
    def c_name(self) -> str:
        """C identifier for the exported code, derived from the name."""
        return c_identifier(self.name or f"frame_{self.id}")
