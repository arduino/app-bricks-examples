// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const MILLION = 1000000;

const streamEl = document.querySelector('#stream');
const countedEl = document.querySelector('#counted');
const inViewEl = document.querySelector('#in-view');
const errorContainer = document.querySelector('#error-container');

const ui = new WebUI();

const shown = { counted: 0, in_view: 0 };

/* ---- Video: the brick's MJPEG stream on port 4912, retried until the brick serves it ---- */

function loadStream() {
  streamEl.src = `http://${window.location.hostname}:4912/?r=${Date.now()}`;
}

streamEl.addEventListener('error', () => {
  document.body.dataset.state = 'loading';
  setTimeout(loadStream, 1000);
});

streamEl.addEventListener('load', () => {
  document.body.dataset.state = 'live';
});

loadStream();

/* ---- Counter: the numbers grow briefly when they go up ---- */

function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function show(el, value, previous) {
  el.textContent = value.toLocaleString('de-DE');
  if (value > previous) bump(el);
}

ui.on_message('counts', counts => {
  show(countedEl, counts.counted, shown.counted);
  show(inViewEl, counts.in_view, shown.in_view);
  countedEl.classList.toggle('zero', counts.counted === 0);
  countedEl.classList.toggle('millions', counts.counted >= MILLION);
  shown.counted = counts.counted;
  shown.in_view = counts.in_view;
});

ui.on_connect(() => errorContainer.classList.add('hidden'));
ui.on_disconnect(() => errorContainer.classList.remove('hidden'));
