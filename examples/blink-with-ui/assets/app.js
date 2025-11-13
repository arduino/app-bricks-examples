// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const ledButton = document.getElementById('led-button');
const ledText = document.getElementById('led-text');
let errorContainer;

/*
 * Socket initialization. We need it to communicate with the server
 */
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    errorContainer = document.getElementById('error-container');
    initSocketIO();

    // Add event listener to LED button
    ledButton.addEventListener('click', handleLedClick);
});

function initSocketIO() {
    socket.on('connect', () => {
        // Request initial LED state
        socket.emit('get_initial_state', {});
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    });

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

/*
 * These functions are used to update the UI based on the server's LED status.
 */

// Function to update LED status in the UI
function updateLedStatus(status) {
    const isOn = status.led_is_on;

    // Update LED button appearance and text
    ledButton.className = isOn ? 'led-on' : 'led-off';
    ledText.textContent = isOn ? 'LED IS ON' : 'LED IS OFF';
}

// Function to handle LED button click
function handleLedClick() {
    // Send toggle message to server via socket
    socket.emit('toggle_led', {});
}