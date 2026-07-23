# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# The web frontend (HTML/JS/CSS) served by WebUI lives in the app's assets/ folder;
# it receives the audio frames over WebSocket and plays them with the Web Audio API.
import time
import numpy as np
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.sound_generator import SoundGeneratorStreamer, SoundEffect

ui = WebUI()

player = SoundGeneratorStreamer(master_volume=1.0, wave_form="square", bpm=120, sound_effects=[SoundEffect.adsr()])
SAMPLE_RATE = player._sample_rate

tune_sequence = [
    ("E5", 0.125),
    ("E5", 0.125),
    ("REST", 0.125),
    ("E5", 0.125),
    ("REST", 0.125),
    ("C5", 0.125),
    ("E5", 0.125),
    ("REST", 0.125),
    ("G5", 0.25),
    ("REST", 0.25),
    ("G4", 0.25),
    ("REST", 0.25),
    ("C5", 0.25),
    ("REST", 0.125),
    ("G4", 0.25),
    ("REST", 0.125),
    ("E4", 0.25),
    ("REST", 0.125),
    ("A4", 0.25),
    ("B4", 0.25),
    ("Bb4", 0.125),
    ("A4", 0.25),
    ("G4", 0.125),
    ("E5", 0.125),
    ("G5", 0.125),
    ("A5", 0.25),
    ("F5", 0.125),
    ("G5", 0.125),
    ("REST", 0.125),
    ("E5", 0.25),
    ("C5", 0.125),
    ("D5", 0.125),
    ("B4", 0.25),
]


def user_lp():
    overall_time = 0
    for note, duration in tune_sequence:
        frame = player.play_tone(note, duration)
        if frame is None:  # a REST: send matching silence so the rhythm is preserved
            frame = np.zeros(int(duration * SAMPLE_RATE), dtype=np.float32)
        # Send raw float32 PCM as bytes; Socket.IO delivers it to the browser as an ArrayBuffer.
        ui.send_message(
            "audio_frame",
            {"raw_data": np.asarray(frame, dtype="<f4").tobytes(), "sample_rate": SAMPLE_RATE},
        )
        overall_time += duration

    time.sleep(overall_time)  # let the sequence finish playing before it restarts


App.run(user_loop=user_lp)
