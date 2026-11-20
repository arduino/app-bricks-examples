# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import threading

from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_utils.ledmatrix import FrameDesigner
from stored_frame import StoredFrame

DB_NAME = "led_matrix_frames"

db = SQLStore(database_name=DB_NAME)
# Held while a change takes more than one statement, e.g. reading the last id and adding a frame.
# It protects the requests of this app, which is the only process that writes to the database.
_lock = threading.RLock()


def init_db() -> None:
    """Start SQLStore and create the table of the app settings."""
    db.start()
    # Write-ahead logging: a commit appends to a log instead of rewriting the database file,
    # so saving a frame costs one sequential write instead of several synchronous ones.
    db.execute_sql("PRAGMA journal_mode=WAL")
    db.execute_sql("PRAGMA synchronous=NORMAL")
    db.create_table("settings", {"key": "TEXT PRIMARY KEY", "value": "TEXT"})


def get_setting(key: str, default: str) -> str:
    """The saved value of a setting, or the default."""
    rows = db.execute_sql("SELECT value FROM settings WHERE key = ?", (key,))
    return rows[0]["value"] if rows else default


def set_setting(key: str, value: str) -> None:
    """Save a setting, replacing its previous value."""
    with _lock:  # no other request can save the setting between the delete and the insert
        db.execute_sql("DELETE FROM settings WHERE key = ?", (key,))
        db.store("settings", {"key": key, "value": value}, create_table=False)


class FrameStore:
    """The frames of one matrix, in their own table.

    Every matrix has its own size and number of brightness levels, so its frames are kept apart:
    the frames drawn for one matrix never show up in the list of another. The template is the
    matrix the frames are validated against when they are read back.
    """

    def __init__(self, table: str, template: FrameDesigner) -> None:
        """Create the table of the frames, if missing. Call it after init_db().

        Args:
            table (str): name of the table. It is written into the SQL statements, so it must be a
                name chosen by the app, never text coming from a request.
            template (FrameDesigner): size and brightness levels of the frames in the table.
        """
        if not table.isidentifier():
            raise ValueError(f"Invalid table name: {table!r}")
        self.table = table
        self.template = template
        db.create_table(
            table,
            {
                "id": "INTEGER PRIMARY KEY",
                "name": "TEXT",
                "duration_ms": "INTEGER",
                "position": "INTEGER",
                "brightness_levels": "INTEGER",
                "rows": "TEXT",  # JSON string encoding of 2D array
            },
        )

    def _to_frames(self, records: list[dict] | None) -> list[StoredFrame]:
        return [StoredFrame.from_payload(r, self.template) for r in records or []]

    def list_frames(self) -> list[StoredFrame]:
        """All frames, in list order."""
        return self._to_frames(db.read(self.table, order_by="position, id"))

    def get(self, fid: int) -> StoredFrame | None:
        """The frame with this id, or None."""
        frames = self._to_frames(db.read(self.table, condition=f"id = {int(fid)}"))
        return frames[0] if frames else None

    def get_many(self, fids: list[int]) -> list[StoredFrame]:
        """The frames with these ids, in the given order; unknown ids are skipped."""
        frames = {sf.id: sf for sf in self.list_frames()}
        return [frames[fid] for fid in map(int, fids) if fid in frames]

    def save(self, sf: StoredFrame) -> StoredFrame:
        """Insert a frame without id, or update the frame with its id.

        A new frame gets the next id, goes after the last frame and, without a name, is named
        "Frame <id>". An update leaves the frame where it is: only reorder() moves frames.

        Raises:
            LookupError: if the frame has an id that is not in the table.
        """
        if sf.id is None:
            with _lock:  # no other frame can be created between reading the last frame and adding this one
                last = db.read(self.table, columns=["MAX(id) AS id", "MAX(position) AS position"])[0]
                sf.id = (last["id"] or 0) + 1
                sf.position = (last["position"] or 0) + 1
                if not sf.name.strip():
                    sf.name = f"Frame {sf.id}"
                db.store(self.table, sf.to_record(), create_table=False)
            return sf

        record = sf.to_record()
        # RETURNING yields the updated row: nothing comes back if the id is not in the table
        updated = db.execute_sql(
            f"UPDATE {self.table} SET name = ?, duration_ms = ?, brightness_levels = ?, rows = ? WHERE id = ? RETURNING position",
            (record["name"], record["duration_ms"], record["brightness_levels"], record["rows"], sf.id),
        )
        if not updated:
            raise LookupError(f"Frame {sf.id} not found")
        sf.position = updated[0]["position"]
        return sf

    def first_or_create(self) -> StoredFrame:
        """The last frame of the list, creating an empty one if there are none."""
        with _lock:  # two pages opening at the same time (e.g. the App Lab preview and a browser tab) create one frame
            frames = self.list_frames()
            return frames[-1] if frames else self.save(StoredFrame(self.template.empty()))

    def set_all_durations(self, duration_ms: int) -> None:
        """Set the same duration on every frame."""
        db.update(self.table, {"duration_ms": int(duration_ms)})

    def delete(self, fids: list[int]) -> None:
        """Delete frames. The others keep their positions: a gap does not change the order."""
        ids = ", ".join(str(int(fid)) for fid in fids)
        db.delete(self.table, condition=f"id IN ({ids})")

    def reorder(self, order: list[int]) -> None:
        """Give the listed frames positions 1..N in list order."""
        with _lock:  # two reorders at the same time do not mix their positions
            for position, fid in enumerate(order, start=1):
                db.update(self.table, {"position": position}, condition=f"id = {int(fid)}")
