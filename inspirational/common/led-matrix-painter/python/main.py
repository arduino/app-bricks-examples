# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import struct
from collections import Counter

from fastapi import HTTPException

from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App, Bridge, Logger
from arduino.app_utils.ledmatrix import UNO_Q_MATRIX, Frame, FrameDesigner, sequence_to_c, to_c_array
from stored_frame import StoredFrame
import store

BRIGHTNESS_LEVELS = 8  # must match matrix.setGrayscaleBits(3) in sketch.ino
MAX_FRAMES = 300  # must match MAX_FRAMES in sketch.ino (animation buffer limit)
BOARD_TIMEOUT_S = 2  # a draw takes a few ms: waiting longer only delays the answer to the page
ANIMATION_CHUNK_FRAMES = 10  # 10 x 20 bytes per call, below the 256-byte RPC message limit of the sketch

# The matrix the app draws on: every frame is validated against it, and the page reads it from /config
template = FrameDesigner(*UNO_Q_MATRIX, brightness_levels=BRIGHTNESS_LEVELS)

TRANSFORMATIONS = {
    'invert': Frame.invert,
    'invert_not_null': Frame.invert_not_null,
    'rotate180': Frame.rotate180,
    'flip_h': Frame.flip_horizontally,
    'flip_v': Frame.flip_vertically,
}

logger = Logger("led-matrix-painter")
ui = WebUI()
store.init_db(template)
logger.info(f"Database initialized, matrix={template.width}x{template.height}, brightness_levels={BRIGHTNESS_LEVELS}")


def get_config():
    """Expose runtime configuration for the frontend."""
    return {'brightness_levels': template.brightness_levels, 'width': template.width, 'height': template.height}


def parse_frame(payload: dict) -> StoredFrame:
    """Build a frame from a request payload, answering 400 to malformed input."""
    try:
        sf = StoredFrame.from_payload(payload, template)
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid frame: {e}") from e
    if sf.duration_ms < 0:
        raise HTTPException(status_code=400, detail="Invalid frame: duration_ms must not be negative")
    return sf


def draw(sf: StoredFrame) -> bool:
    """Show a frame on the board, one byte per LED (the format of Arduino_LED_Matrix::draw).

    A board that does not answer must not fail the request that triggered the draw: the frame is
    already saved, so the error is logged and reported to the page as `board: false`.
    """
    try:
        Bridge.call("draw", sf.frame.to_bytes(), timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Board did not draw frame id={sf.id}: {e}")
        return False
    return True


def frame_response(sf: StoredFrame, board: bool | None = None) -> dict:
    """The answer of the endpoints that return a frame: the frame and its C code for the code panel."""
    response = {'ok': True, 'frame': sf.to_payload(), 'vector': to_c_array(sf.frame, sf.c_name)}
    if board is not None:
        response['board'] = board
    return response


def update_board(payload: dict):
    """Show a frame on the board without saving it (live preview while drawing).

    Expected payload: {rows, brightness_levels}
    """
    sf = parse_frame(payload)
    if not draw(sf):
        raise HTTPException(status_code=503, detail="The board is not responding")
    return {'ok': True, 'vector': to_c_array(sf.frame, sf.c_name)}


def persist_frame(payload: dict):
    """Save a frame (insert without id, update with id) and show it on the board.

    Expected payload: {rows, name, id, position, duration_ms, brightness_levels}
    """
    sf = parse_frame(payload)
    try:
        store.save(sf)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    logger.debug(f"Frame saved: id={sf.id}, name={sf.name}")
    return frame_response(sf, board=draw(sf))


def bulk_update_frame_duration(payload: dict):
    """Set the same duration on all frames.

    Payload: {duration_ms: int}
    """
    try:
        duration = int(payload['duration_ms'])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="duration_ms must be an integer") from None
    if duration < 0:
        raise HTTPException(status_code=400, detail="duration_ms must not be negative")
    store.set_all_durations(duration or 1000)  # 0 means the default duration, as for a single frame
    return {'ok': True}


def load_frame(payload: dict | None = None):
    """Load a frame for editing and show it on the board.

    Optional payload: {id: int}. Without an id, loads the last frame, creating an empty one if there are none.
    """
    fid = payload.get('id') if payload else None
    if fid is not None:
        sf = store.get(fid)
        if sf is None:
            raise HTTPException(status_code=404, detail=f"Frame {fid} not found")
    else:
        sf = store.first_or_create()
    logger.info(f"Frame loaded: id={sf.id}, name={sf.name}")
    return frame_response(sf, board=draw(sf))


def list_frames():
    """Return list of frames for the bottom panel."""
    return {'frames': [sf.to_payload() for sf in store.list_frames()]}


def delete_frames(payload: dict):
    """Delete multiple frames by ID."""
    fids = payload.get('ids', [])
    if not fids:
        raise HTTPException(status_code=400, detail="no frame ids provided")
    logger.info(f"Deleting frames: ids={fids}")
    store.delete(fids)
    return {'ok': True}


def reorder_frames(payload: dict):
    """Reorder frames to match provided id list order."""
    order = payload.get('order', [])
    logger.info(f"Reordering frames: new order={order}")
    store.reorder(order)
    return {'ok': True}


def transform_frame(payload: dict):
    """Apply a transformation to the frame being edited or to a saved frame.

    Payload: {op: str, rows: list} or {op: str, id: int}
    Operations: invert, invert_not_null, rotate180, flip_h, flip_v
    """
    op = payload.get('op')
    if op not in TRANSFORMATIONS:
        raise HTTPException(status_code=400, detail=f"unsupported op: {op}")
    if payload.get('rows') is not None:
        sf = parse_frame({'rows': payload['rows'], 'brightness_levels': payload.get('brightness_levels')})
    elif payload.get('id') is not None:
        sf = store.get(payload['id'])
        if sf is None:
            raise HTTPException(status_code=404, detail=f"Frame {payload['id']} not found")
    else:
        raise HTTPException(status_code=400, detail="id or rows required")
    TRANSFORMATIONS[op](sf.frame)
    logger.info(f"Transform applied: op={op}")
    # The page saves the transformed frame, which also shows it on the board
    return frame_response(sf)


def export_frames(payload: dict | None = None):
    """Export frames into a single C header string.

    Payload (optional): {frames: [id,...], animations: [{name, frames}]}
    - without animations: one uint8_t array per frame, for matrix.draw()
    - with animations: one uint32_t sequence per animation, for matrix.loadSequence()
    """
    payload = payload or {}
    frames = store.get_many(payload['frames']) if payload.get('frames') else store.list_frames()
    logger.info(f"Exporting {len(frames)} frames")

    # Names that become the same C identifier, e.g. "My Frame" and "my-frame", get an _id<N> suffix
    counts = Counter(sf.c_name for sf in frames)
    labels = {sf.id: sf.c_name if counts[sf.c_name] == 1 else f"{sf.c_name}_id{sf.id}" for sf in frames}

    parts = []
    animations = payload.get('animations')
    if animations:
        for anim in animations:
            anim_name = anim.get('name', 'Animation')
            anim_frames = [sf for sf in frames if sf.id in anim.get('frames', [])]
            if anim_frames:
                parts.append(f"// Animation: {anim_name}")
                parts.append(sequence_to_c([(sf.frame, sf.duration_ms, labels[sf.id]) for sf in anim_frames], anim_name))
    else:
        for sf in frames:
            parts.append(f"// {labels[sf.id]} (id {sf.id})")
            parts.append(to_c_array(sf.frame, labels[sf.id]))
    return {'header': "\n".join(parts).strip() + "\n"}


def play_animation(payload: dict):
    """Play frames as an animation on the board.

    Payload: {frames: [id,...]}
    """
    frame_ids = payload.get("frames", [])
    if not frame_ids:
        raise HTTPException(status_code=400, detail="no frames provided")
    if len(frame_ids) > MAX_FRAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Animation exceeds maximum frame limit ({MAX_FRAMES} frames). Please reduce the number of frames.",
        )
    frames = store.get_many(frame_ids)
    if not frames:
        raise HTTPException(status_code=404, detail="no valid frames found")
    logger.info(f"Playing animation: frame_count={len(frames)}")

    # Each frame is its pixel words (the format of Arduino_LED_Matrix::loadSequence) followed by the
    # duration, packed as little-endian uint32 like the sketch's animation buffer. Frames go in chunks
    # through calls: every chunk is acknowledged with the number of frames buffered so far, which paces
    # the transfer to the board and tells us whether all of them arrived.
    entries = [[*sf.frame.to_words(), sf.duration_ms] for sf in frames]
    try:
        Bridge.call("stop_animation", timeout=BOARD_TIMEOUT_S)  # also empties the animation buffer
        loaded = 0
        for i in range(0, len(entries), ANIMATION_CHUNK_FRAMES):
            words = [w for entry in entries[i:i + ANIMATION_CHUNK_FRAMES] for w in entry]
            loaded = Bridge.call("load_frames", struct.pack(f"<{len(words)}I", *words), timeout=BOARD_TIMEOUT_S)
        if loaded != len(entries):
            raise RuntimeError(f"the board buffered {loaded} of {len(entries)} frames")
        Bridge.call("play_animation", timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Failed to play the animation: {e}")
        raise HTTPException(status_code=503, detail=f"The board could not play the animation: {e}") from e
    return {"ok": True, "frames_played": len(frames), "loaded": loaded}


def stop_animation():
    """Stop any running animation on the board."""
    try:
        Bridge.call("stop_animation", timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Failed to request stop_animation: {e}")
        raise HTTPException(status_code=503, detail=f"The board could not stop the animation: {e}") from e
    return {'ok': True}


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
