# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to log messages.
import time
from arduino.app_utils import App
from arduino.app_utils import Logger
import logging

# Create a logger instance with the name "LoggerExample", and set the logging level to INFO
# Setting the logging level to INFO allows to log all messages with a level of INFO and above
# (WARNING, ERROR, CRITICAL), while DEBUG messages will be ignored.
logger = Logger("LoggerExample", level=logging.INFO)

def loop():
    logger.error('This is an error message and will be printed')
    logger.warning('This is a warning message and will be printed')
    logger.info('This is an info message and will be printed')
    logger.debug('This is a debug message and won\'t be printed')  # won't be printed because the logging level is set to INFO
    time.sleep(60)

App.run(user_loop=loop)
