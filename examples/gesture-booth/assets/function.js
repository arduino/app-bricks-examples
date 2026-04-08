// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const animatedGesture = document.querySelector('#animatedGesture');
const bottomCta = document.querySelector('#bottomCta');
const content = document.querySelector('#content');
const countdown = document.querySelector('#countdown');
const icon = document.querySelector('#icon');
const mainCta = document.querySelector('#mainCta');
const resultImage = document.querySelector('#resultImage');
const subtitle = document.querySelector('#subtitle');
const title = document.querySelector('#title');
const videoFeed = document.querySelector('#videoFeed');
const videoOverlay = document.querySelector('#videoOverlay');
const videoPlaceholder = document.querySelector('#videoPlaceholder');

let countdownInterval,
  resetTimeout,
  gestureLockedTimeout,
  latestGestureDetected = 'None',
  isGestureLocked = false,
  isTakingPicture = false,
  isResultReady = false;

const LOTTIE_DATA = {
  ['Victory']: { src: 'victory.json', label: 'Victory' },
  ['Thumb Up']: {
    src: 'thumb_up.json',
    label: 'Thumbs Up',
  },
  ['Thumb Down']: {
    src: 'thumb_down.json',
    label: 'Thumbs Down',
  },
  ['Pointing Up']: { src: 'pointing_up.json', label: 'Index Up' },
  ['Closed Fist']: { src: 'closed_fist.json', label: 'Fist' },
  ['Open Palm']: { src: 'open_palm.json', label: 'Wave' },
  ['Rock']: { src: 'rock.json', label: 'Love You' },
};

/**
 * Load the webcam stream from the embedded device.
 * Attempts to connect to the embedded video stream.
 * Retries connection every second if initial load fails.
 */
function loadWebcam() {
  const streamUrl = `http://${window.location.hostname}:5002/stream`;
  videoFeed.src = streamUrl;
  videoFeed.onload = () => {
    videoFeed.style.display = 'block';
    videoPlaceholder.style.display = 'none';
  };
}

/**
 * Reset UI to initial scanning state.
 * Called after user clicks retry or when resetting application.
 */
function resetToInitialState() {
  content.setAttribute('data-state', 'initial');
  clearInterval(countdownInterval);
  clearTimeout(gestureLockedTimeout);
  clearTimeout(resetTimeout);
  latestGestureDetected = 'None';
  isGestureLocked = false;
  isTakingPicture = false;
  isResultReady = false;

  title.className = 'title-primary';
  title.textContent = 'Try one of these gestures';

  mainCta.textContent = 'Take Picture';
  mainCta.onclick = takePicture;

  countdown.className = '';
  resultImage.src = '';
}

/**
 * Handle a gesture detection event.
 * If a valid gesture is recognised, updates the UI with the corresponding
 * animation and video overlay.
 * If no valid gesture is detected ('None') for a continuous period of 5 seconds,
 * the current session is terminated and the UI resets to the initial view.
 * @param {Object} event - The gesture detection event object.
 * @param {string} event.gesture - The name of the detected gesture (e.g., 'Victory', 'Closed Fist'),
 *   or 'None' when no gesture is currently recognised.
 */
function handleGestureDetected(event) {
  if (
    event.gesture === latestGestureDetected ||
    isGestureLocked ||
    isResultReady
  ) {
    return;
  }

  latestGestureDetected = event.gesture;

  if (event.gesture === 'None') {
    resetTimeout = setTimeout(() => {
      resetToInitialState();
    }, 5000);

    return;
  }

  clearTimeout(resetTimeout);

  // Lock the gesture for 5 seconds
  isGestureLocked = true;
  gestureLockedTimeout = setTimeout(() => {
    isGestureLocked = false;
  }, 2000);

  const gestureData = LOTTIE_DATA[latestGestureDetected];

  // Set video overlay
  videoOverlay.load(`./img/overlays/animated/${gestureData.src}`);

  if (!isTakingPicture) {
    content.setAttribute('data-state', 'gesture-recognized');

    // Set gesture label
    title.textContent = gestureData.label;
    title.className = 'title-secondary';

    // Set gesture animation
    animatedGesture.load(`./img/gestures/animated/${gestureData.src}`);
  }
}

/**
 * Handle case when no gesture is recognized while taking a picture.
 * Displays error message and retry option to user.
 */
function handleNoGestureDetected() {
  clearInterval(countdownInterval);
  content.setAttribute('data-state', 'no-gesture-recognized');

  icon.src = './img/no-gesture-recognized.svg';
  title.textContent = 'No gesture recognized';
  subtitle.textContent = 'Please try again';
  bottomCta.innerHTML =
    '<img src="./img/restart.svg" alt="Try again" /> Try Again';
}

/**
 * Initiate the picture taking sequence.
 * Displays countdown from 5 to 1, then triggers flash effect and sends take_picture event.
 */
function takePicture() {
  content.setAttribute('data-state', 'take-picture');
  isTakingPicture = true;
  icon.src = './img/camera.svg';
  title.textContent = 'Keep the gesture visible';
  bottomCta.innerHTML = '<img src="./img/stop.svg" alt="Stop" /> Stop';

  let count = 5;
  countdown.textContent = count;

  countdownInterval = setInterval(() => {
    count--;
    countdown.textContent = count || '';

    if (count < 1) {
      clearInterval(countdownInterval);

      if (latestGestureDetected === 'None') {
        handleNoGestureDetected();
      } else {
        isTakingPicture = false;
        countdown.className = 'shoot';

        setTimeout(() => {
          showResult();
        }, 100);
      }
    }
  }, 1000);
}

/**
 * Display the detection result image.
 * Shows the captured photo with applied effects/overlays.
 */
function showResult() {
  isResultReady = true;
  content.setAttribute('data-state', 'picture-ready');

  const canvas = document.createElement('canvas');
  canvas.width = videoFeed.naturalWidth;
  canvas.height = videoFeed.naturalHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(videoFeed, 0, 0);

  const gestureData = LOTTIE_DATA[latestGestureDetected];
  const overlayImg = new Image();
  overlayImg.onload = () => {
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    resultImage.src = canvas.toDataURL('image/png');
  };
  overlayImg.src = `./img/overlays/static/${gestureData.src.replace('.json', '.svg')}`;

  icon.src = './img/heart-eyes-face.svg';
  title.textContent = 'Amazing!';
  subtitle.textContent = 'Download your picture and try another gesture';

  mainCta.innerHTML = '<img src="./img/download.svg" /> Download';
  mainCta.onclick = () => downloadPicture(resultImage.src);
  bottomCta.innerHTML = '<img src="./img/restart.svg" /> Take another picture';
}

/**
 * Download the captured picture.
 * Creates a temporary download link and triggers file download.
 * @param {string} imageSrc - Data URL of the image
 */
function downloadPicture(imageSrc) {
  const link = document.createElement('a');
  link.href = imageSrc;
  link.download = 'Gesture Booth picture.png';
  link.click();
}
