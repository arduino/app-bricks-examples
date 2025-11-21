// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const fanLed = document.getElementById('fan-led');
const fanText = document.getElementById('fan-text');
let timeoutId;

/*
 * Socket initialization. We need it to communicate with the server
 */
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
});

function initSocketIO() {
    socket.on('fan_status_update', (message) => {
        updateFanStatus(message);
    });
}

// Function to update LED status in the UI
function updateFanStatus(status) {
    const isOn = status.anomaly;

	changeStatus(isOn);
	
	if (timeoutId) {
      clearTimeout(timeoutId);
    }
	
	// schedule reset
	timeoutId = setTimeout(() => changeStatus(!isOn), 3000);	
}

function changeStatus(isOn) {
    fanLed.className = isOn ? 'led-on' : 'led-off';
    fanText.textContent = isOn ? 'Anomaly detected' : 'No anomaly';
}
