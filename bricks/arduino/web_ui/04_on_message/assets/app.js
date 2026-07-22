// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const messageInput = document.querySelector('#message-input');
const sendBtn = document.querySelector('#send-btn');
const statusEl = document.querySelector('#status');

const ui = new WebUI();

sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text) return;

  ui.send_message('hello', { text });
  statusEl.textContent = `Sent: ${text}`;
  messageInput.value = '';
});
