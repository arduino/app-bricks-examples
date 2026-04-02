// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

// Initialize UI
const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUiDisconnected);

// Listen for analysis results from the backend and display them when received
ui.on_message('gesture_detected', handleGestureDetected);

// Called when the websocket connection is established
function onUIConnected() {
  loadWebcam();
  resetToInitialState();
}

// Called when the websocket connection is lost
function onUiDisconnected() {
  content.setAttribute('data-state', 'error');
  title.className = 'title-secondary';
  title.textContent =
    'Connection to the board lost. Please check the connection.';
}
