// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Initialize WebUI
const ui = new WebUI();

ui.on_connect(() => {
  resetToInitialState();
  loadWebcam();
});

ui.on_disconnect(() => {
  videoFeed.style.display = 'none';
  scanBox.setAttribute('data-state', 'error');
  scanBoxTitle.textContent =
    'Connection to the board lost. Please check the connection.';
});

// Listen for analysis results from the backend and display them when received
ui.on_message('analysis_result', showScanResult);
