# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from collections import Counter

from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App, Bridge, Logger
from arduino.app_utils.ledmatrix import Frame
from matrices import DEFAULT_MATRIX, MATRICES, Matrix
from store import FrameStore
from stored_frame import StoredFrame
import store

MAX_FRAMES = 300  # must match MAX_FRAMES in sketch.ino (animation buffer limit)
BOARD_TIMEOUT_S = 2  # a draw takes a few ms: waiting longer only delays the answer to the page
MATRIX_SETTING = "matrix"  # the setting that remembers the selected matrix across restarts

TRANSFORMATIONS = {
    'invert': Frame.invert,
    'invert_not_null': Frame.invert_not_null,
    'rotate180': Frame.rotate180,
    'flip_h': Frame.flip_horizontally,
    'flip_v': Frame.flip_vertically,
}

logger = Logger("led-matrix-painter")
ui = WebUI()
store.init_db()

# Each matrix keeps its frames in its own table. The page works on one matrix at a time, the
# selected one: every endpoint reads and writes its table and draws on it.
stores = {key: FrameStore(matrix.table, matrix.template) for key, matrix in MATRICES.items()}
selected: Matrix = MATRICES.get(store.get_setting(MATRIX_SETTING, DEFAULT_MATRIX), MATRICES[DEFAULT_MATRIX])
logger.info(f"Database initialized, selected matrix: {selected.label}")


def get_config():
    """Expose runtime configuration for the frontend: the selected matrix and the available ones."""
    return {
        'matrix': selected.key,
        'width': selected.template.width,
        'height': selected.template.height,
        'brightness_levels': selected.template.brightness_levels,
        'matrices': [{'key': matrix.key, 'label': matrix.label} for matrix in MATRICES.values()],
    }


def select_matrix(payload: dict):
    """Select the matrix to draw on: the page then lists and edits the frames of that matrix.

    Payload: {matrix: str}, one of the keys listed by /config. Answers the new configuration.
    """
    global selected
    key = payload.get('matrix')
    matrix = MATRICES.get(key) if isinstance(key, str) else None
    if matrix is None:
        return {'error': f"unknown matrix: {key}"}
    if matrix is not selected:
        # Leave the previous matrix off: nothing is drawing on it anymore. Best effort, like any draw.
        try:
            Bridge.call("stop_animation", timeout=BOARD_TIMEOUT_S)
        except Exception as e:
            logger.warning(f"Failed to stop the animation before changing matrix: {e}")
        draw(selected, StoredFrame(selected.template.empty()))
        selected = matrix
        store.set_setting(MATRIX_SETTING, matrix.key)
        logger.info(f"Selected matrix: {matrix.label}")
    return get_config()


def parse_frame(matrix: Matrix, payload: dict) -> StoredFrame:
    """Build a frame for a matrix from a request payload.

    Raises:
        ValueError: on missing or malformed fields, with a message for the page.
    """
    try:
        sf = StoredFrame.from_payload(payload, matrix.template)
    except (KeyError, TypeError, ValueError) as e:
        raise ValueError(f"Invalid frame: {e}") from e
    if sf.duration_ms < 0:
        raise ValueError("Invalid frame: duration_ms must not be negative")
    return sf


def draw(matrix: Matrix, sf: StoredFrame) -> bool:
    """Show a frame on a matrix, in the format of its Arduino library.

    A matrix that does not answer must not fail the request that triggered the draw: the frame is
    already saved, so the error is logged and reported to the page as `board: false`. The provider
    of a matrix that can be unplugged answers False when the matrix is not connected.
    """
    try:
        drawn = Bridge.call(matrix.draw_provider, matrix.draw_payload(sf.frame), timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"{matrix.label} did not draw frame id={sf.id}: {e}")
        return False
    if drawn is False:
        logger.warning(f"{matrix.label} is not connected, frame id={sf.id} not drawn")
        return False
    return True


def frame_response(matrix: Matrix, sf: StoredFrame, board: bool | None = None) -> dict:
    """The answer of the endpoints that return a frame: the frame and its C code for the code panel."""
    response = {'ok': True, 'frame': sf.to_payload(), 'vector': matrix.frame_to_c(sf.frame, sf.c_name)}
    if board is not None:
        response['board'] = board
    return response


def update_board(payload: dict):
    """Show a frame on the selected matrix without saving it (live preview while drawing).

    Expected payload: {rows, brightness_levels}
    """
    matrix = selected
    try:
        sf = parse_frame(matrix, payload)
    except ValueError as e:
        return {'error': str(e)}
    if not draw(matrix, sf):
        return {'error': f"{matrix.label} is not responding"}
    return {'ok': True, 'vector': matrix.frame_to_c(sf.frame, sf.c_name)}


def persist_frame(payload: dict):
    """Save a frame (insert without id, update with id) and show it on the selected matrix.

    Expected payload: {rows, name, id, position, duration_ms, brightness_levels}
    """
    matrix = selected
    try:
        sf = stores[matrix.key].save(parse_frame(matrix, payload))
    except (ValueError, LookupError) as e:
        return {'error': str(e)}
    logger.debug(f"Frame saved: id={sf.id}, name={sf.name}")
    return frame_response(matrix, sf, board=draw(matrix, sf))


def bulk_update_frame_duration(payload: dict):
    """Set the same duration on all frames of the selected matrix.

    Payload: {duration_ms: int}
    """
    try:
        duration = int(payload['duration_ms'])
    except (KeyError, TypeError, ValueError):
        return {'error': "duration_ms must be an integer"}
    if duration < 0:
        return {'error': "duration_ms must not be negative"}
    stores[selected.key].set_all_durations(duration or 1000)  # 0 means the default duration, as for a single frame
    return {'ok': True}


def load_frame(payload: dict | None = None):
    """Load a frame for editing and show it on the selected matrix.

    Optional payload: {id: int}. Without an id, loads the last frame, creating an empty one if there are none.
    """
    matrix = selected
    fid = payload.get('id') if payload else None
    if fid is not None:
        sf = stores[matrix.key].get(fid)
        if sf is None:
            return {'error': f"Frame {fid} not found"}
    else:
        sf = stores[matrix.key].first_or_create()
    logger.info(f"Frame loaded: id={sf.id}, name={sf.name}")
    return frame_response(matrix, sf, board=draw(matrix, sf))


def list_frames():
    """Return the frames of the selected matrix for the bottom panel.

    The answer names the matrix, so a page that was showing another one can tell and reload.
    """
    matrix = selected
    return {'matrix': matrix.key, 'frames': [sf.to_payload() for sf in stores[matrix.key].list_frames()]}


def delete_frames(payload: dict):
    """Delete multiple frames by ID."""
    fids = payload.get('ids', [])
    if not fids:
        return {'error': "no frame ids provided"}
    logger.info(f"Deleting frames: ids={fids}")
    stores[selected.key].delete(fids)
    return {'ok': True}


def reorder_frames(payload: dict):
    """Reorder frames to match provided id list order."""
    order = payload.get('order', [])
    logger.info(f"Reordering frames: new order={order}")
    stores[selected.key].reorder(order)
    return {'ok': True}


def transform_frame(payload: dict):
    """Apply a transformation to the frame being edited or to a saved frame.

    Payload: {op: str, rows: list} or {op: str, id: int}
    Operations: invert, invert_not_null, rotate180, flip_h, flip_v
    """
    matrix = selected
    op = payload.get('op')
    if op not in TRANSFORMATIONS:
        return {'error': f"unsupported op: {op}"}
    if payload.get('rows') is not None:
        try:
            sf = parse_frame(matrix, {'rows': payload['rows'], 'brightness_levels': payload.get('brightness_levels')})
        except ValueError as e:
            return {'error': str(e)}
    elif payload.get('id') is not None:
        sf = stores[matrix.key].get(payload['id'])
        if sf is None:
            return {'error': f"Frame {payload['id']} not found"}
    else:
        return {'error': "id or rows required"}
    TRANSFORMATIONS[op](sf.frame)
    logger.info(f"Transform applied: op={op}")
    # The page saves the transformed frame, which also shows it on the board
    return frame_response(matrix, sf)


def export_frames(payload: dict | None = None):
    """Export frames of the selected matrix into a single C header string.

    Payload (optional): {frames: [id,...], animations: [{name, frames}]}
    - without animations: one array per frame
    - with animations: one sequence per animation
    The arrays are in the formats of the Arduino library of the matrix, see matrices.py.
    """
    matrix = selected
    payload = payload or {}
    frames = stores[matrix.key].get_many(payload['frames']) if payload.get('frames') else stores[matrix.key].list_frames()
    logger.info(f"Exporting {len(frames)} frames for {matrix.label}")

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
                parts.append(matrix.animation_to_c([(sf.frame, sf.duration_ms, labels[sf.id]) for sf in anim_frames], anim_name))
    else:
        for sf in frames:
            parts.append(f"// {labels[sf.id]} (id {sf.id})")
            parts.append(matrix.frame_to_c(sf.frame, labels[sf.id]))
    return {'header': "\n".join(parts).strip() + "\n"}


def play_animation(payload: dict):
    """Play frames as an animation on the selected matrix.

    Payload: {frames: [id,...]}
    """
    matrix = selected
    frame_ids = payload.get("frames", [])
    if not frame_ids:
        return {'error': "no frames provided"}
    if len(frame_ids) > MAX_FRAMES:
        return {'error': f"Animation exceeds maximum frame limit ({MAX_FRAMES} frames). Please reduce the number of frames."}
    frames = stores[matrix.key].get_many(frame_ids)
    if not frames:
        return {'error': "no valid frames found"}
    logger.info(f"Playing animation on {matrix.label}: frame_count={len(frames)}")

    # Each frame goes to the sketch's animation buffer with its duration, in the format of the matrix.
    # Frames go in chunks through calls: every chunk is acknowledged with the number of frames buffered
    # so far, which paces the transfer to the board and tells us whether all of them arrived.
    entries = [matrix.animation_entry(sf.frame, sf.duration_ms) for sf in frames]
    try:
        Bridge.call("stop_animation", timeout=BOARD_TIMEOUT_S)  # also empties the animation buffer
        loaded = 0
        for i in range(0, len(entries), matrix.chunk_frames):
            loaded = Bridge.call(matrix.load_provider, b"".join(entries[i:i + matrix.chunk_frames]), timeout=BOARD_TIMEOUT_S)
            if loaded == -1:  # the answer of a matrix that can be unplugged, when it is
                raise RuntimeError(f"{matrix.label} is not connected")
        if loaded != len(entries):
            raise RuntimeError(f"the board buffered {loaded} of {len(entries)} frames")
        Bridge.call("play_animation", timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Failed to play the animation: {e}")
        return {'error': f"The board could not play the animation: {e}"}
    return {"ok": True, "frames_played": len(frames), "loaded": loaded}


def stop_animation():
    """Stop any running animation on the board."""
    try:
        Bridge.call("stop_animation", timeout=BOARD_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"Failed to request stop_animation: {e}")
        return {'error': f"The board could not stop the animation: {e}"}
    return {'ok': True}


ui.expose_api('GET', '/config', get_config)
ui.expose_api('POST', '/select_matrix', select_matrix)
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

App.run()
