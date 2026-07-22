// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const statusEl = document.querySelector('#status');

const ui = new WebUI();

ui.on_message('hello', data => {
  statusEl.textContent = data.message;
});
