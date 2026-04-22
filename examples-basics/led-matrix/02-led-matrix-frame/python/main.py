# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Import the App class to create an App Lab application, the Bridge class to communicate with the Arduino board
# and the Frame class to represent the LED matrix frame.
# Also import numpy to create a 2D array of brightness values for the LED matrix.
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

frame = Frame(frame_array)  # Create a Frame instance using the numpy array

frame_bytes = frame.to_board_bytes()  # Convert the Frame instance to bytes format suitable for transmission

Bridge.call("draw", frame_bytes)

# The App.run() method starts the application and keeps it running, allowing the Arduino App Lab to start
# and stop the app.
App.run()
