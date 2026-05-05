// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ui = new WebUI();

const textInput = document.getElementById('text-input');
const playStopButton = document.getElementById('play-stop-button');
const playStopIcon = document.getElementById('play-stop-icon');
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
        playStopIcon.src = 'img/stop.svg';
        playStopButton.classList.add('active');
        playStopButton.disabled = false;
        textInput.disabled = true;
        resetButton.disabled = true;
        resetButton.classList.add('disabled');
    } else {
        playStopIcon.src = 'img/play.svg';
        playStopButton.classList.remove('active');
        playStopButton.disabled = !hasText;
        textInput.disabled = false;
        resetButton.disabled = !hasText;
        resetButton.classList.toggle('disabled', !hasText);
    }
}

playStopButton.addEventListener('click', () => {
    if (isSpeaking) {
        ui.send_message('stop');
    } else {
        const text = textInput.value.trim();
        if (text) {
            ui.send_message('speak', { text });
        }
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
