// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const websocketButton = document.querySelector('#websocket-button');
const httpButton = document.querySelector('#http-button');

// Initialize UI
const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUIDisconnected);


function onUIConnected() {
  websocketButton.addEventListener('click', sendViaWebSocket);
  httpButton.addEventListener('click', sendViaHttp);
  console.log('Connected to the server');
}

function onUIDisconnected() {
  console.log('Disconnected from the server');
}

function sendViaWebSocket() {
  ui.send_message('print_message');
  console.log('WebSocket message sent with event id: print_message');
}

async function sendViaHttp() {
  try {
    const response = await fetch('/print_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      console.log('HTTP POST request sent successfully');
    } else {
      console.error('HTTP POST request failed:', response.status);
    }
  } catch (error) {
    console.error('Error sending HTTP POST request:', error);
  }
}