// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Initialize UI
const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUIDisconnected);

ui.on_message('message', printMessage);

function onUIConnected() {
  console.log('Connected to the server');
}

function onUIDisconnected() {
  console.log('Disconnected from the server');
}

function printMessage(message) {
  const messageList = document.querySelector('#message-list');
  const listItem = document.createElement('li');
  listItem.textContent = message.content;
  messageList.appendChild(listItem);
}