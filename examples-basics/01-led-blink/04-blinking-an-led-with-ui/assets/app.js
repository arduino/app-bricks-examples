// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ledButton = document.querySelector('#led-button');
const ledText = document.querySelector('#led-text');
const errorContainer = document.querySelector('#error-container');

// Initialize UI
const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUIDisconnected);

ui.on_message('led_status_update', updateLedStatus);

// Called when the websocket connection is established.
function onUIConnected() {
  errorContainer.textContent = '';
  errorContainer.style.display = 'none';
  ledButton.addEventListener('click', handleLedClick);

  // Requests the initial state from the board.
  ui.send_message('get_initial_state');
}

// Called when the websocket connection is lost.
function onUIDisconnected() {
  errorContainer.style.display = 'block';
  errorContainer.textContent =
    'Connection to the board lost. Please check the connection.';
}

// Function to update LED status in the UI
function updateLedStatus(status) {
  if (status.led_is_on) {
    ledButton.className = 'led-on';
    ledText.textContent = 'LED IS ON';
  } else {
    ledButton.className = 'led-off';
    ledText.textContent = 'LED IS OFF';
  }
}

// Function to handle LED button click
function handleLedClick() {
  ui.send_message('toggle_led');
}