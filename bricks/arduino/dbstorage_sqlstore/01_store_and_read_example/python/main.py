# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.dbstorage_sqlstore import SQLStore

db = SQLStore("example.db")

# Create a table
columns = {"id": "INTEGER PRIMARY KEY", "name": "TEXT", "age": "INTEGER"}
db.create_table("users", columns)

# Insert data
data = {"name": "Alice", "age": 30}
db.store("users", data)

# Read data
result = db.read("users")
print(result)

# Drop the table
db.drop_table("users")

App.run()
