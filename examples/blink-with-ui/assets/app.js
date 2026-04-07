// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Initialize UI
const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUiDisconnected);
ui.on_message('led_status_update', updateLedStatus);

let ledText, ledButton, errorContainer;

// Called when the websocket connection is established.
function onUIConnected() {
  // We initialize DOM elements here to ensure they are available before being used,
  // as this handler is called after the page is fully loaded.
  ledText = document.getElementById('led-text');
  ledButton = document.getElementById('led-button');
  errorContainer = document.getElementById('error-container');
  errorContainer.textContent = '';
  errorContainer.style.display = 'none';

  // Register event listener to LED button
  ledButton.addEventListener('click', handleLedClick);

  // Requests the initial state from the board.
  ui.send_message('get_initial_state');
}

// Called when the websocket connection is lost.
function onUiDisconnected() {
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
