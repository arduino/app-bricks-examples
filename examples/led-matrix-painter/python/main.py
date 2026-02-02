# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App, Bridge, FrameDesigner, Logger
from app_frame import AppFrame  # user module defining AppFrame
import store  # user module for DB operations

BRIGHTNESS_LEVELS = 8  # must match the frontend slider range (0..BRIGHTNESS_LEVELS-1)
MAX_FRAMES = 300  # must match MAX_FRAMES in sketch.ino (animation buffer limit)

logger = Logger("led-matrix-painter")
ui = WebUI()
designer = FrameDesigner()

logger.info("Initializing LED matrix tool")
store.init_db()
logger.info(f"Database initialized, brightness_levels={BRIGHTNESS_LEVELS}")


def get_config():
    """Expose runtime configuration for the frontend."""
    return {
        'brightness_levels': BRIGHTNESS_LEVELS,
        'width': designer.width,
        'height': designer.height,
    }


def apply_frame_to_board(frame: AppFrame):
    """Send frame bytes to the Arduino board."""
    frame_bytes = frame.to_board_bytes()
    Bridge.call("draw", frame_bytes)
    frame_label = f"name={frame.name}, id={frame.id if frame.id else 'None (preview)'}"
    logger.debug(f"Frame sent to board: {frame_label}, bytes_len={len(frame_bytes)}")


def update_board(payload: dict):
    """Update board display in real-time without persisting to DB.

    Used for live preview during editing.
    Expected payload: {rows, name, id, position, duration_ms, brightness_levels}
    """
    frame = AppFrame.from_json(payload)
    apply_frame_to_board(frame)
    vector_text = frame.to_c_string()
    return {'ok': True, 'vector': vector_text}


def persist_frame(payload: dict):
    """Persist frame to DB (insert new or update existing).

    Backend (store.save_frame) is responsible for assigning progressive names.

    Expected payload: {rows, name, id, position, duration_ms, brightness_levels}
    """
    frame = AppFrame.from_json(payload)

    if frame.id is None:
        # Insert new frame - backend assigns name if empty
        logger.debug(f"Creating new frame: name='{frame.name}'")
        frame.id = store.save_frame(frame)
        # Reload frame to get backend-assigned name
        record = store.get_frame_by_id(frame.id)
        if record:
            frame = AppFrame.from_record(record)
        logger.info(f"New frame created: id={frame.id}, name={frame.name}")
    else:
        # Update existing frame
        logger.debug(f"Updating frame: id={frame.id}, name={frame.name}")
        store.update_frame(frame)

    apply_frame_to_board(frame)
    vector_text = frame.to_c_string()
    return {'ok': True, 'frame': frame.to_json(), 'vector': vector_text}


def bulk_update_frame_duration(payload) -> bool:
    """Update the duration of all frames."""
    duration = payload.get('duration_ms', 1000)
    logger.debug(f"Bulk updating frame duration: duration={duration}")
    store.bulk_update_frame_duration(duration)
    return True


def load_frame(payload: dict = None):
    """Load a frame for editing or create empty if none exist.

    Optional payload: {id: int} to load specific frame
    If no ID provided, loads last frame or creates empty
    """
    fid = payload.get('id') if payload else None

    if fid is not None:
        logger.debug(f"Loading frame by id: {fid}")
        record = store.get_frame_by_id(fid)
        if not record:
            logger.warning(f"Frame not found: id={fid}")
            return {'error': 'frame not found'}
        frame = AppFrame.from_record(record)
        logger.info(f"Frame loaded: id={frame.id}, name={frame.name}")
    else:
        # Get last frame or create empty
        logger.debug("Loading last frame or creating empty")
        frame = store.get_or_create_active_frame(brightness_levels=BRIGHTNESS_LEVELS)
        logger.info(f"Active frame ready: id={frame.id}, name={frame.name}")

    apply_frame_to_board(frame)
    vector_text = frame.to_c_string()
    return {'ok': True, 'frame': frame.to_json(), 'vector': vector_text}


def list_frames():
    """Return list of frames for sidebar."""
    records = store.list_frames(order_by='position ASC, id ASC')
    frames = [AppFrame.from_record(r).to_json() for r in records]
    return {'frames': frames}


def get_frame(payload: dict):
    """Get single frame by ID."""
    fid = payload.get('id')
    record = store.get_frame_by_id(fid)

    if not record:
        return {'error': 'not found'}

    frame = AppFrame.from_record(record)
    return {'frame': frame.to_json()}


def delete_frames(payload: dict):
    """Delete multiple frames by ID."""
    fids = payload.get('ids', [])
    if not fids:
        return {'error': 'no frame ids provided'}
    logger.info(f"Deleting frames: ids={fids}")
    store.delete_frames(fids)
    return {'ok': True}


def reorder_frames(payload: dict):
    """Reorder frames to match provided id list order."""
    order = payload.get('order', [])
    logger.info(f"Reordering frames: new order={order}")
    store.reorder_frames(order)
    return {'ok': True}


def transform_frame(payload: dict):
    """Apply transformation operation to a frame.

    Payload: {op: str, rows: list OR id: int}
    Operations: invert, invert_not_null, rotate180, flip_h, flip_v
    """
    op = payload.get('op')
    if not op:
        return {'error': 'op required'}

    # Load frame from rows or by ID
    rows = payload.get('rows')
    if rows is not None:
        frame = AppFrame.from_json({'rows': rows, 'brightness_levels': BRIGHTNESS_LEVELS})
        logger.debug(f"Transforming frame from rows: op={op}")
    else:
        fid = payload.get('id')
        if fid is None:
            return {'error': 'id or rows required'}
        record = store.get_frame_by_id(fid)
        if not record:
            return {'error': 'frame not found'}
        frame = AppFrame.from_record(record)
        logger.debug(f"Transforming frame by id: id={fid}, op={op}")

    # Apply transformation
    operations = {
        'invert': designer.invert,
        'invert_not_null': designer.invert_not_null,
        'rotate180': designer.rotate180,
        'flip_h': designer.flip_horizontally,
        'flip_v': designer.flip_vertically,
    }
    if op not in operations:
        logger.warning(f"Unsupported transform operation: {op}")
        return {'error': 'unsupported op'}

    options = payload.get('options', {})
    operations[op](frame, **options)
    logger.info(f"Transform applied: op={op}")

    # Return transformed frame (frontend will handle board update via persist)
    return {'ok': True, 'frame': frame.to_json(), 'vector': frame.to_c_string()}


def export_frames(payload: dict = None):
    """Export multiple frames into a single C header string.

    Payload (optional): {frames: [id,...], animations: [{name, frames}]}
    - If no animations: exports frames as individual arrays (Frames mode)
    - If animations present: exports as animation sequences (Animations mode)
    """
    # Get frame IDs to export
    if payload and payload.get('frames'):
        frame_ids = [int(fid) for fid in payload['frames']]
        logger.info(f"Exporting selected frames: ids={frame_ids}")
        records = [store.get_frame_by_id(fid) for fid in frame_ids]
        records = [r for r in records if r is not None]
    else:
        logger.info("Exporting all frames")
        records = store.list_frames(order_by='position ASC, id ASC')

    logger.debug(f"Exporting {len(records)} frames to C header")

    # Build frame objects and check for duplicate names
    frames = [AppFrame.from_record(r) for r in records]
    frame_names = {}  # name -> count
    for frame in frames:
        frame_names[frame.name] = frame_names.get(frame.name, 0) + 1

    # Assign unique names if duplicates exist
    name_counters = {}  # name -> current index
    for frame in frames:
        if frame_names[frame.name] > 1:
            # Duplicate detected, add suffix
            if frame.name not in name_counters:
                name_counters[frame.name] = 0
            # Use _idN suffix for uniqueness
            frame._export_name = f"{frame.name}_id{frame.id}"
            logger.debug(f"Duplicate name '{frame.name}' -> '{frame._export_name}'")
        else:
            # Unique name, use as-is
            frame._export_name = frame.name

    # Check if we're in animations mode
    animations = payload.get('animations') if payload else None

    if animations:
        # Animation mode: export as animation sequences
        logger.info(f"Animation mode: {len(animations)} animation(s)")
        header_parts = []

        for anim in animations:
            anim_name = anim.get('name', 'Animation')
            anim_frame_ids = anim.get('frames', [])

            # Get frames for this animation
            anim_frames = [f for f in frames if f.id in anim_frame_ids]

            if not anim_frames:
                continue

            # Build animation array (delegated to AppFrame exporter)
            header_parts.append(f"// Animation: {anim_name}")
            header_parts.append(AppFrame.frames_to_c_animation_array(anim_frames, anim_name))

        header = "\n".join(header_parts).strip() + "\n"
        return {'header': header}
    else:
        # Frames mode: export individual frame arrays
        header_parts = []
        for frame in frames:
            header_parts.append(f"// {frame._export_name} (id {frame.id})")
            header_parts.append(frame.to_c_string())

        header = "\n".join(header_parts).strip() + "\n"
        return {'header': header}


def play_animation(payload: dict):
    """Play animation sequence on the board.

    Payload: {frames: [id,...], loop: bool}
    - frames: list of frame IDs to play in sequence
    """
    frame_ids = payload.get("frames", [])

    if not frame_ids:
        logger.warning("play_animation called with no frames")
        return {"error": "no frames provided"}

    # Check frame count against sketch buffer limit
    if len(frame_ids) > MAX_FRAMES:
        logger.error(f"Too many frames for animation: {len(frame_ids)} > {MAX_FRAMES}")
        return {"error": f"Animation exceeds maximum frame limit ({MAX_FRAMES} frames). Please reduce the number of frames."}

    logger.info(f"Playing animation: frame_count={len(frame_ids)}")

    # Load frames from DB
    records = [store.get_frame_by_id(fid) for fid in frame_ids]
    records = [r for r in records if r is not None]

    if not records:
        logger.warning("No valid frames found for animation")
        return {"error": "no valid frames found"}

    frames = [AppFrame.from_record(r) for r in records]
    logger.debug(f"Loaded {len(frames)} frames for animation")

    try:
        for f in frames:
            logger.debug(
                f"Frame id={f.id}, name='{f.name}', duration={f.duration_ms}ms"
            )
            [hex1, hex2, hex3, hex4, duration] = f.to_animation_hex()
            Bridge.notify(
                "load_frame",
                [
                    int(hex1, 16),
                    int(hex2, 16),
                    int(hex3, 16),
                    int(hex4, 16),
                    int(duration),
                ],
            )

        Bridge.call("play_animation")
        logger.info("play_animation called on board")

    except Exception as e:
        logger.warning(f"Failed to request play_animation: {e}")

    return {"ok": True, "frames_played": len(frames)}


def stop_animation():
    """Stop any running animation on the board.

    This endpoint calls the sketch provider `stop_animation`. No payload
    required.

    Returns:
        dict: {'ok': True} on success, {'error': str} on failure.
    """
    try:
        Bridge.call("stop_animation")
        logger.info("stop_animation called on board")
        return {'ok': True}
    except Exception as e:
        logger.warning(f"Failed to request stop_animation: {e}")
        return {'error': str(e)}


ui.expose_api('POST', '/update_board', update_board)
ui.expose_api('POST', '/persist_frame', persist_frame)
ui.expose_api('POST', '/load_frame', load_frame)
ui.expose_api('GET', '/list_frames', list_frames)
ui.expose_api('POST', '/get_frame', get_frame)
ui.expose_api('POST', '/delete_frames', delete_frames)
ui.expose_api('POST', '/transform_frame', transform_frame)
ui.expose_api('POST', '/export_frames', export_frames)
ui.expose_api('POST', '/reorder_frames', reorder_frames)
ui.expose_api('POST', '/play_animation', play_animation)
ui.expose_api('POST', '/stop_animation', stop_animation)
ui.expose_api('GET', '/config', get_config)

App.run()
