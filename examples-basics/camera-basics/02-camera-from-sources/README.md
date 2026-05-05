# Camera from different sources 

The **Camera from different sources** example captures a single image from a selected camera source and saves it to local storage in JPEG format.

**Note:** This example needs a camera. You can use a USB camera or a CSI camera with the Arduino Media Carrier. Please note that it may be run in **Network Mode** in the Arduino App Lab if used with a USB-C hub and a USB camera.

## Description

This example demonstrates how to capture images from multiple camera sources and save them to local storage. The Python® script supports various camera input methods including CSI cameras, USB cameras, RTSP streams, and HTTP video feeds. It initializes a camera from the desired source, captures a single image, compresses it to JPEG format, and stores it as a file named `captured_image.jpg`. 

The application shows the fundamental workflow for working with different camera sources, including initialization, image capture, compression, and file I/O operations.

## Bricks Used

**This example does not use any Bricks.** It demonstrates direct interaction with a camera peripheral through the Arduino App framework.

## Hardware and Software Requirements

### Hardware

In order to run this example you can choose between several cameras included an USB Camera or a CSI camera with the Arduino Media Carrier.

You can uncomment the Camera initialization you prefers and comment the others.

The following instructions are for using hardware cameras as USB Camera or CSI Camera

#### USB Camera set-up
- Arduino UNO Q (x1)
- USB camera (x1)
- USB-C® hub adapter with external power (x1)
- A power supply (5 V, 3 A) for the USB hub (e.g. a phone charger)
- Personal computer with internet access

#### CSI Camera set-up
- Arduino UNO Q (x1)
- Arduino Media Carrier (x1)
- CSI Camera (x1)
- USB-C® cable (for power and programming) (x1)


### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C® hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

### USB Camera set-up
1. Connect the USB-C hub to the UNO Q and the USB camera.
  ![Hardware setup](assets/docs_assets/hardware-setup.png)
2. Attach the external power supply to the USB-C hub to power everything.
3. Run the App.
   ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
4. The captured image named `captured_image.jpg` will be available in Arduino App Lab in the file list and it can be opened directly with a click as any other file

### CSI Camera set-up
1. Connect the Arduino Media Carrier and a CSI camera
2. Run the App
    ![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)
3. The captured image named `captured_image.jpg` will be available in Arduino App Lab in the file list and it can be opened directly with a click as any other file

## How it Works

Once the application is running, the device performs the following operations:

- **Initializing the camera.**

The Python® script instantiates and starts the desired Camera object with a specified source, resolution, and frame rate:

```python
    camera = Camera("csi:0", resolution=(640, 480), fps=30)
    camera.start()
```

The camera source can be specified in several ways:
- `"csi:0"` - CSI camera using positional identifier (0 for first camera, 1 for second, etc.)
- `"csi:CAMERA1"` - CSI camera using label identifier printed on the Arduino Media Carrier surface
- `"usb:0"` - USB camera using positional identifier
- `"/dev/video1"` - USB camera using full device path identifier
- `"rtsp://<URL>"` - RTSP stream with optional username and password parameters
- `"http://<IP_ADDRESS>/video.mp4"` - HTTP video feed

- **Capturing an image.**

The application captures a single raw image from the camera:

```python
    image: np.ndarray = camera.capture()
```

The captured image is returned as a NumPy array containing the raw image data.

- **Compressing to JPEG format.**

The raw image is compressed to JPEG format using the utility function:

```python
    imageJpeg = compress_to_jpeg(image, 100)
```

The second parameter (100) specifies the quality level, with 100 being the highest quality.

- **Saving the image to local storage.**

The compressed image is converted to bytes and written to a file:

```python
    imageBytes = imageJpeg.tobytes()
    with open("captured_image.jpg", "wb") as f:
        f.write(imageBytes)
```

- **Stopping the camera.**

Finally, the camera is stopped to release resources:

```python
    camera.stop()
```

The high-level data flow looks like this:

```
Camera Hardware → Capture → Compress (JPEG) → Save to File
```

## Understanding the Code

Here is a brief explanation of the application components:

### 🔧 Backend (`main.py`)

The Python® component handles camera initialization, image capture, compression, and file storage.

- **`from arduino.app_peripherals.camera import Camera`:** Imports the Camera class to interact with the camera peripheral.

- **`from arduino.app_utils.image import compress_to_jpeg`:** Imports the compression utility function for converting raw images to JPEG format.

- **`Camera("csi:0", resolution=(640, 480), fps=30)`:** Instantiates the Camera object with a specified camera source, resolution of 640x480 pixels, and frame rate of 30 fps. Multiple source options are available as shown in the main.py file comments.

- **`camera.start()`:** Initializes and starts the camera for capturing images using the specified source.

- **`camera.capture()`:** Captures a single raw image from the camera and returns it as a NumPy array.

- **`compress_to_jpeg(image, 100)`:** Converts the raw image to JPEG format with quality level 100 (highest quality).

- **`imageJpeg.tobytes()`:** Converts the JPEG image to bytes for file writing.

- **`open("captured_image.jpg", "wb")`:** Opens a file in binary write mode to save the captured image.

- **`camera.stop()`:** Stops the camera and releases hardware resources. 

## Related Inspirational Examples
- Detect Objects on Camera
- Person classifier on camera
