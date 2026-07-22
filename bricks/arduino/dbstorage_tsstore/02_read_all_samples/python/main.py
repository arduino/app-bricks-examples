# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
import time
from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore

db = TimeSeriesStore()
db.start()

ts = int(time.time() * 1000)  # Current timestamp in milliseconds
for i in range(10):
    db.write_sample("temp", 20 + i, ts + i * 1000)  # Increment timestamp by 1 second for each sample
    db.write_sample("hum", 40 + i, ts + i * 1000)  # Increment timestamp by 1 second for each sample
    time.sleep(0.1)


# Read all samples for "temp" and "hum" from the database in the last 10 seconds
start_from = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts / 1000))
end_to = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime((ts + 10 * 1000) / 1000))
all_temp_samples = db.read_samples("temp", start_from=start_from, end_to=end_to)
print("All temperature samples:")
for sample in all_temp_samples:
    print(sample)

all_hum_samples = db.read_samples("hum", start_from=start_from, end_to=end_to)
print("All humidity samples:")
for sample in all_hum_samples:
    print(sample)

db.stop()

App.run()
