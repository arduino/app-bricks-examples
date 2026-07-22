// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const statusEl = document.querySelector('#status');

const ui = new WebUI();

ui.on_connect(() => {
  statusEl.textContent = 'Connected to the board.';
});

ui.on_disconnect(() => {
  statusEl.textContent = 'Disconnected from the board.';
});
