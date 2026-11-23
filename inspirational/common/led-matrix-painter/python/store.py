# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_utils.ledmatrix import FrameDesigner
from stored_frame import StoredFrame

DB_NAME = "led_matrix_frames"

# The editor saves at every stroke: fast writes matter more than keeping the very last strokes
# if the board loses power. Nothing is lost when only the app stops.
db = SQLStore(database_name=DB_NAME, power_loss_safe=False)
_template = FrameDesigner()  # replaced by init_db with the app's matrix


def init_db(template: FrameDesigner) -> None:
    """Start SQLStore and create the frames table.

    Args:
        template (FrameDesigner): matrix geometry and brightness levels of the stored frames.
    """
    global _template
    _template = template
    db.start()
    db.create_table(
        "frames",
        {
            "id": "INTEGER PRIMARY KEY",
            "name": "TEXT",
            "duration_ms": "INTEGER",
            "position": "INTEGER",
            "brightness_levels": "INTEGER",
            "rows": "TEXT",  # JSON string encoding of 2D array
        },
    )


def _to_frames(records: list[dict] | None) -> list[StoredFrame]:
    return [StoredFrame.from_payload(r, _template) for r in records or []]


def list_frames() -> list[StoredFrame]:
    """All frames, in list order."""
    return _to_frames(db.read("frames", order_by="position, id"))


def get(fid: int) -> StoredFrame | None:
    """The frame with this id, or None."""
    frames = _to_frames(db.read("frames", condition="id = ?", args=(int(fid),)))
    return frames[0] if frames else None


def get_many(fids: list[int]) -> list[StoredFrame]:
    """The frames with these ids, in the given order; unknown ids are skipped."""
    frames = {sf.id: sf for sf in list_frames()}
    return [frames[fid] for fid in map(int, fids) if fid in frames]


def save(sf: StoredFrame) -> StoredFrame:
    """Insert a frame without id, or update the frame with its id.

    A new frame gets its id from the database, goes after the last frame and, without a name, is
    named "Frame <id>". An update leaves the frame where it is: only reorder() moves frames.

    Raises:
        LookupError: if the frame has an id that is not in the database.
    """
    if sf.id is None:
        # One transaction: no other frame can take the same position, and the frame is never
        # saved without its name
        with db.transaction():
            last = db.read("frames", columns=["MAX(position) AS position"])[0]
            sf.position = (last["position"] or 0) + 1
            sf.id = db.store("frames", sf.to_record(), create_table=False)
            if not sf.name.strip():
                sf.name = f"Frame {sf.id}"
                db.update("frames", {"name": sf.name}, condition="id = ?", args=(sf.id,))
        return sf

    record = sf.to_record()
    changes = {key: record[key] for key in ("name", "duration_ms", "brightness_levels", "rows")}
    if db.update("frames", changes, condition="id = ?", args=(sf.id,)) == 0:
        raise LookupError(f"Frame {sf.id} not found")
    sf.position = db.read("frames", columns=["position"], condition="id = ?", args=(sf.id,))[0]["position"]
    return sf


def first_or_create() -> StoredFrame:
    """The last frame of the list, creating an empty one if there are none."""
    # One transaction: two pages opening at the same time (e.g. the App Lab preview and a browser tab) create one frame
    with db.transaction():
        frames = list_frames()
        return frames[-1] if frames else save(StoredFrame(_template.empty()))


def set_all_durations(duration_ms: int) -> None:
    """Set the same duration on every frame."""
    db.update("frames", {"duration_ms": int(duration_ms)})


def delete(fids: list[int]) -> None:
    """Delete frames. The others keep their positions: a gap does not change the order."""
    with db.transaction():  # all the frames are deleted, or none
        for fid in fids:
            db.delete("frames", condition="id = ?", args=(int(fid),))


def reorder(order: list[int]) -> None:
    """Give the listed frames positions 1..N in list order."""
    with db.transaction():  # the new order is saved as a whole, in one write to disk
        for position, fid in enumerate(order, start=1):
            db.update("frames", {"position": position}, condition="id = ?", args=(int(fid),))
