# Vibration Anomaly Detection

The **Vibration Anomaly Detection** example creates a smart vibration detector that monitors a fan (or any vibrating machinery) for anomalies. It visualizes raw accelerometer data in real-time and allows users to dynamically adjust the anomaly detection sensitivity through a web dashboard.

![Vibration Monitoring](assets/docs_assets/vibration-anomaly.png)

## Description

Monitor the physical status of a fan in real-time. This example uses a Modulino Movement to capture acceleration data and a dedicated Brick to detect vibration anomalies. 

Unlike simple threshold detectors, this App provides:
* **Live Data Visualization:** A real-time scrolling plot of X, Y, and Z acceleration.
* **Dynamic Sensitivity:** A slider to adjust the anomaly scoring threshold on the fly.
* **History:** A log of the most recent detected anomalies with timestamps.

## Bricks Used

The example uses the following Bricks:

- `web_ui`: Brick to create a web interface to display the dashboard.
- `vibration_anomaly_detection`: Brick that processes accelerometer data to detect irregular vibration patterns.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- Modulino Movement (LSM6DSOX) (x1)
- Qwiic Cable (x1)
- USB-C® to USB-A Cable (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard, and monitor attached.

## How to Use the Example

1. **Hardware Setup**
   Connect the Modulino Movement sensor to the Arduino UNO Q via the Qwiic connector.

2. **Run the App**
   Launch the App from Arduino App Lab.

3. **Access the Web Interface**
   Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000`.

4. **Monitor Vibrations**
   Observe the **Accelerometer Data** chart to see the live vibration waveforms.

5. **Adjust Sensitivity**
   Use the **Set anomaly score** slider to adjust how sensitive the detector is.
   - **Lower values (1):** High sensitivity (small vibrations trigger alerts).
   - **Higher values (10):** Low sensitivity (requires strong, irregular vibrations to trigger).

6. **Trigger an Anomaly**
   Shake the sensor or attach it to a fan to simulate an anomaly. The "Feedback" section will show a warning, and the event will be logged in "Recent Anomalies".

## How it Works

Once the App is running, it performs the following operations:

- **Acquisition**: The sketch reads the sensor every 16ms and sends data to Python via Bridge.
- **Processing**: The backend converts units, feeds the detection Brick, and streams data to the UI.
- **Detection**: The Brick analyzes vibration patterns and triggers an event if the threshold is exceeded.
- **Tuning**: Slider adjustments in the web interface instantly update the detection sensitivity.

## Understanding the Code

Here is a brief explanation of the App components:

### 🔧 Backend (`main.py`)

The Python backend serves as the central hub. It performs the following tasks:

- Initializes the `vibration_anomaly_detection` Brick.
- Receives raw sensor data via `Bridge`, converts it from gravity units ($g$) to acceleration ($m/s^2$), and forwards it to the UI for plotting.
- Accumulates samples in the detection Brick.
- Listens for threshold overrides from the UI to update the detection sensitivity in real-time.
- Broadcasts anomaly alerts containing the anomaly score and timestamp.

**Data Processing Logic:**

The `record_sensor_movement` function receives the raw data, converts the units, feeds the detector, and simultaneously pushes the data to the frontend for the live plot.

```python
def record_sensor_movement(x: float, y: float, z: float):
    # Convert g -> m/s^2 for the detector
    x_ms2 = x * 9.81
    y_ms2 = y * 9.81
    z_ms2 = z * 9.81

    # Forward raw data to UI for plotting
    ui.send_message('sample', {'x': x_ms2, 'y': y_ms2, 'z': z_ms2})

    # Forward samples to the vibration_detection brick
    vibration_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))
```

**Dynamic Thresholds:**

When you move the slider in the browser, the frontend emits an event. The backend updates the detection brick's sensitivity immediately.

```python
def on_override_th(value: float):
    logger.info(f"Setting new anomaly threshold: {value}")
    vibration_detection.anomaly_detection_threshold = value
```

### 💻 Frontend (`index.html` + `app.js`)

The web interface handles visualization and user input:

- **Real-time Plotting:** Uses an HTML5 Canvas to draw the live X, Y, Z acceleration waveforms.
- **Interactive Controls:** Sends slider values to the backend to tune the algorithm parameters.
- **Alert System:** Visualizes anomalies with status icons and maintains a chronological list of recent detections.

**Visualizing the Data:**

The frontend receives the `sample` event and pushes it into an array. The `drawPlot` function clears the canvas and redraws the lines for X, Y, and Z to create the scrolling chart effect.

```javascript
function drawPlot() {
  if (!hasDataFromBackend) return; 

  // Clear the canvas before drawing the new frame
  ctx.clearRect(0, 0, currentWidth, currentHeight);
  
  // ... grid drawing code ...

  // Draw series (X, Y, Z)
  drawSeries('x','#0068C9');
  drawSeries('y','#FF9900');
  drawSeries('z','#FF2B2B');
}
```

### 🔧 Arduino Component (`sketch.ino`)

The firmware reads the Modulino Movement sensor every 16ms. It sends the X, Y, and Z values to the Python backend using `Bridge.notify`.

```cpp
void loop() {
  // ... timing logic (16ms interval) ...
  
  // Read new movement data from the sensor
  has_movement = movement.update();

  if(has_movement == 1) {
      // Get acceleration values
      x_accel = movement.getX();
      y_accel = movement.getY();
      z_accel = movement.getZ();
    
      // Send data to Python
      Bridge.notify("record_sensor_movement", x_accel, y_accel, z_accel);      
  }
}
```