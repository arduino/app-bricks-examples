// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

// Initialize WebSocket connection
const socket = io(`http://${window.location.host}`);

socket.on('connect', () => {
  loadWebcam();
  resetToInitialState();
});

socket.on('disconnect', () => {
  content.setAttribute('data-state', 'error');
  title.className = 'title-secondary';
  title.textContent =
    'Connection to the board lost. Please check the connection.';
});

// Listen for analysis results from the backend and display them when received
socket.on('gesture_detected', handleGestureDetected);
