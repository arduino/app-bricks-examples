# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

import json

from arduino.app_bricks.dbstorage_sqlstore import SQLStore
from arduino.app_utils.ledmatrix import FrameDesigner
from stored_frame import StoredFrame

DB_NAME = "led_matrix_frames"

db = SQLStore(database_name=DB_NAME)


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
    db.execute_sql(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


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
        return self._to_frames(db.read(self.table, order_by="position ASC, id ASC"))

    def get(self, fid: int) -> StoredFrame | None:
        """The frame with this id, or None."""
        frames = self._to_frames(db.execute_sql(f"SELECT * FROM {self.table} WHERE id = ?", (int(fid),)))
        return frames[0] if frames else None

    def get_many(self, fids: list[int]) -> list[StoredFrame]:
        """The frames with these ids, in the given order; unknown ids are skipped."""
        return self._to_frames(
            db.execute_sql(
                f"SELECT f.* FROM json_each(?) AS wanted JOIN {self.table} AS f ON f.id = wanted.value ORDER BY wanted.key",
                (json.dumps([int(f) for f in fids]),),
            )
        )

    def save(self, sf: StoredFrame) -> StoredFrame:
        """Insert a frame without id, or update the frame with its id.

        A new frame without a name is named "Frame <id>", and without a position goes after the last
        frame. Both are computed by the INSERT itself, so concurrent requests cannot interleave: the id
        of an INTEGER PRIMARY KEY is MAX(id) + 1, which is what the name subquery reads.

        Raises:
            LookupError: if the frame has an id that is not in the table.
        """
        record = sf.to_record()
        if sf.id is None:
            res = db.execute_sql(
                f"INSERT INTO {self.table} (name, duration_ms, position, brightness_levels, rows) VALUES ("
                f" CASE WHEN TRIM(?1) = '' THEN 'Frame ' || (SELECT COALESCE(MAX(id), 0) + 1 FROM {self.table}) ELSE ?1 END,"
                f" ?2, COALESCE(?3, (SELECT COALESCE(MAX(position), 0) + 1 FROM {self.table})), ?4, ?5"
                ") RETURNING id, name, position",
                (record["name"], record["duration_ms"], record["position"], record["brightness_levels"], record["rows"]),
            )
        else:
            res = db.execute_sql(
                f"UPDATE {self.table} SET name = ?, duration_ms = ?, position = COALESCE(?, position), brightness_levels = ?, rows = ?"
                " WHERE id = ? RETURNING id, name, position",
                (record["name"], record["duration_ms"], record["position"], record["brightness_levels"], record["rows"], sf.id),
            )
        if not res:
            raise LookupError(f"Frame {sf.id} not found")
        sf.id, sf.name, sf.position = int(res[0]["id"]), res[0]["name"], res[0]["position"]
        return sf

    def first_or_create(self) -> StoredFrame:
        """The last frame of the list, creating an empty one if there are none.

        The empty frame is inserted only if the table is still empty: two pages opening at the same
        time (e.g. the App Lab preview and a browser tab) must not create two frames.
        """
        empty = StoredFrame(self.template.empty()).to_record()
        db.execute_sql(
            f"INSERT INTO {self.table} (name, duration_ms, position, brightness_levels, rows)"
            f" SELECT 'Frame ' || (SELECT COALESCE(MAX(id), 0) + 1 FROM {self.table}), ?, 1, ?, ?"
            f" WHERE NOT EXISTS (SELECT 1 FROM {self.table})",
            (empty["duration_ms"], empty["brightness_levels"], empty["rows"]),
        )
        frames = self._to_frames(db.execute_sql(f"SELECT * FROM {self.table} ORDER BY position DESC, id DESC LIMIT 1"))
        if not frames:
            raise RuntimeError("Failed to create the first frame")
        return frames[0]

    def set_all_durations(self, duration_ms: int) -> None:
        """Set the same duration on every frame."""
        db.update(self.table, {"duration_ms": int(duration_ms)})

    def delete(self, fids: list[int]) -> None:
        """Delete frames, then renumber the positions 1..N."""
        if not fids:
            return
        db.execute_sql(f"DELETE FROM {self.table} WHERE id IN (SELECT value FROM json_each(?))", (json.dumps([int(f) for f in fids]),))
        db.execute_sql(
            f"UPDATE {self.table} SET position = ranked.pos FROM"
            f" (SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) AS pos FROM {self.table}) AS ranked"
            f" WHERE {self.table}.id = ranked.id AND {self.table}.position IS NOT ranked.pos"
        )

    def reorder(self, order: list[int]) -> None:
        """Give the listed frames positions 1..N in list order."""
        # json_each yields the list index as "key": one statement updates every listed frame
        db.execute_sql(
            f"UPDATE {self.table} SET position = ordered.key + 1 FROM json_each(?) AS ordered WHERE {self.table}.id = ordered.value",
            (json.dumps([int(f) for f in order]),),
        )
