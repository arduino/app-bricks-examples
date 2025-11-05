# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

import threading
import time

from arduino.app_bricks.web_ui import WebUI
from arduino.app_peripherals.speaker import Speaker
from arduino.app_utils import App, SineGenerator


# configuration
SAMPLE_RATE = 16000
# duration of each produced block (seconds).
BLOCK_DUR = 0.03

# speaker setup
speaker = Speaker(sample_rate=SAMPLE_RATE, format='FLOAT_LE')
speaker.start()
speaker.set_volume(80)

# runtime state (module-level)
current_freq = 440.0
current_amp = 0.0
master_volume = 0.8
running = True

# Sine generator instance encapsulates buffers/state
sine_gen = SineGenerator(SAMPLE_RATE)
# Configure envelope parameters: attack, release, and frequency glide (portamento)
sine_gen.set_envelope_params(attack=0.01, release=0.03, glide=0.02)


# --- Producer scheduling ---------------------------------------------------------
# The example provides a producer loop that generates audio blocks at a steady
# cadence (BLOCK_DUR). The loop is executed under the application's main
# lifecycle by passing it to `App.run()`; we avoid starting background threads
# directly from example code so the AppController can manage startup/shutdown.

# event to wake the producer when state changes (e.g. on_move updates freq/amp)
prod_wake = threading.Event()

# Producer loop
# The producer loop is executed inside App.run() by passing a user_loop callable. 
# This keeps the example simple and aligns with AppController's lifecycle management.
def theremin_producer_loop():
    """Single-iteration producer loop executed repeatedly by App.run().

    This function performs one producer iteration: it generates a single
    block and plays it non-blocking. `App.run()` will call this repeatedly
    until the application shuts down (Ctrl+C).
    """
    global running
    next_time = time.perf_counter()
    # lightweight single-iteration producer used by the App.run() user_loop.
    while running:
        # steady scheduling
        next_time += float(BLOCK_DUR)

        # if no amplitude requested, avoid stopping the producer indefinitely.
        # Instead wait with a timeout and emit a silent block while idle. This
        # keeps scheduling steady and avoids large timing discontinuities when
        # the producer is woken again (which can produce audible cracks).
        if current_amp <= 0.0:
            prod_wake.clear()
            # wait up to one block duration; if woken earlier we proceed
            prod_wake.wait(timeout=BLOCK_DUR)
            # emit a silent block to keep audio device scheduling continuous
            if current_amp <= 0.0:
                data = sine_gen.generate_block(float(current_freq), 0.0, BLOCK_DUR, master_volume)
                speaker.play(data, block_on_queue=False)
                # maintain timing
                now = time.perf_counter()
                sleep_time = next_time - now
                if sleep_time > 0:
                    time.sleep(sleep_time)
                else:
                    next_time = now
                continue

        # read targets
        freq = float(current_freq)
        amp = float(current_amp)

        # generate one block and play non-blocking
        data = sine_gen.generate_block(freq, amp, BLOCK_DUR, master_volume)
        speaker.play(data, block_on_queue=False)

        # wait until next scheduled time
        now = time.perf_counter()
        sleep_time = next_time - now
        if sleep_time > 0:
            time.sleep(sleep_time)
        else:
            next_time = now


# --- Web UI and event handlers -----------------------------------------------------
ui = WebUI()

def on_connect(sid, data=None):
    ui.send_message('theremin:state', {'freq': current_freq, 'amp': current_amp})
    ui.send_message('theremin:volume', {'volume': master_volume})

def _freq_from_x(x):
    return 20.0 * ((SAMPLE_RATE / 2.0 / 20.0) ** x)

def on_move(sid, data=None):
    """Update desired frequency/amplitude and wake producer.

    The frontend should only send on mousedown/move/mouseup (no aggressive
    repeat). This handler updates shared state and signals the producer. The
    actual audio scheduling is handled by the producer loop executed under
    `App.run()`.
    """
    global current_freq, current_amp
    d = data or {}
    x = float(d.get('x', 0.0))
    y = float(d.get('y', 1.0))
    freq = d.get('freq')
    freq = float(freq) if freq is not None else _freq_from_x(x)
    amp = max(0.0, min(1.0, 1.0 - float(y)))
    current_freq = freq
    current_amp = amp
    # wake the producer so it reacts immediately
    prod_wake.set()
    ui.send_message('theremin:state', {'freq': freq, 'amp': amp}, room=sid)

def on_power(sid, data=None):
    global current_amp
    d = data or {}
    on = bool(d.get('on', False))
    if not on:
        current_amp = 0.0
    prod_wake.set()

def on_set_volume(sid, data=None):
    global master_volume
    d = data or {}
    v = float(d.get('volume', master_volume))
    master_volume = max(0.0, min(1.0, v))
    ui.send_message('theremin:volume', {'volume': master_volume})

ui.on_connect(on_connect)
ui.on_message('theremin:move', on_move)
ui.on_message('theremin:power', on_power)
ui.on_message('theremin:set_volume', on_set_volume)

# Run the app and use the theremin_producer_loop as the user-provided loop.
App.run(user_loop=theremin_producer_loop)
