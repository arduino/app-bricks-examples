# Blinking LED from Arduino Cloud

This **Blinking LED from Arduino Cloud** example allows us to remotely control the onboard LED on the Arduino® UNO Q from the [Arduino Cloud](https://app.arduino.cc/).
The LED is controlled by creating a dashboard with a switch in the Arduino Cloud.

## Bricks Used

The Blinking LED from Arduino Cloud example uses the following Bricks:

- `arduino_cloud`: Brick to create a connection to the Arduino Cloud

## Hardware and Software Requirements

### Hardware

- [Arduino® UNO Q](https://store.arduino.cc/products/uno-q)
- [USB-C® cable](https://store.arduino.cc/products/usb-cable2in1-type-c)

### Software

- Arduino App Lab
- [Arduino Cloud](https://app.arduino.cc/)

**Note:** You can run this example using your Arduino® UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

This example requires an active Arduino Cloud account, with a device, thing and dashboard set up.

### Setting Up Arduino Cloud

1. Navigate to the [Arduino Cloud](https://app.arduino.cc/) page and log in / create an account.
2. Go to the [devices](https://app.arduino.cc/devices) page and create a device, selecting the "manual device" type. Follow the instructions and take note of the **device_id** and **secret_key** provided in the setup. 
    ![Arduino Cloud credentials](assets/docs_images/cloud-blink-device.png)
3. Go to the [things](https://app.arduino.cc/things) page and create a new thing.
4. Inside the thing, create a new **boolean** variable, and name it **"led"**. We also need to associate the device we created with this thing.
    ![Arduino Cloud thing](assets/docs_images/cloud-blink-thing.png)
5. Finally, navigate to the [dashboards](https://app.arduino.cc/dashboards), and create a dashboard. Inside the dashboard, click on **"Edit"**, and select the thing we just created. This will automatically assign a switch widget to the **led** variable.
    ![Arduino Cloud dashboard](assets/docs_images/cloud-blink-dashboard.png)

### Configure & Launch App

1. Duplicate this example, by clicking on the arrow next to the App example name. As we will need to add the Arduino Cloud credentials, we will need to duplicate it, as we are not able to edit any of the built-in examples.
   ![Duplicate example](assets/docs_images/cloud-blink-duplicate.png)

2. On the App page, click on the **"Arduino Cloud"** Brick, then click on the **"Brick Configuration"** button.
    ![Open Arduino Cloud Brick](assets/docs_images/cloud-blink-creds.png)

3. Enter the cloud credentials (device ID and secret key), replacing the `<YOUR_DEVICE_ID>` and `<YOUR_SECRET>` values.

    ![Add cloud credentials](assets/docs_images/cloud-blink-creds-2.png)

4. Launch the App by clicking on the "Play" button in the top right corner. Wait until the App has launched.
    ![Launching an App](assets/docs_images/launch-app-cloud-blink.png)

## How it Works

The application works by establishing a connection between the Arduino Cloud and the UNO Q board. When interacting with the dashboard's switch widget (turn ON/OFF), the cloud updates the "led" property. 

The `main.py` script running on the Linux system listens for changes to this property using the `arduino_cloud` Brick. When a change is detected, the **Bridge** tool is used to send data to the microcontroller, and turn the LED ON.

The flow of the App is:
1. The switch in the Arduino Cloud dashboard is changed.
2. The Arduino Cloud updates the device's state.
3. `main.py` receives the updated state, sends a message to the microcontroller which turns the LED to an ON/OFF state.

![How the Cloud interacts with UNO Q](assets/docs_images/cloud-blink.png)

### Understanding the Code

On the Linux (Python®) side:
- `iot_cloud = ArduinoCloud()` - initializes the `ArduinoCloud` class.
- `iot_cloud.register("led", value=False, on_write=led_callback)` - creates a callback function that fires when the value in the Arduino Cloud changes.
- `Bridge.call("set_led_state", value)` - calls the microcontroller with the updated state.

On the microcontroller (sketch) side:
- `Bridge.provide("set_led_state", set_led_state);` - we receive an update from the Linux (Python®) side, and trigger the `set_led_state()` function.

The `set_led_state()` function passes the updated state, and turns ON/OFF the LED:

```arduino
void set_led_state(bool state) {
    digitalWrite(LED_BUILTIN, state ? LOW : HIGH);
}
```
