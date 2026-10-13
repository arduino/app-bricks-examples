// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const STAGES = ['baby', 'young', 'adult'];
const MOUTH_OPEN_MS = 600;
const BOING_MS = 650;

const streamEl = document.querySelector('#stream');
const feedArea = document.querySelector('#feed-area');
const mascotEl = document.querySelector('#mascot');
const bitesEl = document.querySelector('#bites');
const levelEls = [...document.querySelectorAll('.level')];
const slotsPerLevel = levelEls[0].querySelectorAll('.slot').length;
const errorContainer = document.querySelector('#error-container');
const tipsToggle = document.querySelector('#tips-toggle');
const tipsContent = document.querySelector('#tips-content');
const confidenceField = document.querySelector('#confidence-field');
const confidenceNumber = document.querySelector('#confidence-number');
const confidenceSlider = document.querySelector('#confidence-slider');
const confidenceValue = document.querySelector('#confidence-value');
const confidenceError = document.querySelector('#confidence-error');
const confidenceErrorText = document.querySelector('#confidence-error-text');

document.querySelector('#bites-goal').textContent = String(levelEls.length * slotsPerLevel);

const ui = new WebUI();

let game = null; // the last state the board sent
let streamReady = false;
let tipsDismissed = false;
let confidence = Number(confidenceSlider.value); // the last valid value, the one the slider shows
let sentConfidence = confidence;
let mouthTimer = null;
let growthTimer = null;

function setState(state) {
  document.body.dataset.state = state;
}

function updatePageState() {
  if (!streamReady) {
    setState('loading');
  } else if (!tipsDismissed) {
    setState('tips');
  } else {
    setState(game && game.won ? 'won' : 'playing');
  }
}

/* ---- Video: the brick's MJPEG stream on port 4912, retried until the brick serves it ---- */

function loadStream() {
  streamEl.src = `http://${window.location.hostname}:4912/?r=${Date.now()}`;
}

streamEl.addEventListener('error', () => {
  streamReady = false;
  updatePageState();
  setTimeout(loadStream, 1000);
});

streamEl.addEventListener('load', () => {
  streamReady = true;
  placeFeedArea();
  updatePageState();
});

loadStream();

// The video covers the page, cropped like object-fit: cover, so the feed zone, in fractions of the camera frame,
// maps to the page through the size and offset of the video as shown
function placeFeedArea() {
  if (!game || !streamEl.naturalWidth) return;
  const [x1, y1, x2, y2] = game.zone;
  const scale = Math.max(window.innerWidth / streamEl.naturalWidth, window.innerHeight / streamEl.naturalHeight);
  const width = streamEl.naturalWidth * scale;
  const height = streamEl.naturalHeight * scale;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  feedArea.style.left = `${left + x1 * width}px`;
  feedArea.style.top = `${top + y1 * height}px`;
  feedArea.style.width = `${(x2 - x1) * width}px`;
  feedArea.style.height = `${(y2 - y1) * height}px`;
}

window.addEventListener('resize', placeFeedArea);

/* ---- Game state ---- */

function stageAfter(bites) {
  return STAGES[Math.min(Math.floor(bites / slotsPerLevel), STAGES.length - 1)];
}

function renderLevels(bites) {
  levelEls.forEach((levelEl, level) => {
    const eaten = bites - level * slotsPerLevel;
    const done = eaten >= slotsPerLevel;
    const current = !done && eaten >= 0;
    levelEl.classList.toggle('done', done);
    levelEl.classList.toggle('current', current);
    levelEl.querySelectorAll('.slot').forEach((slot, i) => {
      slot.className = 'slot';
      if (done) slot.classList.add('done');
      else if (current) slot.classList.add(i < eaten ? 'filled' : 'next');
    });
  });
}

function formatTime(seconds) {
  const total = Math.round(seconds ?? 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function render() {
  bitesEl.textContent = String(game.bites);
  document.querySelector('#eaten').textContent = String(game.bites);
  document.querySelector('#grown-in').textContent = formatTime(game.elapsed);
  renderLevels(game.bites);
  if (growthTimer === null) feedArea.dataset.stage = stageAfter(game.bites);
  placeFeedArea();
  updatePageState();
}

ui.on_message('state', state => {
  game = state;
  render();
});

/* ---- Bites: the mouth opens, the mascot bounces, and every few bites it grows ---- */

function restartAnimation(name) {
  mascotEl.classList.remove('boing', 'pop');
  void mascotEl.offsetWidth; // a new bite plays the animation again from the start
  mascotEl.classList.add(name);
}

ui.on_message('bite', bite => {
  clearTimeout(mouthTimer);
  if (growthTimer !== null) {
    clearTimeout(growthTimer);
    growthTimer = null;
    feedArea.dataset.stage = stageAfter(bite.bites - 1);
  }
  feedArea.dataset.mouth = 'open';
  restartAnimation('boing');
  mouthTimer = setTimeout(() => (feedArea.dataset.mouth = 'normal'), MOUTH_OPEN_MS);

  const stage = stageAfter(bite.bites);
  if (stage !== feedArea.dataset.stage) {
    growthTimer = setTimeout(() => {
      growthTimer = null;
      feedArea.dataset.stage = stage;
      restartAnimation('pop');
    }, BOING_MS);
  }
});

document.querySelector('#play-again').addEventListener('click', () => ui.send_message('play_again'));

/* ---- Tips ---- */

document.querySelector('#tips-close').addEventListener('click', () => {
  tipsDismissed = true;
  updatePageState();
});

tipsToggle.addEventListener('click', () => {
  const open = tipsToggle.getAttribute('aria-expanded') !== 'true';
  tipsToggle.setAttribute('aria-expanded', String(open));
  tipsContent.hidden = !open;
});

/* ---- Confidence: whole numbers from 1 to 100, sent to the board when the slider is released or the typing pauses; the slider keeps the last valid one ---- */

const TYPING_PAUSE_MS = 500;
let typingTimer = null;

function showConfidence(value) {
  confidence = value;
  if (document.activeElement !== confidenceNumber) confidenceNumber.value = String(value);
  confidenceSlider.value = String(value);
  confidenceSlider.style.setProperty('--fill', `${((value - 1) / 99) * 100}%`);
  confidenceValue.textContent = String(value);
}

function sendConfidence() {
  if (confidence === sentConfidence) return;
  sentConfidence = confidence;
  ui.send_message('confidence', confidence);
}

function showError(message) {
  confidenceErrorText.textContent = message;
  confidenceError.hidden = false;
  confidenceField.classList.add('invalid');
}

function hideError() {
  confidenceError.hidden = true;
  confidenceField.classList.remove('invalid');
}

// The field takes whole numbers from 1 to 100: the browser blocks letters and steps the arrows within the range,
// but a number typed outside it, or a lone "e", "-" or ".", still gets through
function invalidConfidence() {
  if (confidenceNumber.validity.badInput || !/^\d+$/.test(confidenceNumber.value)) return 'Only numbers';
  const value = Number(confidenceNumber.value);
  return value >= 1 && value <= 100 ? null : 'From 1 to 100';
}

confidenceNumber.addEventListener('input', () => {
  clearTimeout(typingTimer);
  const error = invalidConfidence();
  if (error) {
    showError(error);
  } else {
    hideError();
    showConfidence(Number(confidenceNumber.value));
    typingTimer = setTimeout(sendConfidence, TYPING_PAUSE_MS);
  }
});

confidenceNumber.addEventListener('keydown', event => {
  if (event.key === 'Enter') confidenceNumber.blur();
});

// Leaving the field sends a valid value at once and restores the last valid one otherwise
confidenceNumber.addEventListener('blur', () => {
  const value = invalidConfidence() ? confidence : Number(confidenceNumber.value);
  hideError();
  showConfidence(value);
  sendConfidence();
});

confidenceSlider.addEventListener('input', () => showConfidence(Number(confidenceSlider.value)));
confidenceSlider.addEventListener('change', sendConfidence);

document.querySelector('#confidence-reset').addEventListener('click', () => {
  hideError();
  showConfidence(Number(confidenceSlider.defaultValue));
  sendConfidence();
});

/* ---- Connection status ---- */

ui.on_connect(() => {
  sentConfidence = confidence;
  ui.send_message('confidence', confidence);
  errorContainer.classList.add('hidden');
});
ui.on_disconnect(() => errorContainer.classList.remove('hidden'));
