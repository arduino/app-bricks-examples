# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import json

from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_utils.ledmatrix import FrameDesigner
from stored_frame import StoredFrame

DB_NAME = "led_matrix_frames"

db = SQLStore(database_name=DB_NAME)
_template = FrameDesigner()  # replaced by init_db with the app's matrix


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
    return _to_frames(db.read("frames", order_by="position ASC, id ASC"))


def get(fid: int) -> StoredFrame | None:
    """The frame with this id, or None."""
    frames = _to_frames(db.execute_sql("SELECT * FROM frames WHERE id = ?", (int(fid),)))
    return frames[0] if frames else None


def get_many(fids: list[int]) -> list[StoredFrame]:
    """The frames with these ids, in the given order; unknown ids are skipped."""
    return _to_frames(
        db.execute_sql(
            "SELECT frames.* FROM json_each(?) AS wanted JOIN frames ON frames.id = wanted.value ORDER BY wanted.key",
            (json.dumps([int(f) for f in fids]),),
        )
    )


def save(sf: StoredFrame) -> StoredFrame:
    """Insert a frame without id, or update the frame with its id.

    A new frame without a name is named "Frame <id>", and without a position goes after the last
    frame. Both are computed by the INSERT itself, so concurrent requests cannot interleave: the id
    of an INTEGER PRIMARY KEY is MAX(id) + 1, which is what the name subquery reads.

    Raises:
        LookupError: if the frame has an id that is not in the database.
    """
    record = sf.to_record()
    if sf.id is None:
        res = db.execute_sql(
            "INSERT INTO frames (name, duration_ms, position, brightness_levels, rows) VALUES ("
            " CASE WHEN TRIM(?1) = '' THEN 'Frame ' || (SELECT COALESCE(MAX(id), 0) + 1 FROM frames) ELSE ?1 END,"
            " ?2, COALESCE(?3, (SELECT COALESCE(MAX(position), 0) + 1 FROM frames)), ?4, ?5"
            ") RETURNING id, name, position",
            (record["name"], record["duration_ms"], record["position"], record["brightness_levels"], record["rows"]),
        )
    else:
        res = db.execute_sql(
            "UPDATE frames SET name = ?, duration_ms = ?, position = COALESCE(?, position), brightness_levels = ?, rows = ?"
            " WHERE id = ? RETURNING id, name, position",
            (record["name"], record["duration_ms"], record["position"], record["brightness_levels"], record["rows"], sf.id),
        )
    if not res:
        raise LookupError(f"Frame {sf.id} not found")
    sf.id, sf.name, sf.position = int(res[0]["id"]), res[0]["name"], res[0]["position"]
    return sf


def first_or_create() -> StoredFrame:
    """The last frame of the list, creating an empty one if there are none.

    The empty frame is inserted only if the table is still empty: two pages opening at the same
    time (e.g. the App Lab preview and a browser tab) must not create two frames.
    """
    empty = StoredFrame(_template.empty()).to_record()
    db.execute_sql(
        "INSERT INTO frames (name, duration_ms, position, brightness_levels, rows)"
        " SELECT 'Frame ' || (SELECT COALESCE(MAX(id), 0) + 1 FROM frames), ?, 1, ?, ?"
        " WHERE NOT EXISTS (SELECT 1 FROM frames)",
        (empty["duration_ms"], empty["brightness_levels"], empty["rows"]),
    )
    frames = _to_frames(db.execute_sql("SELECT * FROM frames ORDER BY position DESC, id DESC LIMIT 1"))
    if not frames:
        raise RuntimeError("Failed to create the first frame")
    return frames[0]


def set_all_durations(duration_ms: int) -> None:
    """Set the same duration on every frame."""
    db.update("frames", {"duration_ms": int(duration_ms)})


def delete(fids: list[int]) -> None:
    """Delete frames, then renumber the positions 1..N."""
    if not fids:
        return
    db.execute_sql("DELETE FROM frames WHERE id IN (SELECT value FROM json_each(?))", (json.dumps([int(f) for f in fids]),))
    db.execute_sql(
        "UPDATE frames SET position = ranked.pos FROM"
        " (SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) AS pos FROM frames) AS ranked"
        " WHERE frames.id = ranked.id AND frames.position IS NOT ranked.pos"
    )


def reorder(order: list[int]) -> None:
    """Give the listed frames positions 1..N in list order."""
    # json_each yields the list index as "key": one statement updates every listed frame
    db.execute_sql(
        "UPDATE frames SET position = ordered.key + 1 FROM json_each(?) AS ordered WHERE frames.id = ordered.value",
        (json.dumps([int(f) for f in order]),),
    )
