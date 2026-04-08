// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Initialize UI
const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUiDisconnected);

// Listen for analysis results from the backend and display them when received
ui.on_message('analysis_result', showScanResult);

// Called when the websocket connection is established
function onUIConnected() {
  resetToInitialState();
  loadWebcam();
}

// Called when the websocket connection is lost
function onUiDisconnected() {
  videoIframe.style.display = 'none';
  scanBox.setAttribute('data-state', 'error');
  scanBoxTitle.textContent =
    'Connection to the board lost. Please check the connection.';
}
