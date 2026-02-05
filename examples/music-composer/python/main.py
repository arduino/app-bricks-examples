# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect
from arduino.app_utils import App, Logger

logger = Logger(__name__)

# Components
ui = WebUI()
gen = SoundGenerator(wave_form="square", bpm=120, sound_effects=[SoundEffect.adsr()])
gen.start()
gen.set_master_volume(0.8)

# Note map (18 notes from B4 down to F#3)
NOTE_MAP = ["B4", "A#4", "A4", "G#4", "G4", "F#4", "F4", "E4", "D#4", "D4", "C#4", "C4", "B3", "A#3", "A3", "G#3", "G3", "F#3"]

# State
grid_state = {}  # {"noteIdx": {"stepIdx": bool}}
bpm = 120
is_playing = False
current_step = 0
waveform = "sine"
volume = 0.8
effects_state = {}


def on_step_callback(step: int, total_steps: int):
    """Called by SoundGenerator for each step - synchronized with audio."""
    global current_step
    current_step = step
    ui.send_message("composer:step_playing", {"step": step, "total_steps": total_steps})


def on_sequence_complete():
    """Called when sequence playback completes."""
    global is_playing, current_step
    is_playing = False
    current_step = 0
    logger.info("Sequence completed")
    ui.send_message("composer:playback_ended", {})


def build_sequence_from_grid(grid: dict) -> list[list[str]]:
    """Build sequence from grid state.

    Args:
        grid: Grid state dictionary

    Returns:
        List of steps, each step is list of notes (or empty for rest).
    """
    # Find max step index with notes
    max_step = -1
    for note_key in grid:
        for step_key in grid[note_key]:
            if grid[note_key][step_key]:
                max_step = max(max_step, int(step_key))

    # Build sequence up to last note (minimum 16 steps)
    length = max(max_step + 1, 16) if max_step >= 0 else 16

    sequence = []
    for step in range(length):
        step_notes = []
        for note_idx in range(len(NOTE_MAP)):
            note_key = str(note_idx)
            step_key = str(step)
            if note_key in grid and step_key in grid[note_key] and grid[note_key][step_key]:
                step_notes.append(NOTE_MAP[note_idx])
        sequence.append(step_notes)

    return sequence


def on_connect(sid, data=None):
    """Send initial state to new client."""
    logger.info(f"Client connected: {sid}")
    ui.send_message(
        "composer:state",
        {"grid": grid_state, "bpm": bpm, "is_playing": is_playing, "current_step": current_step},
        room=sid,
    )


def on_get_state(sid, data=None):
    """Send current state."""
    ui.send_message(
        "composer:state",
        {"grid": grid_state, "bpm": bpm, "is_playing": is_playing, "current_step": current_step},
        room=sid,
    )


def on_update_grid(sid, data=None):
    """Update grid state."""
    global grid_state

    if is_playing:
        logger.warning("Grid update rejected: playback in progress")
        return

    grid_state = data.get("grid", {})
    logger.debug("Grid updated")

    ui.send_message(
        "composer:state",
        {
            "grid": grid_state,
            "bpm": bpm,
            "is_playing": is_playing,
            "current_step": current_step,
        },
    )


def on_set_bpm(sid, data=None):
    """Update BPM."""
    global bpm

    if is_playing:
        logger.warning("BPM update rejected: playback in progress")
        return

    if data:
        bpm = data.get("bpm", 120)
        gen.set_bpm(bpm)  # Update the brick's internal BPM
        logger.info(f"BPM updated to {bpm}")
    else:
        logger.warning("No BPM data received")

    ui.send_message(
        "composer:state",
        {
            "grid": grid_state,
            "bpm": bpm,
            "is_playing": is_playing,
            "current_step": current_step,
        },
    )


def on_play(sid, data=None):
    """Start playback."""
    global is_playing

    if is_playing:
        logger.warning("Already playing")
        return

    # Build sequence from grid
    sequence = build_sequence_from_grid(grid_state)
    logger.info(f"Starting playback: {len(sequence)} steps at {bpm} BPM")

    # Start playback (one-shot, will loop automatically when it finishes)
    is_playing = True
    gen.play_step_sequence(
        sequence=sequence,
        note_duration=1 / 16,
        loop=False,  # One-shot playback
        on_step_callback=on_step_callback,
        on_complete_callback=on_sequence_complete,
    )

    ui.send_message(
        "composer:state",
        {
            "grid": grid_state,
            "bpm": bpm,
            "is_playing": is_playing,
            "current_step": current_step,
            "total_steps": len(sequence),  # Tell frontend how many steps
        },
    )


def on_stop(sid, data=None):
    """Stop playback."""
    global is_playing, current_step

    logger.info("on_stop called")
    if not is_playing:
        logger.warning("Stop called but already not playing")
        return

    logger.info("Calling gen.stop_sequence()")
    gen.stop_sequence()
    is_playing = False
    current_step = 0
    logger.info("Playback stopped")

    ui.send_message(
        "composer:state",
        {
            "grid": grid_state,
            "bpm": bpm,
            "is_playing": is_playing,
            "current_step": current_step,
        },
    )


def on_set_waveform(sid, data=None):
    """Change waveform."""
    global waveform
    waveform = data.get("waveform", "sine")
    if waveform in ["sine", "square", "triangle", "sawtooth"]:
        gen.set_wave_form(waveform)
        logger.info(f"Waveform: {waveform}")


def on_set_volume(sid, data=None):
    """Change volume."""
    global volume
    volume = data.get("volume", 80) / 100.0
    gen.set_master_volume(volume)
    logger.info(f"Volume: {volume:.2f}")


def on_set_effects(sid, data=None):
    """Update effects."""
    global effects_state
    effects_state = data.get("effects", {})
    effect_list = [SoundEffect.adsr()]

    if effects_state.get("bitcrusher", 0) > 0:
        bits = int(8 - (effects_state["bitcrusher"] / 100.0) * 6)
        effect_list.append(SoundEffect.bitcrusher(bits=bits, reduction=4))

    if effects_state.get("chorus", 0) > 0:
        level = effects_state["chorus"] / 100.0
        effect_list.append(SoundEffect.chorus(depth_ms=int(5 + level * 20), rate_hz=0.25, mix=level * 0.8))

    if effects_state.get("tremolo", 0) > 0:
        level = effects_state["tremolo"] / 100.0
        effect_list.append(SoundEffect.tremolo(depth=level, rate=5.0))

    if effects_state.get("vibrato", 0) > 0:
        level = effects_state["vibrato"] / 100.0
        effect_list.append(SoundEffect.vibrato(depth=level * 0.05, rate=2.0))

    if effects_state.get("overdrive", 0) > 0:
        level = effects_state["overdrive"] / 100.0
        effect_list.append(SoundEffect.overdrive(drive=1.0 + level * 200))

    gen.set_effects(effect_list)
    logger.info(f"Effects applied: {len(effect_list)}")


def on_export(sid, data=None):
    """Export a MusicComposition object to a Python file."""
    sequence = build_sequence_from_grid(grid_state)

    # Build polyphonic sequences: one track per note
    tracks = []
    for note_idx, note_name in enumerate(NOTE_MAP):
        track = []
        for step_notes in sequence:
            if step_notes and note_name in step_notes:
                # Note is active in this step
                track.append((note_name, 1 / 8))  # Duration: 1/8 note (eighth note)
            elif track and track[-1][0] != "REST":
                # Add REST if previous was not a REST
                track.append(("REST", 1 / 8))
            elif not track:
                # Start with REST if note doesn't start immediately
                track.append(("REST", 1 / 8))

        # Only include tracks that have actual notes (not just REST)
        if any(note != "REST" for note, _ in track):
            tracks.append(track)

    # Build effects list code representation
    effects_code = ["SoundEffect.adsr()"]

    if effects_state.get("bitcrusher", 0) > 0:
        bits = int(8 - (effects_state["bitcrusher"] / 100.0) * 6)
        effects_code.append(f"SoundEffect.bitcrusher(bits={bits}, reduction=4)")

    if effects_state.get("chorus", 0) > 0:
        level = effects_state["chorus"] / 100.0
        depth_ms = int(5 + level * 20)
        mix = level * 0.8
        effects_code.append(f"SoundEffect.chorus(depth_ms={depth_ms}, rate_hz=0.25, mix={mix:.2f})")

    if effects_state.get("tremolo", 0) > 0:
        level = effects_state["tremolo"] / 100.0
        effects_code.append(f"SoundEffect.tremolo(depth={level:.2f}, rate=5.0)")

    if effects_state.get("vibrato", 0) > 0:
        level = effects_state["vibrato"] / 100.0
        depth = level * 0.05
        effects_code.append(f"SoundEffect.vibrato(depth={depth:.4f}, rate=2.0)")

    if effects_state.get("overdrive", 0) > 0:
        level = effects_state["overdrive"] / 100.0
        drive = 1.0 + level * 200
        effects_code.append(f"SoundEffect.overdrive(drive={drive:.2f})")

    # Generate Python code with MusicComposition
    code_lines = [
        "# Music Composer - Generated Composition",
        "# This file contains a MusicComposition object that can be played with SoundGenerator.play_composition()",
        "",
        "from arduino.app_bricks.sound_generator import MusicComposition, SoundEffect",
        "",
        f"# Configuration: {len(sequence)} steps at {bpm} BPM",
        "",
        "# Define the composition tracks",
        "composition_tracks = [",
    ]

    # Add tracks
    for i, track in enumerate(tracks):
        code_lines.append("    [  # Track " + str(i + 1))
        for j, (note, duration) in enumerate(track):
            duration_str = f"{duration:.3f}"
            comma = "," if j < len(track) - 1 else ""
            code_lines.append(f'        ("{note}", {duration_str}){comma}')
        comma = "," if i < len(tracks) - 1 else ""
        code_lines.append("    ]" + comma)

    code_lines.extend([
        "]",
        "",
        "# Create the MusicComposition object",
        "composition = MusicComposition(",
        "    composition=composition_tracks,",
        f"    bpm={bpm},",
        f'    waveform="{waveform}",',
        f"    volume={volume:.2f},",
        "    effects=[",
    ])

    # Add effects
    for i, effect in enumerate(effects_code):
        comma = "," if i < len(effects_code) - 1 else ""
        code_lines.append(f"        {effect}{comma}")

    code_lines.extend([
        "    ]",
        ")",
    ])

    ui.send_message(
        "composer:export_data",
        {
            "filename": "composition.py",
            "content": "\n".join(code_lines),
        },
        room=sid,
    )


# Register all event handlers
ui.on_connect(on_connect)
ui.on_message("composer:get_state", on_get_state)
ui.on_message("composer:update_grid", on_update_grid)
ui.on_message("composer:set_bpm", on_set_bpm)
ui.on_message("composer:play", on_play)
ui.on_message("composer:stop", on_stop)
ui.on_message("composer:set_waveform", on_set_waveform)
ui.on_message("composer:set_volume", on_set_volume)
ui.on_message("composer:set_effects", on_set_effects)
ui.on_message("composer:export", on_export)


if __name__ == "__main__":
    App.run()
