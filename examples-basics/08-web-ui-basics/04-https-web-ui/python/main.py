# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to demonstrate how to serve the Web UI over HTTPS using the WebUI brick.
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI # Import the WebUI class to manage the Web UI server

# Initialize WebUI with TLS enabled, this will serve the content in the "assets" folder of the App over HTTPS
# This will generate a self-signed certificate on the fly, so the first time you access the Web UI you might
# need to accept the security warning in your browser to proceed to the site
# In order to use your custom certificate add the "cert.pem" and "key.pem" files to the "cert" folder of the App
# (create it if it doesn't exist) and specify the path passing the "certs_dir_path" parameter to the WebUI constructor
# for example: WebUI(use_tls=True, certs_dir_path="cert")
ui = WebUI(use_tls=True)

App.run() # Start the application
