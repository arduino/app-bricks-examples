# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

"""The LED matrices the painter can draw on.

Each matrix knows its size and brightness levels (a FrameDesigner), the table that holds its
frames, the providers of the sketch that drive it and the formats of its Arduino library: the
bytes sent to the board and the C code exported for a sketch. The rest of the app only asks the
selected matrix, so adding a matrix means adding a class here and its providers to the sketch.
"""

import struct

from arduino.app_utils.ledmatrix import MODULINO_MATRIX, UNO_Q_MATRIX, Frame, FrameDesigner, c_identifier, sequence_to_c, to_c_array

# The sketch reads RPC messages of up to 256 bytes: an animation is sent in chunks below that size
RPC_PAYLOAD_LIMIT = 208


class Matrix:
    """What the painter needs to know about a matrix. Subclasses fill in the formats."""

    key: str  # identifier used by the page and stored in the database
    label: str  # name shown in the page
    template: FrameDesigner  # size and brightness levels of the frames
    table: str  # database table of the frames drawn for this matrix
    draw_provider: str  # sketch provider that shows a frame
    load_provider: str  # sketch provider that buffers a chunk of animation frames

    @property
    def chunk_frames(self) -> int:
        """How many animation frames fit in one call to the board."""
        return RPC_PAYLOAD_LIMIT // len(self.animation_entry(self.template.empty(), 0))

    def draw_payload(self, frame: Frame) -> bytes:
        """The frame as the draw provider expects it."""
        raise NotImplementedError

    def animation_entry(self, frame: Frame, duration_ms: int) -> bytes:
        """A frame and its duration as the load provider buffers them."""
        raise NotImplementedError

    def frame_to_c(self, frame: Frame, name: str) -> str:
        """C code of a single frame."""
        raise NotImplementedError

    def animation_to_c(self, frames: list[tuple[Frame, int, str]], name: str) -> str:
        """C code of an animation, from (frame, duration_ms, label) items."""
        raise NotImplementedError


class UnoQMatrix(Matrix):
    """The 13x8 matrix built into UNO Q and VENTUNO Q, driven by Arduino_LED_Matrix."""

    key = "uno_q"
    label = "Board matrix"
    template = FrameDesigner(UNO_Q_MATRIX, brightness_levels=8)  # matrix.setGrayscaleBits(3) in the sketch
    table = "frames"
    draw_provider = "draw"
    load_provider = "load_frames"

    def draw_payload(self, frame: Frame) -> bytes:
        return frame.to_bytes()  # one byte per LED, the format of Arduino_LED_Matrix::draw()

    def animation_entry(self, frame: Frame, duration_ms: int) -> bytes:
        # The pixel words of Arduino_LED_Matrix::loadSequence() followed by the duration
        return struct.pack("<5I", *frame.to_words(), duration_ms)

    def frame_to_c(self, frame: Frame, name: str) -> str:
        return to_c_array(frame, name)

    def animation_to_c(self, frames: list[tuple[Frame, int, str]], name: str) -> str:
        return sequence_to_c(frames, name)


class ModulinoMatrix(Matrix):
    """The 12x8 Modulino LED Matrix in grayscale mode, driven by Arduino_Modulino.

    In grayscale mode a frame is 48 bytes: 4 bits per LED, row by row, the left LED of each pair
    in the high half of the byte. It is the format of ModulinoLEDMatrix::setFrame(), and an
    animation for setSequence() is a list of frames, each followed by its duration in 4 bytes.
    """

    key = "modulino"
    label = "Modulino LED Matrix"
    template = FrameDesigner(MODULINO_MATRIX, brightness_levels=16)  # DisplayMode::Grayscale in the sketch
    table = "frames_modulino"
    draw_provider = "modulino_draw"
    load_provider = "modulino_load_frames"

    def draw_payload(self, frame: Frame) -> bytes:
        pixels = frame.to_bytes()
        return bytes((left << 4) | right for left, right in zip(pixels[0::2], pixels[1::2], strict=False))

    def animation_entry(self, frame: Frame, duration_ms: int) -> bytes:
        return self.draw_payload(frame) + struct.pack("<I", duration_ms)

    def frame_to_c(self, frame: Frame, name: str) -> str:
        data = self.draw_payload(frame)
        row_bytes = frame.width // 2
        rows = [", ".join(f"0x{b:02x}" for b in data[i : i + row_bytes]) for i in range(0, len(data), row_bytes)]
        body = ",\n".join(f"  {row}" for row in rows)
        return f"const uint8_t {c_identifier(name)}[{len(data)}] = {{\n{body}\n}};\n"

    def animation_to_c(self, frames: list[tuple[Frame, int, str]], name: str) -> str:
        entries = [(self.animation_entry(frame, duration_ms), label) for frame, duration_ms, label in frames]
        lines = [f"const uint8_t {c_identifier(name, fallback='animation')}[][{len(entries[0][0])}] = {{"]
        for entry, label in entries:
            values = ", ".join(f"0x{b:02x}" for b in entry)
            lines.append(f"    {{{values}}},  // {' '.join(label.splitlines())}")
        lines.append("};")
        return "\n".join(lines) + "\n"


MATRICES: dict[str, Matrix] = {matrix.key: matrix for matrix in (UnoQMatrix(), ModulinoMatrix())}
DEFAULT_MATRIX = UnoQMatrix.key
