# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

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
    # Calculate next position
    mx_rows = db.read("frames", columns=["MAX(position) as maxpos"]) or []
    maxpos = mx_rows[0].get("maxpos") if mx_rows and len(mx_rows) > 0 else None
    next_position = (int(maxpos) if maxpos is not None else 0) + 1
    
    # Use frame.position if set, otherwise use next_position
    position = frame.position if frame.position is not None else next_position
    
    record = frame.to_record()
    record['position'] = position
    # Remove id from record (will be auto-assigned)
    record.pop('id', None)
    
    db.store("frames", record, create_table=False)
    
    last = db.execute_sql("SELECT last_insert_rowid() as id")
    new_id = last[0].get("id") if last else None
    
    # Backend responsibility: assign progressive name if empty
    if new_id and (not frame.name or frame.name.strip() == ''):
        frame.name = f'Frame {new_id}'
        frame.id = new_id
        db.update("frames", {"name": frame.name}, condition=f"id = {new_id}")
    
    return new_id


def update_frame(frame: AppFrame) -> bool:
    """Update an existing frame in DB.
    
    Args:
        frame (AppFrame): frame to update (must have valid id)
        
    Returns:
        bool: True if update succeeded
    """
    if frame.id is None:
        raise ValueError("Cannot update frame without id")
    
    record = frame.to_record()
    # Remove id from update dict (used in WHERE clause)
    fid = record.pop('id')
    
    db.update("frames", record, condition=f"id = {int(fid)}")
    return True


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

def delete_frame(fid: int) -> bool:
    """Delete a frame and recompact positions.
    
    Args:
        fid (int): frame id to delete
        
    Returns:
        bool: True if deletion succeeded
    """
    db.delete("frames", condition=f"id = {int(fid)}")
    # Recompact positions
    rows = db.read("frames", order_by="position ASC, id ASC") or []
    for pos, r in enumerate(rows, start=1):
        db.update("frames", {"position": pos}, condition=f"id = {int(r.get('id'))}")
    return True


def delete_frames(fids: list[int]) -> bool:
    """Delete multiple frames and recompact positions.
    
    Args:
        fids (list[int]): list of frame ids to delete
        
    Returns:
        bool: True if deletion succeeded
    """
    if not fids:
        return True
    
    id_list_str = ', '.join(map(str, map(int, fids)))
    condition = f"id IN ({id_list_str})"
    
    db.delete("frames", condition=condition)
    
    # Recompact positions
    rows = db.read("frames", order_by="position ASC, id ASC") or []
    for pos, r in enumerate(rows, start=1):
        db.update("frames", {"position": pos}, condition=f"id = {int(r.get('id'))}")
    return True



def reorder_frames(order: list[int]) -> bool:
    """Reorder frames by assigning new positions based on provided ID list.
    
    Args:
        order (list[int]): list of frame IDs in desired order
        
    Returns:
        bool: True if reorder succeeded
    """
    for idx, fid in enumerate(order, start=1):
        db.update("frames", {"position": idx}, condition=f"id = {int(fid)}")
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
    
    # Create empty frame with empty name (backend will assign Frame{id})
    frame = AppFrame.create_empty(
        id=None,
        name="",
        position=1,
        duration_ms=1000,
        brightness_levels=brightness_levels
    )
    
    # Backend assigns ID and name automatically
    frame.id = save_frame(frame)
    
    # Reload from DB to get the assigned name
    record = get_frame_by_id(frame.id)
    if record:
        return AppFrame.from_record(record)
    
    return frame
