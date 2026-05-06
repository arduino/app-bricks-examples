# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
import time


# The App runtime will discover the method named "loop" and run it
# in a dedicated worker thread once the brick is started.
class Greeter:
    def loop(self):
        print("Hello from the Greeter brick")
        time.sleep(1)


greeter = Greeter()          # Create an instance of the Greeter brick class

App.register(greeter)        # Add the brick to the App's waiting queue
App.start_brick(greeter)     # Start this specific brick (spawns a worker

try:
    App.loop()               # Keep the main thread alive until Ctrl+C
finally:
    App.stop_brick(greeter)  # Stop the brick and join its worker thread
