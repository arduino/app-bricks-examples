# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import json

from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from app_frame import AppFrame
from typing import Any

DB_NAME = "led_matrix_frames"

# Initialize and expose a module-level SQLStore instance
db = SQLStore(database_name=DB_NAME)


def init_db():
    """Start SQLStore and create the frames table.

    Call this from the application startup (it is intentionally
    separated from module import so the application controls lifecycle).
    """
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
        }
    )
    print("[db_frames] SQLStore started for frames persistence")


def list_frames(order_by: str = "position ASC, id ASC") -> list[dict[str, Any]]:
    """Return ordered list of frame records (raw DB dicts).

    Returns:
        list[dict]: list of frame records with all fields
    """
    res = db.read("frames", order_by=order_by) or []
    return res


def get_frame_by_id(fid: int) -> dict[str, Any] | None:
    """Return the raw DB record dict for a frame id.

    Args:
        fid (int): frame id

    Returns:
        dict | None: raw DB record dict or None if not found
    """
    res = db.read("frames", condition=f"id = {int(fid)}") or []
    if not res:
        return None
    return res[0]


def save_frame(frame: AppFrame) -> int:
    """Insert a new frame into DB and return assigned ID.

    Backend is responsible for assigning progressive names if name is empty.

    Args:
        frame (AppFrame): frame to save (id will be ignored and assigned by DB)

    Returns:
        int: newly assigned frame ID
    """
    record = frame.to_record()
    # A single statement, so concurrent requests cannot interleave: the default position (after the
    # last frame) and the default name ("Frame <id>") are computed while the row is inserted. The id of
    # an INTEGER PRIMARY KEY is MAX(id) + 1, which is what the name subquery reads.
    res = db.execute_sql(
        "INSERT INTO frames (name, duration_ms, position, brightness_levels, rows) VALUES ("
        " CASE WHEN TRIM(?1) = '' THEN 'Frame ' || (SELECT COALESCE(MAX(id), 0) + 1 FROM frames) ELSE ?1 END,"
        " ?2, COALESCE(?3, (SELECT COALESCE(MAX(position), 0) + 1 FROM frames)), ?4, ?5"
        ") RETURNING id, name",
        (record['name'], record['duration_ms'], frame.position, record['brightness_levels'], record['rows']),
    )
    if not res:
        raise RuntimeError("Failed to retrieve the id assigned to the saved frame")
    frame.id = int(res[0]["id"])
    frame.name = res[0]["name"]
    return frame.id


def update_frame(frame: AppFrame) -> bool:
    """Update an existing frame in DB.

    Args:
        frame (AppFrame): frame to update (must have valid id)

    Returns:
        bool: True if the frame exists and was updated, False if no frame has that id
    """
    if frame.id is None:
        raise ValueError("Cannot update frame without id")

    record = frame.to_record()
    res = db.execute_sql(
        "UPDATE frames SET name = ?, duration_ms = ?, position = COALESCE(?, position), brightness_levels = ?, rows = ?"
        " WHERE id = ? RETURNING id",
        (record['name'], record['duration_ms'], record['position'], record['brightness_levels'], record['rows'], int(frame.id)),
    )
    return bool(res)


def bulk_update_frame_duration(duration) -> bool:
    """Update the duration of all frames.

    Args:
        duration (int): new duration in milliseconds

    Returns:
        bool: True if update succeeded
    """
    if duration < 1:
        raise ValueError("Valid duration must be provided for bulk update")
    db.update("frames", {"duration_ms": int(duration)})
    return True

def _compact_positions() -> None:
    """Renumber positions 1..N following the current order, in a single statement."""
    db.execute_sql(
        "UPDATE frames SET position = ranked.pos FROM"
        " (SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) AS pos FROM frames) AS ranked"
        " WHERE frames.id = ranked.id AND frames.position IS NOT ranked.pos"
    )


def delete_frames(fids: list[int]) -> bool:
    """Delete multiple frames and recompact positions.

    Args:
        fids (list[int]): list of frame ids to delete

    Returns:
        bool: True if deletion succeeded
    """
    if not fids:
        return True
    db.execute_sql("DELETE FROM frames WHERE id IN (SELECT value FROM json_each(?))", (json.dumps([int(f) for f in fids]),))
    _compact_positions()
    return True


def reorder_frames(order: list[int]) -> bool:
    """Reorder frames by assigning new positions based on provided ID list.

    Args:
        order (list[int]): list of frame IDs in desired order

    Returns:
        bool: True if reorder succeeded
    """
    # json_each yields the list index as "key": one statement updates every listed frame
    db.execute_sql(
        "UPDATE frames SET position = ordered.key + 1 FROM json_each(?) AS ordered WHERE frames.id = ordered.value",
        (json.dumps([int(f) for f in order]),),
    )
    return True


def get_last_frame() -> AppFrame | None:
    """Get the last frame (highest position) or None if no frames exist.

    Returns:
        AppFrame | None: last frame or None
    """
    records = db.read("frames", order_by="position DESC, id DESC") or []
    if not records:
        return None
    return AppFrame.from_record(records[0])


def get_or_create_active_frame(brightness_levels: int = 8) -> AppFrame:
    """Get last frame or create empty frame if none exist.

    Backend is responsible for assigning progressive names via save_frame().

    Args:
        brightness_levels (int): brightness levels for new frame (default 8)

    Returns:
        AppFrame: last existing frame or newly created empty frame
    """
    last = get_last_frame()
    if last is not None:
        return last

    # Insert the first frame only if the table is still empty: two pages opening at the same time
    # (e.g. the App Lab preview and a browser tab) must not create two frames.
    empty = AppFrame.create_empty(id=None, name="", position=1, duration_ms=1000, brightness_levels=brightness_levels)
    record = empty.to_record()
    db.execute_sql(
        "INSERT INTO frames (name, duration_ms, position, brightness_levels, rows)"
        " SELECT 'Frame ' || (SELECT COALESCE(MAX(id), 0) + 1 FROM frames), ?, 1, ?, ?"
        " WHERE NOT EXISTS (SELECT 1 FROM frames)",
        (record['duration_ms'], record['brightness_levels'], record['rows']),
    )
    last = get_last_frame()
    if last is None:
        raise RuntimeError("Failed to create the first frame")
    return last
