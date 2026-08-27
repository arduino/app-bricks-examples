// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const POSES = ['standing', 'sitting', 'right_arm_raised', 'left_arm_raised'];

const streamEl = document.querySelector('#stream');
const errorContainer = document.querySelector('#error-container');
const peopleBadge = document.querySelector('#people-badge');
const peopleOverlay = document.querySelector('#people-overlay');
const moveBackOverlay = document.querySelector('#move-back-overlay');
const foundCount = document.querySelector('#found-count');
const foundChip = document.querySelector('#found-chip');

const sounds = {
  start: new Audio('sounds/start.wav'),
  poseFound: new Audio('sounds/pose-found.wav'),
  win: new Audio('sounds/win.wav'),
};

const ui = new WebUI();
const foundPoses = new Set();

function setState(state) {
  document.body.dataset.state = state;
}

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

// Browsers block audio before a user gesture: the Start Game click plays the
// start sound and silently unlocks the other two for later playback.
function unlockSounds() {
  playSound(sounds.start);
  for (const sound of [sounds.poseFound, sounds.win]) {
    sound
      .play()
      .then(() => {
        sound.pause();
        sound.currentTime = 0;
      })
      .catch(() => {});
  }
}

// The runner's annotated MJPEG stream on port 5002: the <img> never
// reconnects on its own, so retry on error until the runner is up.
function loadStream() {
  streamEl.src = `http://${window.location.hostname}:5002/stream?r=${Date.now()}`;
}
streamEl.addEventListener('error', () => setTimeout(loadStream, 1000));
streamEl.addEventListener('load', () => {
  if (document.body.dataset.state === 'loading') {
    setState('start');
  }
});
loadStream();

/* ---- Game state ---- */

function resetGame() {
  foundPoses.clear();
  for (const pose of POSES) {
    document.querySelector(`#pose-${pose}`).classList.remove('found');
  }
  foundCount.textContent = '0';
  foundChip.classList.remove('complete');
  setState('playing');
}

document.querySelector('#start-game-btn').addEventListener('click', () => {
  unlockSounds();
  resetGame();
});

document.querySelector('#play-again-btn').addEventListener('click', () => {
  playSound(sounds.start);
  resetGame();
});

function awardPose(name) {
  foundPoses.add(name);
  document.querySelector(`#pose-${name}`).classList.add('found');
  foundCount.textContent = String(foundPoses.size);
  playSound(sounds.poseFound);

  if (foundPoses.size === POSES.length) {
    foundChip.classList.add('complete');
    setState('win-pending');
    // Give the last pose-found sound room to breathe before the win screen
    setTimeout(() => {
      setState('win');
      playSound(sounds.win);
    }, 2000);
  }
}

ui.on_message('pose', data => {
  if (document.body.dataset.state !== 'playing') return;
  if (data.event !== 'enter' || foundPoses.has(data.name)) return;
  awardPose(data.name);
});

// No pose event is emitted while the brick cannot read the skeleton, so the
// overlay can simply follow it
ui.on_message('readable', data => moveBackOverlay.classList.toggle('visible', !data.value));

/* ---- Multiple people: a lasting badge, and the message that explains it once ---- */

const PEOPLE_MESSAGE_MS = 3000;

let peopleTimer = null;
let peopleMessageShown = false;

ui.on_message('people', data => {
  const many = data.count > 1;
  peopleBadge.classList.toggle('hidden', !many);

  if (many && !peopleMessageShown) {
    peopleMessageShown = true;
    peopleOverlay.classList.add('visible');
    peopleTimer = setTimeout(() => peopleOverlay.classList.remove('visible'), PEOPLE_MESSAGE_MS);
  } else if (!many) {
    clearTimeout(peopleTimer);
    peopleOverlay.classList.remove('visible');
  }
});

/* ---- Connection status ---- */

ui.on_connect(() => errorContainer.classList.add('hidden'));
ui.on_disconnect(() => errorContainer.classList.remove('hidden'));
