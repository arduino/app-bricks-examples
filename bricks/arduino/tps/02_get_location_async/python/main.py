# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from typing import Any

from arduino.app_utils import App
from arduino.app_bricks.tps import TPS

tps = TPS()


def on_location(result: dict[str, Any] | None, error: Exception | None) -> None:
    """Receive the location once the background lookup completes."""
    if error:
        print(f"Location lookup failed: {error}")
        return

    if result is None:
        print("Location result is None")
        return

    location = result["location"]
    print(f"Location: lat={location['lat']}, lng={location['lng']}")
    print(f"Accuracy: {result['accuracy']}m from {result['nap']} access points (took {result['elapsed_ms']}ms)")


# Non-blocking lookup: returns immediately, the callback gets the result
tps.async_locate(on_location)

App.run()
