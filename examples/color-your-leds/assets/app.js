// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

const led1ColorPicker = document.getElementById('led1-color');
const led2ColorPicker = document.getElementById('led2-color');
const led3ColorPicker = document.getElementById('led3-color');
const led4ColorPicker = document.getElementById('led4-color');
const led1HexDisplay = document.getElementById('led1-hex');
const led2HexDisplay = document.getElementById('led2-hex');
const led3HexDisplay = document.getElementById('led3-hex');
const led4HexDisplay = document.getElementById('led4-hex');
let errorContainer;

/*
 * Socket initialization. We need it to communicate with the server
 */
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    errorContainer = document.getElementById('error-container');
    initSocketIO();

    // Add event listeners
    led1ColorPicker.addEventListener('input', function(e) {
      led1HexDisplay.textContent = e.target.value;
      const rgb = hexToRgb(e.target.value);
      socket.emit('set_color', { led: 1, color: rgb });
      console.log(`LED 1 - R: ${rgb.r}, G: ${rgb.g}, B: ${rgb.b}`);
    });

    led2ColorPicker.addEventListener('input', function(e) {
      led2HexDisplay.textContent = e.target.value;
      const rgb = hexToRgb(e.target.value);
      socket.emit('set_color', { led: 2, color: rgb });
      console.log(`LED 2 - R: ${rgb.r}, G: ${rgb.g}, B: ${rgb.b}`);
    });

    led3ColorPicker.addEventListener('input', function(e) {
      led3HexDisplay.textContent = e.target.value;
      const rgb = hexToRgb(e.target.value);
      socket.emit('set_color', { led: 3, color: rgb });
      console.log(`LED 3 - R: ${rgb.r}, G: ${rgb.g}, B: ${rgb.b}`);
    });

    led4ColorPicker.addEventListener('input', function(e) {
      led4HexDisplay.textContent = e.target.value;
      const rgb = hexToRgb(e.target.value);
      socket.emit('set_color', { led: 4, color: rgb });
      console.log(`LED 4 - R: ${rgb.r}, G: ${rgb.g}, B: ${rgb.b}`);
    });
});

// Function to convert hex to RGB
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function initSocketIO() {
    socket.on('led_status_update', (message) => {
        updateLedStatus(message);
    });

    socket.on('disconnect', () => {
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });
}