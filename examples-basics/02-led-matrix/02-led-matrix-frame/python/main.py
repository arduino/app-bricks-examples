# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App, Bridge, Frame 
import numpy as np

# Define a 2D numpy array of brightness values for the 8x13 LED matrix (X shape)
frame_array = np.array(
    [
        [7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7],
        [0, 0, 7, 7, 0, 0, 0, 0, 0, 7, 7, 0, 0],
        [0, 0, 0, 0, 7, 7, 0, 7, 7, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 7, 7, 0, 7, 7, 0, 0, 0, 0],
        [0, 0, 7, 7, 0, 0, 0, 0, 0, 7, 7, 0, 0],
        [7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7],
    ],
    dtype=np.uint8,
)

frame = Frame(frame_array)  # Frame is a utils class that allows to create and validate frames for the LED matrix

frame_bytes = frame.to_board_bytes()  # Convert the Frame instance to bytes format suitable for transmission

Bridge.call("draw", frame_bytes)

App.run()
