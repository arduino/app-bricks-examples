# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import struct

from fastapi import HTTPException

from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App, Bridge, FrameDesigner, Logger
from app_frame import AppFrame  # user module defining AppFrame
import store  # user module for DB operations

BRIGHTNESS_LEVELS = 8  # must match the frontend slider range (0..BRIGHTNESS_LEVELS-1)
MAX_FRAMES = 300  # must match MAX_FRAMES in sketch.ino (animation buffer limit)
BOARD_TIMEOUT_S = 2  # a draw takes a few ms: waiting longer only delays the answer to the page
ANIMATION_CHUNK_FRAMES = 10  # 10 x 20 bytes per call, below the 256-byte RPC message limit of the sketch

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


def parse_frame(payload: dict) -> AppFrame:
    """Build a frame from a request payload, answering 400 to malformed input."""
    try:
        frame = AppFrame.from_json(payload)
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid frame: {e}") from e
    if frame.duration_ms < 0:
        raise HTTPException(status_code=400, detail="Invalid frame: duration_ms must not be negative")
    return frame


def apply_frame_to_board(frame: AppFrame) -> bool:
    """Send frame bytes to the Arduino board.

    A board that does not answer must not fail the request that triggered the draw: the frame is
    already saved, so the error is logged and reported to the page as `board: false`.
    """
    frame_bytes = frame.to_board_bytes()
    try:
        Bridge.call("draw", frame_bytes, timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Board did not draw frame id={frame.id}: {e}")
        return False
    logger.debug(f"Frame sent to board: id={frame.id}, bytes_len={len(frame_bytes)}")
    return True


def update_board(payload: dict):
    """Update board display in real-time without persisting to DB.

    Used for live preview during editing.
    Expected payload: {rows, name, id, position, duration_ms, brightness_levels}
    """
    frame = parse_frame(payload)
    if not apply_frame_to_board(frame):
        raise HTTPException(status_code=503, detail="The board is not responding")
    return {'ok': True, 'vector': frame.to_c_string()}


def persist_frame(payload: dict):
    """Persist frame to DB (insert new or update existing).

    Backend (store.save_frame) is responsible for assigning progressive names.

    Expected payload: {rows, name, id, position, duration_ms, brightness_levels}
    """
    frame = parse_frame(payload)

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
        if not store.update_frame(frame):
            raise HTTPException(status_code=404, detail=f"Frame {frame.id} not found")

    board = apply_frame_to_board(frame)
    return {'ok': True, 'board': board, 'frame': frame.to_json(), 'vector': frame.to_c_string()}


def bulk_update_frame_duration(payload: dict):
    """Update the duration of all frames with a single statement.

    Payload: {duration_ms: int}
    """
    try:
        duration = int(payload.get('duration_ms'))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="duration_ms must be an integer") from None
    if duration < 0:
        raise HTTPException(status_code=400, detail="duration_ms must not be negative")
    logger.debug(f"Bulk updating frame duration: duration={duration}")
    store.bulk_update_frame_duration(duration)
    return {'ok': True}


def load_frame(payload: dict | None = None):
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
            raise HTTPException(status_code=404, detail=f"Frame {fid} not found")
        frame = AppFrame.from_record(record)
        logger.info(f"Frame loaded: id={frame.id}, name={frame.name}")
    else:
        # Get last frame or create empty
        logger.debug("Loading last frame or creating empty")
        frame = store.get_or_create_active_frame(brightness_levels=BRIGHTNESS_LEVELS)
        logger.info(f"Active frame ready: id={frame.id}, name={frame.name}")

    board = apply_frame_to_board(frame)
    return {'ok': True, 'board': board, 'frame': frame.to_json(), 'vector': frame.to_c_string()}


def list_frames():
    """Return list of frames for sidebar."""
    records = store.list_frames(order_by='position ASC, id ASC')
    frames = [AppFrame.from_record(r).to_json() for r in records]
    return {'frames': frames}


def delete_frames(payload: dict):
    """Delete multiple frames by ID."""
    fids = payload.get('ids', [])
    if not fids:
        raise HTTPException(status_code=400, detail="no frame ids provided")
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
        raise HTTPException(status_code=400, detail="op required")

    # Load frame from rows or by ID
    rows = payload.get('rows')
    if rows is not None:
        frame = AppFrame.from_json({'rows': rows, 'brightness_levels': BRIGHTNESS_LEVELS})
        logger.debug(f"Transforming frame from rows: op={op}")
    else:
        fid = payload.get('id')
        if fid is None:
            raise HTTPException(status_code=400, detail="id or rows required")
        record = store.get_frame_by_id(fid)
        if not record:
            raise HTTPException(status_code=404, detail=f"Frame {fid} not found")
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
        raise HTTPException(status_code=400, detail=f"unsupported op: {op}")

    options = payload.get('options', {})
    operations[op](frame, **options)
    logger.info(f"Transform applied: op={op}")

    # Return transformed frame (frontend will handle board update via persist)
    return {'ok': True, 'frame': frame.to_json(), 'vector': frame.to_c_string()}


def export_frames(payload: dict | None = None):
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

    # Build frame objects and make their C identifiers unique. Duplicates are counted on the
    # sanitized names (AppFrame computes them from the user-defined ones), so names that differ
    # only by case or punctuation, e.g. "My Frame" and "my-frame", are disambiguated as well.
    frames = [AppFrame.from_record(r) for r in records]
    export_names = {}  # sanitized name -> count
    for frame in frames:
        export_names[frame._export_name] = export_names.get(frame._export_name, 0) + 1
    for frame in frames:
        if export_names[frame._export_name] > 1:
            # Duplicate detected, use _idN suffix for uniqueness
            frame._export_name = f"{frame._export_name}_id{frame.id}"
            logger.debug(f"Duplicate name '{frame.name}' -> '{frame._export_name}'")

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
        raise HTTPException(status_code=400, detail="no frames provided")

    # Check frame count against sketch buffer limit
    if len(frame_ids) > MAX_FRAMES:
        logger.error(f"Too many frames for animation: {len(frame_ids)} > {MAX_FRAMES}")
        raise HTTPException(
            status_code=400,
            detail=f"Animation exceeds maximum frame limit ({MAX_FRAMES} frames). Please reduce the number of frames.",
        )

    records = [store.get_frame_by_id(fid) for fid in frame_ids]
    frames = [AppFrame.from_record(r) for r in records if r is not None]
    if not frames:
        logger.warning("No valid frames found for animation")
        raise HTTPException(status_code=404, detail="no valid frames found")
    logger.info(f"Playing animation: frame_count={len(frames)}")

    # Each frame is 4 pixel words + its duration, packed as 5 little-endian uint32 (the layout of the
    # sketch's animation buffer). Frames go in chunks through calls, not one notify per frame: every
    # chunk is acknowledged with the number of frames buffered so far, which paces the transfer to
    # the board and tells us whether all of them arrived.
    entries = [[int(word, 16) for word in f.to_animation_hex()[:4]] + [int(f.duration_ms)] for f in frames]
    try:
        Bridge.call("stop_animation", timeout=BOARD_TIMEOUT_S)  # also empties the animation buffer
        loaded = 0
        for i in range(0, len(entries), ANIMATION_CHUNK_FRAMES):
            chunk = entries[i:i + ANIMATION_CHUNK_FRAMES]
            loaded = Bridge.call("load_frames", struct.pack(f"<{5 * len(chunk)}I", *(v for e in chunk for v in e)), timeout=BOARD_TIMEOUT_S)
        if loaded != len(entries):
            raise RuntimeError(f"the board buffered {loaded} of {len(entries)} frames")
        Bridge.call("play_animation", timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Failed to play the animation: {e}")
        raise HTTPException(status_code=503, detail=f"The board could not play the animation: {e}") from e
    logger.info(f"Animation started on board: frames={loaded}")
    return {"ok": True, "frames_played": len(frames), "loaded": loaded}


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
ui.expose_api('POST', '/delete_frames', delete_frames)
ui.expose_api('POST', '/transform_frame', transform_frame)
ui.expose_api('POST', '/export_frames', export_frames)
ui.expose_api('POST', '/reorder_frames', reorder_frames)
ui.expose_api('POST', '/bulk_update_duration', bulk_update_frame_duration)
ui.expose_api('POST', '/play_animation', play_animation)
ui.expose_api('POST', '/stop_animation', stop_animation)
ui.expose_api('GET', '/config', get_config)

App.run()
