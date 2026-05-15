// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ui = new WebUI();
ui.on_message('transcription', onTranscription);

const content = document.querySelector('.content');
const animatedBars = document.querySelector('#animated-bars');
const micButton = document.querySelector('#mic-button');
const title = document.querySelector('#title');
const partialText = document.querySelector('#partial-text');
const fullText = document.querySelector('#full-text');
const copyButton = document.querySelector('#copy-button');
const transcriptionArea = document.querySelector('#transcription-area');
const newRecordingButton = document.querySelector('#new-recording-button');

transcriptionArea.addEventListener('scroll', updateGradientOpacity);

// Attach event listeners to buttons
newRecordingButton.addEventListener('click', startNewRecording);
micButton.addEventListener('click', toggleRecording);
copyButton.addEventListener('click', copyResult);

const DICTATION_ENDED_TIMEOUT_MS = 20000;
const TRANSCRIPTION_TIMEOUT_MS = 2000;
let isRecording = false,
  resultText = '',
  silenceTimer = null,
  transcriptionTimer = null;

/**
 * Resets the silence timer and sets a new timeout.
 * If silence is detected for DICTATION_ENDED_TIMEOUT_MS, automatically stops recording.
 */
function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    if (isRecording) {
      toggleRecording();
      content.setAttribute('data-state', 'ended');
    }
  }, DICTATION_ENDED_TIMEOUT_MS);
}

/**
 * Resets the transcription timer and sets a new timeout.
 * If no transcription data is received for TRANSCRIPTION_TIMEOUT_MS, pauses the animated bars.
 */
function resetTranscriptionTimer() {
  clearTimeout(transcriptionTimer);
  transcriptionTimer = setTimeout(() => {
    if (isRecording) {
      animatedBars.classList.add('paused');
    }
  }, TRANSCRIPTION_TIMEOUT_MS);
}

/**
 * Toggles recording state: starts dictation or stops and processes result.
 * @returns {void}
 */
function toggleRecording() {
  // Start recording
  if (!isRecording) {
    isRecording = true;
    ui.send_message('start_dictation');

    title.textContent = 'Listening...';
    micButton.querySelector('img').src = './img/microphone-pause.svg';
    content.removeAttribute('data-state');

    resetSilenceTimer();
    resetTranscriptionTimer();
  } else {
    isRecording = false;
    clearTimeout(silenceTimer);
    clearTimeout(transcriptionTimer);
    ui.send_message('stop_dictation');

    title.textContent = 'Start your Dictation';
    micButton.querySelector('img').src = './img/microphone.svg';
    animatedBars.classList.add('paused');

    partialText.textContent = '';
  }
}

/**
 * Updates the opacity of the gradient overlay based on scroll position.
 * Shows gradient when scrolled down, hides when at the top.
 */
function updateGradientOpacity() {
  transcriptionArea.style.setProperty(
    '--gradient-opacity',
    transcriptionArea.scrollTop > 0 ? '1' : '0'
  );
}

/**
 * Starts a new recording session.
 * Resets the UI state and clears all previous transcription data.
 */
function startNewRecording() {
  isRecording = false;
  ui.send_message('new_recording');
  resultText = '';
  content.setAttribute('data-has-text', false);
  content.removeAttribute('data-state');

  partialText.textContent = '';
  fullText.textContent = '';

  toggleRecording();
}

/**
 * Copies the transcription result to clipboard.
 * Shows a confirmation icon briefly before reverting to the copy icon.
 */
function copyResult() {
  if (!resultText) {
    return;
  }

  const img = copyButton.querySelector('img');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(resultText)
      .then(() => {
        img.src = './img/copied.svg';
        setTimeout(() => {
          img.src = './img/copy.svg';
        }, 1500);
      })
      .catch(() => {
        copyFallback(img);
      });
  } else {
    copyFallback(img);
  }
}

/**
 * Fallback copy using a temporary textarea and execCommand.
 * Used when Clipboard API is unavailable or blocked (e.g. Safari).
 * @param {HTMLImageElement} img - The icon to update after copying.
 */
function copyFallback(img) {
  const textarea = document.createElement('textarea');
  textarea.value = resultText;
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand('copy');
    img.src = './img/copied.svg';
    setTimeout(() => {
      img.src = './img/copy.svg';
    }, 1500);
  } catch {
    // execCommand may fail, but we've already attempted the fallback
  }

  document.body.removeChild(textarea);
}

/**
 * Handles incoming transcription data from the backend.
 * Updates partial and full text in the UI and auto-scrolls to the bottom.
 * @param {{type: string, text: string}} data - Transcription data with type ('partial_text' or 'full_text') and text content.
 */
function onTranscription(data) {
  if (!isRecording) {
    return;
  }

  animatedBars.classList.remove('paused');
  resetTranscriptionTimer();

  content.setAttribute('data-has-text', data.text.length > 0);

  if (data.type === 'partial_text') {
    partialText.textContent = resultText ? ` ${data.text}` : data.text;
  } else if (data.type === 'full_text') {
    const trimmedText = data.text.trim();
    if (trimmedText) {
      resultText = resultText ? `${resultText} ${trimmedText}` : trimmedText;
      fullText.textContent = resultText;
    }
    partialText.textContent = '';
  }

  // Auto-scroll to bottom
  if (transcriptionArea) {
    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
  }

  resetSilenceTimer();
}
