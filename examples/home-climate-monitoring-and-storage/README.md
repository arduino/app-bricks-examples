# Home Climate Monitoring

The **Home Climate Monitoring** example records temperature & humidity data from the [Modulino® Thermo](https://store.arduino.cc/products/modulino-thermo) node, and streams it to a web interface.

The data is stored on the board, where we can view the data from the latest 24 hour period.

## Bricks Used

- `dbstorage_tsstore` - makes it possible to save, read, and manage time-based data.
- `web_ui` - used to host a web server on the board, serving HTML, CSS & JavaScript files.

## Hardware and Software Requirements

### Hardware

- Arduino® UNO Q
- USB-C® cable
- [Modulino® Thermo](https://store.arduino.cc/products/modulino-thermo)
- Qwiic cable

### Software

- Arduino App Lab

## How to Use the Example

1. Connect the board to a computer using a USB-C® cable.
2. Connect the Modulino® Thermo to the board using the Qwiic connector.
    ![Connecting Modulino® Thermo](assets/docs_assets/hardware-setup.png)

3. Launch the App by clicking on the "Play" button in the top right corner. Wait until the App has launched.
    ![Launching an App](assets/docs_assets/launch-app.png)

4. Open a browser and access `<UNO-Q-IP-ADDRESS>:7000` (this may also launch automatically).
5. View the data from the Modulino® in real time!

## How it Works

This example uses the `dbstorage_tsstore` Brick to store data with time stamps on the board, and the `web_ui` Brick display the data on a web page.

The data is recorded from a Modulino® Thermo, connected to the UNO Q's Qwiic port, and sent to the Linux side using the **Bridge** tool.

As data is being stored, the web server can access the data, and render it in cool graphs, with possibility to check the data up to 24 hours back in time.

![How Home Climate Monitoring works](assets/docs_assets/climate-monitoring.png)

## Understanding the Code

The Home Climate Monitoring example is a bit more advanced on the Python side, as it includes:
- A database for storing environmental data
- Calculations for the data received (e.g. calculating dew point, heat index & absolute humidity)
- An endpoint that makes it possible for the web server to fetch the latest data over HTTP.

### Linux (Python) Side

The `main.py` contains some advanced functions that makes the recording, storing and displaying of data possible.

- `Bridge.provide("record_sensor_samples", record_sensor_samples)` - data is received from the microcontroller.
- `def record_sensor_samples(celsius: float, humidity: float):` - the data is then stored using the `dbstorage_tsstore` Brick, as well as performing a series of calculations for retrieving e.g. absolute humidity.
- `def on_get_samples(resource: str, start: str, aggr_window: str):` - this function defines an API endpoint that lets us fetch the stored sensor data from the database.
- `ui.expose_api("GET", "/get_samples/{resource}/{start}/{aggr_window}", on_get_samples)` - the endpoint is exposed, making it available to the `web_ui` Brick. This allows the web server to pull in the latest data, as well as historical data.

>For better understanding the Python application, view the `main.py` file, which includes detailed comments for each code segment.

### Microcontroller (Sketch) Side

The microcontroller side is a bit easier to understand, where there are essentially three things happening:

- `float celsius = thermo.getTemperature();` - **temperature** is recorded from the Modulino®.
- `float humidity = thermo.getHumidity();` - **humidity** is recorded from the Modulino®.
- `Bridge.notify("record_sensor_samples", celsius, humidity);` - the data is sent to the Python application using the Bridge tool.
