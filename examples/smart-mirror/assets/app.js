// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Initialize WebSocket connection
const socket = io(`http://${window.location.host}`);

socket.on('connect', () => {
  resetToInitialState();
  loadWebcam();
});

socket.on('disconnect', () => {
  videoFeed.style.display = 'none';
  scanBox.setAttribute('data-state', 'error');
  scanBoxTitle.textContent =
    'Connection to the board lost. Please check the connection.';
});

// Listen for analysis results from the backend and display them when received
socket.on('analysis_result', showScanResult);
