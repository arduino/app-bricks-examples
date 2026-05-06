# Logger Example

The **Logger Example** demonstrates how to log messages at different severity levels from a Python script using Arduino App Lab.

## Description

This App logs messages using different log levels (`ERROR`, `WARNING`, `INFO`, `DEBUG`). The logging level is set to `INFO`, so `DEBUG` messages are suppressed.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

## How to Use the Example

### Configure & Launch App

1. **Run the App**
   Launch the App by clicking the **Run** button in the top right corner. Wait for the App to start.
   ![Launch the App](assets/docs_assets/launch-app.png)

2. **Watch the logs**
   Log messages will appear in the console tab. The `DEBUG` message will not be printed because the logging level is set to `INFO`.

## How it Works

Once the App is running, the `loop()` function emits one message per log level every 60 seconds. Because the logger is configured at `INFO` level, only `ERROR`, `WARNING` and `INFO` messages are shown; the `DEBUG` message is silently dropped.

## Understanding the Code

### 🔧 Backend (`main.py`)

The Python script creates a `Logger` instance and demonstrates each available log level.

- **Logger setup**: A `Logger` named `"LoggerExample"` is created with `level=logging.INFO`, which filters out `DEBUG` messages.

```python
logger = Logger("LoggerExample", level=logging.INFO)
```

- **Execution**: The `loop()` function emits log messages at every level and then waits 60 seconds before repeating.

```python
def loop():
    logger.error('This is an error message and will be printed')
    logger.warning('This is a warning message and will be printed')
    logger.info('This is an info message and will be printed')
    logger.debug('This is a debug message and won\'t be printed')
    time.sleep(60)
```

## Related Inspirational Examples
- Led Matrix Painter
- Music Composer
