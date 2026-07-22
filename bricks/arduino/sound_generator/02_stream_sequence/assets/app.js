// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const startBtn = document.querySelector('#start-btn');
const statusEl = document.querySelector('#status');

const ui = new WebUI();

// The Web Audio clock. Created on the first user gesture (browsers block audio otherwise).
let audioCtx = null;
// Time cursor: each incoming frame is scheduled right after the previous one for gapless playback.
let nextTime = 0;

startBtn.addEventListener('click', () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  audioCtx.resume();
  nextTime = audioCtx.currentTime;
  statusEl.textContent = 'Playing streamed audio…';
});

ui.on_message('audio_frame', data => {
  if (!audioCtx) return; // wait until the user has started playback

  // Socket.IO delivers the Python bytes as an ArrayBuffer of float32 PCM samples.
  const raw = data.raw_data;
  const buffer = raw instanceof ArrayBuffer ? raw : raw.buffer;
  const samples = new Float32Array(buffer);
  if (samples.length === 0) return;

  const rate = data.sample_rate || 16000;
  const audioBuffer = audioCtx.createBuffer(1, samples.length, rate);
  audioBuffer.copyToChannel(samples, 0);

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);

  const startAt = Math.max(nextTime, audioCtx.currentTime);
  source.start(startAt);
  nextTime = startAt + audioBuffer.duration;
});
