# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.wave_generator import WaveGenerator
from arduino.app_utils import App, Logger


logger = Logger("theremin")


# Wave generator brick - handles audio generation and streaming automatically
wave_gen = WaveGenerator(
    wave_type="sine",
    attack=0.01,
    release=0.03,
    glide=0.02,
)

# configuration
SAMPLE_RATE = wave_gen.sample_rate

# Set initial state
wave_gen.frequency = 440.0
wave_gen.amplitude = 0.0


# --- Web UI and event handlers -----------------------------------------------------
# The WaveGenerator brick handles audio generation and streaming automatically in
# a background thread. We only need to update frequency and amplitude via its API.
ui = WebUI()


def on_connect(sid, data=None):
    state = wave_gen.state
    ui.send_message("theremin:state", {"freq": state["frequency"], "amp": state["amplitude"]})
    ui.send_message("theremin:volume", {"volume": state["volume"]})


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

    logger.debug(f"on_move: x={x:.3f}, y={y:.3f} -> freq={freq:.1f}Hz, amp={amp:.3f}")

    # Update wave generator state
    wave_gen.frequency = freq
    wave_gen.amplitude = amp

    ui.send_message("theremin:state", {"freq": freq, "amp": amp}, room=sid)


def on_power(sid, data=None):
    d = data or {}
    on = bool(d.get("on", False))
    if on:
        wave_gen.amplitude = 1.0
    else:
        wave_gen.amplitude = 0.0


def on_set_volume(sid, data=None):
    d = data or {}
    volume = int(d.get("volume", 100))
    volume = max(0, min(100, volume))
    wave_gen.set_volume(volume)
    ui.send_message("theremin:volume", {"volume": volume})


ui.on_connect(on_connect)
ui.on_message("theremin:move", on_move)
ui.on_message("theremin:power", on_power)
ui.on_message("theremin:set_volume", on_set_volume)

# Run the app - WaveGenerator handles audio generation automatically
App.run()
