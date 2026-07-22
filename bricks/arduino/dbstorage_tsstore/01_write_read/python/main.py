# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
import time
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore

db = TimeSeriesStore()
db.start()

db.write_sample("temp", 21)
db.write_sample("hum", 45)
time.sleep(1)

last_temp = db.read_last_sample("temp")
last_hum = db.read_last_sample("hum")
print(f"Last temperature: {last_temp}")
print(f"Last humidity: {last_hum}")

db.stop()

App.run()
