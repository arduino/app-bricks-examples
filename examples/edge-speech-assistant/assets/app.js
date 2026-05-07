// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ui = new WebUI();

const textInput = document.getElementById('text-input');
const playButton = document.getElementById('play-stop-button');
const playIcon = document.getElementById('play-stop-icon');
const resetButton = document.getElementById('reset-button');
const timer = document.getElementById('timer');

let isSpeaking = false;
let timerInterval = null;
let elapsedSeconds = 0;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function startTimer() {
    elapsedSeconds = 0;
    timer.textContent = formatTime(0);
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        timer.textContent = formatTime(elapsedSeconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateControls() {
    const hasText = textInput.value.trim().length > 0;

    if (isSpeaking) {
        playButton.disabled = true;
        textInput.disabled = true;
        resetButton.disabled = true;
        resetButton.classList.add('disabled');
    } else {
        playButton.disabled = !hasText;
        textInput.disabled = false;
        resetButton.disabled = !hasText;
        resetButton.classList.toggle('disabled', !hasText);
    }
}

playButton.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text && !isSpeaking) {
        ui.send_message('speak', { text });
    }
});

resetButton.addEventListener('click', () => {
    if (isSpeaking) return;
    textInput.value = '';
    elapsedSeconds = 0;
    timer.textContent = formatTime(0);
    updateControls();
});

textInput.addEventListener('input', updateControls);

ui.on_message('speaking', (data) => {
    if (data.status === 'started') {
        isSpeaking = true;
        startTimer();
        updateControls();
    } else if (data.status === 'finished') {
        isSpeaking = false;
        stopTimer();
        updateControls();
    }
});

updateControls();
