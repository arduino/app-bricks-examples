# System Resources Logger

The **System Resources Logger** monitors and displays real-time system performance data from your Arduino UNO Q board. It tracks CPU and memory usage, stores the data in a time series database, and provides a web-based dashboard with live charts and historical analysis over 1-hour and 1-day periods.

![System Resources Logger](assets/docs_assets/system-resource-log.png)

## Description

The application continuously monitors system performance using the `psutil` library to collect CPU and memory usage statistics every 5 seconds. Data is stored in a time series database for historical analysis and streamed in real-time to a web interface featuring interactive charts. Users can view live performance data or switch to historical views with 1 hour (5 minute aggregation) and 1 day (1 hour aggregation) time ranges.

The Python® script handles data collection and storage. At the same time, the web interface provides interactive visualization with `chart.js` and real-time updates via WebSocket communication. The system automatically aggregates historical data to provide meaningful insights over different time periods.

## Bricks Used

The system resources logger example uses the following Bricks:

- `dbstorage_tsstore`: Brick to store CPU and memory usage data in a time series database with retention and aggregation capability.
- `web_ui`: Brick to create a web interface with real-time charts and historical data visualization.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. Run the App

![Run the App](assets/docs_assets/launch-app.png)

2. The App should open automatically in the web browser. You can open it manually via `<board-name>.local:7000`.
3. View real-time system performance:

- **Live Tab**: Shows current CPU and memory usage with real-time updates
- **1h Tab**: Displays last hour performance with 5 minute data aggregation
- **1D Tab**: Shows last 24 hours with 1 hour data aggregation

4. Monitor the live indicator, a green circle, that flashes when new data arrives
5. Hover over chart points to see detailed timestamp and percentage values

## How it Works

Once the application is running, the device performs the following operations:

- **Collecting system performance data.**

The application uses the `psutil` library to gather system metrics:

```python
 import psutil
 
 cpu_percent = psutil.cpu_percent(interval=1)
 mem_percent = psutil.virtual_memory().percent
```

Data collection runs in a separate thread, sampling system resources every 5 seconds to provide constant monitoring without blocking the web interface.

- **Storing data in a time-series database.**

The `dbstorage_tsstore` Brick handles data storage:

```python
 from arduino.app_bricks.dbstorage_tsstore import TimeSeriesStore
 
 db = TimeSeriesStore()
 db.write_sample('cpu', cpu_percent, ts)
 db.write_sample('mem', mem_percent, ts)
```

The time-series database manages data handling and provides storage for performance metrics with timestamp.

- **Serving real-time data to the web interface.**

The `web_ui` Brick provides WebSocket communication for live updates:

```python
 from arduino.app_bricks.web_ui import WebUI
 
 ui = WebUI()
 ui.send_message('cpu_usage', {"value": cpu_percent, "ts": ts})
 ui.send_message('memory_usage', {"value": mem_percent, "ts": ts})
```

- **Providing historical data through REST API.**

The web interface exposes an API endpoint for getting aggregated historical data:

```python
 ui.expose_api("GET", "/get_samples/{resource}/{start}/{aggr_window}", on_get_samples)
```

This enables the frontend to request different time ranges with appropriate data aggregation for optimal chart visualization.

The high-level data flow looks like this:

```
System Metrics → Time-Series Database → WebSocket/REST API → Web Dashboard Charts
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component handles data collection, storage, and web service functionality.

- **`psutil` integration**: Collects CPU percentage with 1 second interval and memory percentage from virtual memory statistics, providing system performance metrics.

- **`TimeSeriesStore` database**: Stores performance samples with millisecond timestamps, allowing efficient querying and automatic data retention management.

- **`get_events()` thread**: Runs continuously in a separate thread, collecting system metrics every 5 seconds and simultaneously storing data and broadcasting real-time updates.

- **REST API endpoint**: Provides `/get_samples/{resource}/{start}/{aggr_window}` for historical data retrieval with flexible time ranges and aggregation windows.

- **WebSocket broadcasting**: Sends live updates to all connected clients using `cpu_usage` and `memory_usage` message types with timestamp and value data.

### 🔧 Frontend (`index.html` + `app.js`)

The web interface provides interactive charts and real-time monitoring capabilities.

- **Chart.js integration**: Creates line charts for CPU and memory usage with customized scaling (0-100%), tooltips, and time-based x-axis labels.

- **Tab-based interface**: Switches between Live, 1 hour, and 1 day views with appropriate data fetching and chart configuration for each time range.

- **Socket.IO communication**: Receives real-time data via `cpu_usage` and `memory_usage` events, automatically updating live charts as new data arrives.

- **Historical data fetching**: Makes REST API calls to retrieve aggregated data when switching to historical tabs, with 5 minute windows for 1 hour view and 1 hour windows for 1 day view.

- **Live indicator**: Visual feedback system with an animated green circle that flashes when new real-time data is received, providing immediate user confirmation of active monitoring.

- **Error handling**: Displays connection status messages and gracefully handles data loading states with `No data` indicators when information is unavailable.