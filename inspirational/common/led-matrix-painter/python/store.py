# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import threading

from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_utils.ledmatrix import FrameDesigner
from stored_frame import StoredFrame

DB_NAME = "led_matrix_frames"

db = SQLStore(database_name=DB_NAME)
_template = FrameDesigner()  # replaced by init_db with the app's matrix
# Held while a change takes more than one statement, e.g. reading the last id and adding a frame.
# It protects the requests of this app, which is the only process that writes to the database.
_lock = threading.RLock()


def init_db(template: FrameDesigner) -> None:
    """Start SQLStore and create the frames table.

    Args:
        template (FrameDesigner): matrix geometry and brightness levels of the stored frames.
    """
    global _template
    _template = template
    db.start()
    # Write-ahead logging: a commit appends to a log instead of rewriting the database file,
    # so saving a frame costs one sequential write instead of several synchronous ones.
    db.execute_sql("PRAGMA journal_mode=WAL")
    db.execute_sql("PRAGMA synchronous=NORMAL")
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
    frames = _to_frames(db.execute_sql("SELECT * FROM frames WHERE id = ?", (int(fid),)))
    return frames[0] if frames else None


def get_many(fids: list[int]) -> list[StoredFrame]:
    """The frames with these ids, in the given order; unknown ids are skipped."""
    frames = {sf.id: sf for sf in list_frames()}
    return [frames[fid] for fid in map(int, fids) if fid in frames]


def save(sf: StoredFrame) -> StoredFrame:
    """Insert a frame without id, or update the frame with its id.

    A new frame gets the next id, goes after the last frame and, without a name, is named
    "Frame <id>". An update leaves the frame where it is: only reorder() moves frames.

    Raises:
        LookupError: if the frame has an id that is not in the database.
    """
    if sf.id is None:
        with _lock:  # no other frame can be created between reading the last frame and adding this one
            last = db.read("frames", columns=["MAX(id) AS id", "MAX(position) AS position"])[0]
            sf.id = (last["id"] or 0) + 1
            sf.position = (last["position"] or 0) + 1
            if not sf.name.strip():
                sf.name = f"Frame {sf.id}"
            db.store("frames", sf.to_record(), create_table=False)
        return sf

    record = sf.to_record()
    # RETURNING yields the updated row: nothing comes back if the id is not in the table
    updated = db.execute_sql(
        "UPDATE frames SET name = ?, duration_ms = ?, brightness_levels = ?, rows = ? WHERE id = ? RETURNING position",
        (record["name"], record["duration_ms"], record["brightness_levels"], record["rows"], sf.id),
    )
    if not updated:
        raise LookupError(f"Frame {sf.id} not found")
    sf.position = updated[0]["position"]
    return sf


def first_or_create() -> StoredFrame:
    """The last frame of the list, creating an empty one if there are none."""
    with _lock:  # two pages opening at the same time (e.g. the App Lab preview and a browser tab) create one frame
        frames = list_frames()
        return frames[-1] if frames else save(StoredFrame(_template.empty()))


def set_all_durations(duration_ms: int) -> None:
    """Set the same duration on every frame."""
    db.update("frames", {"duration_ms": int(duration_ms)})


def delete(fids: list[int]) -> None:
    """Delete frames. The others keep their positions: a gap does not change the order."""
    ids = ", ".join(str(int(fid)) for fid in fids)
    db.delete("frames", condition=f"id IN ({ids})")


def reorder(order: list[int]) -> None:
    """Give the listed frames positions 1..N in list order."""
    with _lock:  # two reorders at the same time do not mix their positions
        for position, fid in enumerate(order, start=1):
            db.update("frames", {"position": position}, condition=f"id = {int(fid)}")
