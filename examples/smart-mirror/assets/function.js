// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const scanBox = document.querySelector('#scanBox');
const scanBoxTitle = document.querySelector('#scanBoxTitle');
const scanBoxDescription = document.querySelector('#scanBoxDescription');
const scanButton = document.querySelector('#scanButton');
const videoIframe = document.querySelector('#videoIframe');

// Minimum duration (in ms) to show scanning animation before displaying results
const MINIMUM_SCAN_DURATION = 3000;

let startScanCountdown = null;
let analysisPhrasesInterval = null;
let scanStartTime = null;

/**
 * Update button with image and text content
 * Dynamically sets button click handler and renders image with label
 * @param {Object} config - Button configuration
 * @param {string} config.text - Button text content (also used as image alt text)
 * @param {string} config.imageSrc - Image source path
 * @param {Function} config.onClick - Click handler function
 */
function updateButton(config) {
  scanButton.onclick = config.onClick;
  scanButton.innerHTML = `<img src="${config.imageSrc}" alt="${config.text}" /> ${config.text}`;
}

/**
 * Load the webcam stream from the embedded device
 * Attempts to connect to the embedded video stream
 * Retries connection every second if initial load fails
 */
function loadWebcam() {
  const streamUrl = `http://${window.location.hostname}:4912/embed`;

  let intervalId;

  const startLoading = async () => {
    try {
      await fetch(streamUrl);
      clearInterval(intervalId);
      videoIframe.src = streamUrl;
    } catch {
      // Server not reachable yet, interval will retry
    }
  };

  videoIframe.onload = () => {
    videoIframe.style.display = 'block';
  };

  intervalId = setInterval(startLoading, 1000);
  startLoading();
}

/**
 * Initiate scan with 4-second countdown preparation phase
 * Sets up countdown display and transitions to analysis phase when complete
 */
function prepareScan() {
  scanBox.setAttribute('data-state', 'preparing');
  scanBoxTitle.textContent = 'Check yourself out';
  scanBoxDescription.className = '';
  updateButton({
    imageSrc: './img/cancel.svg',
    text: 'Cancel scan',
    onClick: cancelScan,
  });

  let countdown = 4;
  scanBoxDescription.innerHTML = `Scanning in <b>&nbsp;${countdown}</b>`;

  startScanCountdown = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      scanBoxDescription.innerHTML = `Scanning in <b>&nbsp;${countdown}</b>`;
    } else {
      clearInterval(startScanCountdown);
      startScan();
    }
  }, 1000);
}

/**
 * Execute the analysis phase with looping animation phrases
 * Cycles through 5 status phrases every 1.2 seconds continuously
 * Records scan start time to enforce minimum visibility duration
 * Animation continues indefinitely until showScanResult() is called
 */
function startScan() {
  scanBox.setAttribute('data-state', 'analysing');
  scanBoxTitle.textContent = 'Analysing...';
  scanStartTime = Date.now();

  const phrases = [
    'I am capturing your look',
    'I am reading your colors',
    'I am detecting your overall style',
    'I am matching patterns and details',
    'I am finalising personalization',
  ];

  let currentPhraseIndex = 0;
  scanBoxDescription.textContent = phrases[currentPhraseIndex];
  currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;

  analysisPhrasesInterval = setInterval(() => {
    scanBoxDescription.textContent = phrases[currentPhraseIndex];
    currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
  }, 1200);

  ui.send_message('start_scan');
}

/**
 * Return to initial state with primary call-to-action button
 * Resets all UI elements and display to ready for new scan
 */
function resetToInitialState() {
  scanBox.setAttribute('data-state', 'initial');
  scanBoxTitle.textContent = 'Get a real-time style tip based on your outfit';
  updateButton({
    text: 'Scan your look',
    imageSrc: './img/play.svg',
    onClick: prepareScan,
  });
}

/**
 * Cancel current scan and clean up all active timers
 * Stops countdown and phrase animation, returns to initial state
 */
function cancelScan() {
  if (startScanCountdown) {
    clearInterval(startScanCountdown);
  }

  if (analysisPhrasesInterval) {
    clearInterval(analysisPhrasesInterval);
  }

  resetToInitialState();
}

/**
 * Display scan results after enforcing minimum animation duration
 * If analysis-result arrives before MINIMUM_SCAN_DURATION (2.5s), waits until duration is met
 * Then displays result text and shows 'Scan again' button
 * Ensures animation is visible long enough for user to perceive the scanning process
 */
function showScanResult(result) {
  const elapsed = Date.now() - scanStartTime;
  const remainingTime = Math.max(0, MINIMUM_SCAN_DURATION - elapsed);

  setTimeout(() => {
    if (analysisPhrasesInterval) {
      clearInterval(analysisPhrasesInterval);
    }

    scanBox.setAttribute('data-state', 'result');
    scanBoxTitle.textContent = 'The mirror says:';
    scanBoxDescription.textContent = result;

    const threshold = window.matchMedia('(max-width: 768px)').matches
      ? 250
      : 500;

    if (result.length > threshold) {
      scanBoxDescription.className = 'long-result';
    }

    updateButton({
      text: 'Scan again',
      imageSrc: './img/restart.svg',
      onClick: prepareScan,
    });
  }, remainingTime);
}
