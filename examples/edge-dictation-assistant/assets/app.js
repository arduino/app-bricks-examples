// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

const transcriptionText = document.getElementById('transcription-text');
const partialText = document.getElementById('partial-text');
const placeholderText = document.getElementById('placeholder-text');
const micButton = document.getElementById('mic-button');
const newRecordingButton = document.getElementById('new-recording-button');
const copyButton = document.getElementById('copy-button');
const statusLabel = document.getElementById('status-label');

const SILENCE_TIMEOUT_MS = 20000;

let isRecording = false;
let fullText = '';
let silenceTimer = null;

function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (isRecording) {
            pauseRecording();
        }
    }, SILENCE_TIMEOUT_MS);
}

function startRecording() {
    isRecording = true;
    socket.emit('start_dictation', {});
    resetSilenceTimer();
    updateUI();
}

function pauseRecording() {
    isRecording = false;
    clearTimeout(silenceTimer);
    socket.emit('stop_dictation', {});
    partialText.textContent = '';
    updateUI();
}

function updateUI() {
    const hasText = fullText.length > 0;
    placeholderText.style.display = (hasText || isRecording) ? 'none' : 'block';

    if (isRecording) {
        micButton.classList.add('recording');
        statusLabel.textContent = 'Listening...';
        statusLabel.classList.add('recording');
        newRecordingButton.disabled = true;
        newRecordingButton.classList.add('disabled');
        copyButton.disabled = true;
        copyButton.classList.add('disabled');
    } else {
        micButton.classList.remove('recording');
        statusLabel.textContent = hasText ? 'Paused' : 'Ready';
        statusLabel.classList.remove('recording');
        newRecordingButton.disabled = !hasText;
        newRecordingButton.classList.toggle('disabled', !hasText);
        copyButton.disabled = !hasText;
        copyButton.classList.toggle('disabled', !hasText);
    }
}

micButton.addEventListener('click', () => {
    if (isRecording) {
        pauseRecording();
    } else {
        startRecording();
    }
});

newRecordingButton.addEventListener('click', () => {
    if (isRecording) return;
    fullText = '';
    transcriptionText.textContent = '';
    partialText.textContent = '';
    socket.emit('new_recording', {});
    updateUI();
});

copyButton.addEventListener('click', () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText).then(() => {
        const originalLabel = copyButton.querySelector('img').nextSibling;
        const span = copyButton.lastChild;
        span.textContent = ' Copied!';
        setTimeout(() => { span.textContent = ' Copy text'; }, 1500);
    });
});

socket.on('transcription', (data) => {
    if (data.type === 'partial_text') {
        partialText.textContent = data.text;
        resetSilenceTimer();
    } else if (data.type === 'full_text') {
        if (data.text.trim()) {
            fullText += (fullText ? ' ' : '') + data.text.trim();
            transcriptionText.textContent = fullText;
        }
        partialText.textContent = '';
        resetSilenceTimer();
    }
    placeholderText.style.display = 'none';
});

socket.on('recording_reset', () => {
    fullText = '';
    transcriptionText.textContent = '';
    partialText.textContent = '';
    updateUI();
});

updateUI();
