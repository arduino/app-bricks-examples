// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const helloBtn = document.querySelector('#hello-btn');
const statusEl = document.querySelector('#status');

helloBtn.addEventListener('click', async () => {
  const response = await fetch('/hello');
  const data = await response.json();
  statusEl.textContent = data.message;
});
