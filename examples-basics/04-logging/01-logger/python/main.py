# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

# Example app to log messages.
import time
from arduino.app_utils import App    # Import the App class to create an App Lab application
from arduino.app_utils import Logger # Import the Logger class to log messages
import logging                       # Import the logging module to use logging levels and formatting

# Create a logger instance with the name "LoggerExample", and set the logging level to INFO
# Setting the logging level to INFO allows to log all messages with a level of INFO and above 
# (WARNING, ERROR, CRITICAL), while DEBUG messages will be ignored.
logger = Logger("LoggerExample", level=logging.INFO)

# This function demostrates how to print log messages with different levels (ERROR, WARNING, INFO, DEBUG).
def loop():    
    logger.error('This is an error message and will be printed')         # Log an error message
    logger.warning('This is a warning message and will be printed')      # Log a warning message
    logger.info('This is an info message and will be printed')           # Log an info message
    logger.debug('This is a debug message and won\'t be printed')        # Log a debug message (won't be printed because the logging level is set to INFO)
    time.sleep(60) # Wait for 60 seconds before printing the next set of log messages

App.run(user_loop=loop)