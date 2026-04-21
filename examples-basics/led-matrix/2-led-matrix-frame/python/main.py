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

frame = Frame(frame_array)  # Create a Frame object using the numpy array

frame_bytes = frame.to_board_bytes()  # Convert the Frame object to bytes format suitable for transmission

Bridge.call("draw", frame_bytes)  # Call the "draw" function defined in the sketch passing the frame as argument

App.run()  # Start the application event loop to keep the program running and responsive to events (if any)
