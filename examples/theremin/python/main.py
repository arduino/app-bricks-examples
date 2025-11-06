# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.wave_generator import WaveGenerator
from arduino.app_utils import App


# configuration
SAMPLE_RATE = 16000

# Wave generator brick - handles audio generation and streaming automatically
wave_gen = WaveGenerator(
    sample_rate=SAMPLE_RATE,
    wave_type="sine",
    block_duration=0.03,
    attack=0.01,
    release=0.03,
    glide=0.02,
)

# Set initial state
wave_gen.set_frequency(440.0)
wave_gen.set_amplitude(0.0)
wave_gen.set_volume(0.8)


# --- Web UI and event handlers -----------------------------------------------------
# The WaveGenerator brick handles audio generation and streaming automatically in
# a background thread. We only need to update frequency and amplitude via its API.
ui = WebUI()


def on_connect(sid, data=None):
    state = wave_gen.get_state()
    ui.send_message("theremin:state", {"freq": state["frequency"], "amp": state["amplitude"]})
    ui.send_message("theremin:volume", {"volume": state["master_volume"]})


def _freq_from_x(x):
    return 20.0 * ((SAMPLE_RATE / 2.0 / 20.0) ** x)


def on_move(sid, data=None):
    """Update desired frequency/amplitude.

    The WaveGenerator brick handles smooth transitions automatically using
    the configured envelope parameters (attack, release, glide).
    """
    d = data or {}
    x = float(d.get("x", 0.0))
    y = float(d.get("y", 1.0))
    freq = d.get("freq")
    freq = float(freq) if freq is not None else _freq_from_x(x)
    amp = max(0.0, min(1.0, 1.0 - float(y)))

    # Update wave generator state
    wave_gen.set_frequency(freq)
    wave_gen.set_amplitude(amp)

    ui.send_message("theremin:state", {"freq": freq, "amp": amp}, room=sid)


def on_power(sid, data=None):
    d = data or {}
    on = bool(d.get("on", False))
    if not on:
        wave_gen.set_amplitude(0.0)


def on_set_volume(sid, data=None):
    d = data or {}
    state = wave_gen.get_state()
    v = float(d.get("volume", state["master_volume"]))
    v = max(0.0, min(1.0, v))
    wave_gen.set_volume(v)
    ui.send_message("theremin:volume", {"volume": v})


ui.on_connect(on_connect)
ui.on_message("theremin:move", on_move)
ui.on_message("theremin:power", on_power)
ui.on_message("theremin:set_volume", on_set_volume)

# Run the app - WaveGenerator handles audio generation automatically
App.run()
