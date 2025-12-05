# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App, Logger
import time
import logging

logger = Logger("music-composer", logging.DEBUG)

# Configuration
NOTES = ["B4", "A#4", "A4", "G#4", "G4", "F#4", "F4", "E4", "D#4", "D4", "C#4", "C4"]
GRID_STEPS = 16

# Sound generator brick
sound_gen = SoundGenerator(wave_form="sine", bpm=120, sound_effects=[SoundEffect.adsr()])
sound_gen.start()  # Start the audio output device
sound_gen.set_master_volume(0.8)  # Set volume to 80%
logger.info("Sound generator initialized and started")

# State
grid_state = {}  # {noteIndex: {stepIndex: true/false}}
bpm = 120
is_playing = False
current_step = 0
last_step_time = 0
effects_config = {"reverb": 0, "chorus": 0, "tremolo": 0, "vibrato": 0, "overdrive": 0}

# Web UI
ui = WebUI()


def calculate_step_duration(bpm_value):
    """Calculate duration of a single step in seconds based on BPM."""
    # Each step is a quarter note (1/4)
    # 16 steps = 16 quarter notes = 4 bars in 4/4 time
    beat_duration = 60.0 / bpm_value  # seconds per beat (quarter note)
    step_duration = beat_duration  # 1 step = 1 beat = 1 quarter note
    return step_duration


def user_loop():
    """Called repeatedly by App.run() - handles sequencer playback."""
    global current_step, last_step_time, is_playing

    if not is_playing:
        return

    current_time = time.time()
    step_duration = calculate_step_duration(bpm)

    # Check if it's time for the next step
    if current_time - last_step_time >= step_duration:
        # Collect notes to play at this step
        notes_to_play = []
        for note_idx in range(len(NOTES)):
            # Convert to string keys for grid access (JS sends strings)
            note_key = str(note_idx)
            step_key = str(current_step)
            if note_key in grid_state and step_key in grid_state[note_key]:
                if grid_state[note_key][step_key]:
                    notes_to_play.append(NOTES[note_idx])

        # Play notes first (don't play REST, just silence)
        if notes_to_play:
            # Use play_tone with explicit duration in seconds
            # Short duration (0.1 sec) to create staccato effect and avoid buffer issues
            tone_duration = 0.1  # 100ms note
            for note in notes_to_play:
                try:
                    # Use block=True to force audio device to wait and not drop notes
                    sound_gen.play_tone(note, tone_duration, block=True)
                    logger.debug(f"  -> Played {note} successfully")
                except Exception as e:
                    logger.error(f"Error playing note {note}: {e}")
            logger.debug(f"Step {current_step}: Playing {notes_to_play}")
        else:
            logger.debug(f"Step {current_step}: REST (silence)")

        # Notify frontend after starting sound playback
        ui.send_message("composer:step_playing", {"step": current_step})

        # Move to next step and maintain precise timing
        current_step = (current_step + 1) % GRID_STEPS
        # Use fixed step duration to avoid drift
        last_step_time += step_duration


def on_connect(sid, data=None):
    """Send current state when client connects."""
    logger.info(f"Client connected: {sid}")
    state = {"grid": grid_state, "bpm": bpm, "effects": effects_config}
    ui.send_message("composer:state", state, room=sid)


def on_get_state(sid, data=None):
    """Client requests current state."""
    state = {"grid": grid_state, "bpm": bpm, "effects": effects_config}
    ui.send_message("composer:state", state, room=sid)


def on_update_grid(sid, data=None):
    """Update the grid state."""
    global grid_state
    d = data or {}
    if "grid" in d:
        new_grid = d["grid"]
        logger.debug(f"Grid update received: {new_grid}")
        logger.debug(f"Grid before update: {grid_state}")
        grid_state = new_grid
        logger.debug(f"Grid after update: {grid_state}")


def on_play(sid, data=None):
    """Start playing the sequencer loop."""
    global is_playing, current_step, last_step_time, grid_state, bpm

    if is_playing:
        logger.warning("Play requested but already playing")
        return

    d = data or {}
    if "grid" in d:
        grid_state = d["grid"]
        logger.debug(f"Grid received in play: {grid_state}")
    if "bpm" in d:
        bpm = d["bpm"]

    is_playing = True
    current_step = 0
    # Set last_step_time in the past so first step plays immediately
    step_duration = calculate_step_duration(bpm)
    last_step_time = time.time() - step_duration
    logger.info(f"Started playback at {bpm} BPM, is_playing={is_playing}")


def on_stop(sid, data=None):
    """Stop playing the sequencer loop."""
    global is_playing, current_step
    logger.info(f"Stop requested, is_playing was {is_playing}")
    is_playing = False
    current_step = 0
    # Clear any playing step highlight
    ui.send_message("composer:step_playing", {"step": -1})
    logger.info(f"Stopped playback, is_playing={is_playing}")


def on_set_bpm(sid, data=None):
    """Set the BPM."""
    global bpm
    d = data or {}
    new_bpm = int(d.get("bpm", 120))
    bpm = max(40, min(240, new_bpm))
    sound_gen._bpm = bpm  # Update sound generator BPM
    logger.info(f"BPM set to: {bpm}")


def on_set_waveform(sid, data=None):
    """Change the waveform type."""
    d = data or {}
    waveform = d.get("waveform", "sine")

    valid_waveforms = ["sine", "square", "triangle", "sawtooth"]
    if waveform in valid_waveforms:
        sound_gen.set_wave_form(waveform)
        logger.info(f"Waveform changed to: {waveform}")


def on_set_volume(sid, data=None):
    """Set the playback volume."""
    d = data or {}
    volume = int(d.get("volume", 80))
    volume = max(0, min(100, volume))

    # Convert 0-100 to 0.0-1.0
    volume_float = volume / 100.0
    sound_gen.set_master_volume(volume_float)
    logger.info(f"Volume set to: {volume}")


def on_set_effects(sid, data=None):
    """Set the effects configuration."""
    global effects_config
    d = data or {}
    if "effects" in d:
        effects_config = d["effects"]
        logger.info(f"Effects updated: {effects_config}")
        # Here you could apply effects to the sound generator
        # For now, we just store the configuration


def on_export(sid, data=None):
    """Export the composition as Arduino C/C++ code."""
    d = data or {}
    export_grid = d.get("grid", grid_state)

    # Generate C array code
    code_lines = ["// Generated by Music Composer", "// Grid: 16 steps x 12 notes", "", "const bool sequence[12][16] = {"]

    for note_idx in range(len(NOTES)):
        row = []
        for step in range(GRID_STEPS):
            has_note = note_idx in export_grid and step in export_grid[note_idx] and export_grid[note_idx][step]
            row.append("1" if has_note else "0")

        row_str = "  {" + ", ".join(row) + "}"
        if note_idx < len(NOTES) - 1:
            row_str += ","
        code_lines.append(row_str + f"  // {NOTES[note_idx]}")

    code_lines.append("};")
    code_lines.append("")
    code_lines.append(f"const int BPM = {bpm};")
    code_lines.append(f'const char* notes[12] = {{"{'", "'.join(NOTES)}"}};')

    code_content = "\n".join(code_lines)

    ui.send_message("composer:export_data", {"content": code_content, "filename": "composition.h"}, room=sid)

    logger.info("Composition exported")


# Register event handlers
ui.on_connect(on_connect)
ui.on_message("composer:get_state", on_get_state)
ui.on_message("composer:update_grid", on_update_grid)
ui.on_message("composer:play", on_play)
ui.on_message("composer:stop", on_stop)
ui.on_message("composer:set_bpm", on_set_bpm)
ui.on_message("composer:set_waveform", on_set_waveform)
ui.on_message("composer:set_volume", on_set_volume)
ui.on_message("composer:set_effects", on_set_effects)
ui.on_message("composer:export", on_export)

# Run the app with user loop
App.run(user_loop=user_loop)
