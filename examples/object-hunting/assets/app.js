// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);
const errorContainer = document.getElementById('error-container');

// Game state
const targetObjects = ['book', 'bottle', 'chair', 'cup', 'cell phone'];
let foundObjects = [];
let gameStarted = false;

// UI Elements
const gameIntro = document.getElementById('game-intro');
const gameContent = document.getElementById('game-content');
const startGameBtn = document.getElementById('start-game-btn');
const objectsToFindList = document.getElementById('objects-to-find-list');
const videoFeedContainer = document.getElementById('videoFeedContainer');
const winScreen = document.getElementById('win-screen');
const playAgainBtn = document.getElementById('play-again-btn');

document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
    initializeConfidenceSlider();
    renderObjectsToFind();

    startGameBtn.addEventListener('click', startGame);
    playAgainBtn.addEventListener('click', resetGame);
});

function initSocketIO() {
    socket.on('connect', () => {
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    });

    socket.on('disconnect', () => {
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });

    socket.on('detection', async (message) => {
        if (gameStarted) {
            handleDetection(message);
        }
    });
}

function startGame() {
    gameStarted = true;
    gameIntro.classList.add('hidden');
    gameContent.classList.remove('hidden');
    updateFoundCounter();
}

function resetGame() {
    gameStarted = false;
    foundObjects = [];
    winScreen.classList.add('hidden');
    videoFeedContainer.classList.remove('hidden');
    gameIntro.classList.remove('hidden');
    gameContent.classList.add('hidden');
    renderObjectsToFind();
    updateFoundCounter();
}

function updateFoundCounter() {
    const chip = document.getElementById('found-counter-chip');
    if (chip) {
        chip.textContent = `${foundObjects.length}/5 found`;
    }
}

function renderObjectsToFind() {
    objectsToFindList.innerHTML = '';
    targetObjects.forEach(obj => {
        const item = document.createElement('div');
        item.id = `obj-${obj}`;
        item.className = 'object-item';

        const icon = document.createElement('img');
        icon.src = `./img/${obj}.svg`;
        icon.alt = `${obj} icon`;
        item.appendChild(icon);

        const text = document.createElement('span');
        text.textContent = obj;
        item.appendChild(text);

        objectsToFindList.appendChild(item);
    });
}

function handleDetection(detection) {
    const detectedObject = detection.content.toLowerCase();
    if (targetObjects.includes(detectedObject) && !foundObjects.includes(detectedObject)) {
        foundObjects.push(detectedObject);
        const foundItem = document.getElementById(`obj-${detectedObject}`);
        foundItem.classList.add('found');

        const foundIcon = document.createElement('img');
        foundIcon.src = './img/found-icon.svg';
        foundIcon.alt = 'Found';
        foundIcon.className = 'found-icon';
        foundItem.appendChild(foundIcon);

        updateFoundCounter();
        checkWinCondition();
    }
}

function checkWinCondition() {
    if (foundObjects.length === targetObjects.length) {
        gameStarted = false;
        videoFeedContainer.classList.add('hidden');
        winScreen.classList.remove('hidden');
    }
}

function initializeConfidenceSlider() {
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceResetButton = document.getElementById('confidenceResetButton');

    if (!confidenceSlider) return;

    confidenceSlider.addEventListener('input', updateConfidenceDisplay);
    confidenceInput.addEventListener('input', handleConfidenceInputChange);
    confidenceInput.addEventListener('blur', validateConfidenceInput);
    updateConfidenceDisplay();

    confidenceResetButton.addEventListener('click', (e) => {
        if (e.target.classList.contains('reset-icon') || e.target.closest('.reset-icon')) {
            resetConfidence();
        }
    });
}

function handleConfidenceInputChange() {
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceSlider = document.getElementById('confidenceSlider');

    let value = parseFloat(confidenceInput.value);

    if (isNaN(value)) value = 0.5;
    if (value < 0) value = 0;
    if (value > 1) value = 1;

    confidenceSlider.value = value;
    updateConfidenceDisplay();
}

function validateConfidenceInput() {
    const confidenceInput = document.getElementById('confidenceInput');
    let value = parseFloat(confidenceInput.value);

    if (isNaN(value)) value = 0.5;
    if (value < 0) value = 0;
    if (value > 1) value = 1;

    confidenceInput.value = value.toFixed(2);

    handleConfidenceInputChange();
}

function updateConfidenceDisplay() {
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceValueDisplay = document.getElementById('confidenceValueDisplay');
    const sliderProgress = document.getElementById('sliderProgress');

    if (!confidenceSlider) return;

    const value = parseFloat(confidenceSlider.value);
    socket.emit('override_th', value); // Send confidence to backend
    const percentage = (value - confidenceSlider.min) / (confidenceSlider.max - confidenceSlider.min) * 100;

    const displayValue = value.toFixed(2);
    confidenceValueDisplay.textContent = displayValue;

    if (document.activeElement !== confidenceInput) {
        confidenceInput.value = displayValue;
    }

    sliderProgress.style.width = percentage + '%';
    confidenceValueDisplay.style.left = percentage + '%';
}

function resetConfidence() {

    const confidenceSlider = document.getElementById('confidenceSlider');

    const confidenceInput = document.getElementById('confidenceInput');



    if (!confidenceSlider) return;



    confidenceSlider.value = '0.5';

    confidenceInput.value = '0.50';

    updateConfidenceDisplay();

}


