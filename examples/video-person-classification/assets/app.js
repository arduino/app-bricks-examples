// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const recentDetectionsElement = document.getElementById('recentClassifications');
const feedbackContentElement = document.getElementById('feedback-content');
const MAX_RECENT_SCANS = 5;
let scans = [];
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection
let errorContainer = document.getElementById('error-container');

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
    initializeConfidenceSlider();
    updateFeedback(false);
    renderClasses();

    // Popover logic
    const confidencePopoverText = "Minimum confidence score for detected faces. Lower values show more results but may include false positives.";
    const feedbackPopoverText = "When camera detects a face, an animation will appear here.";

    document.querySelectorAll('.info-btn.confidence').forEach(img => {
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = confidencePopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });

    document.querySelectorAll('.info-btn.feedback').forEach(img => {
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = feedbackPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });
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

    socket.on('classifications', async (message) => {
        printClassifications(message);
        renderClasses();
    });

}

function updateFeedback(hasDetections) {
    const greetings = ["Person classified!", "I know who you are!", "Gotcha!"];
    if (hasDetections) {
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        feedbackContentElement.innerHTML = `
            <img src="img/hand.gif" alt="Hand">
            <p>${randomGreeting}</p>
        `;
    } else {
        feedbackContentElement.innerHTML = `
            <img src="img/stars.svg" alt="Stars">
            <p class="feedback-text">System response will appear here</p>
        `;
    }
}

let lastChangeTimestamp = 0;
let currentState = 'non-person';
const UPDATE_INTERVAL = 2000; // 2 seconds

function printClassifications(newDetection) {
    scans.unshift(newDetection);
    if (scans.length > MAX_RECENT_SCANS) { scans.pop(); }

    // Parsing and handling the result for display
    try {
        const detections = JSON.parse(newDetection);
        const personDetection = detections.find(d => d.content && d.content.toLowerCase() === 'person');
        const newState = personDetection ? 'person' : 'non-person';
        const now = Date.now();

        if (newState !== currentState && (now - lastChangeTimestamp > UPDATE_INTERVAL)) {
            showDetection(newState);
            currentState = newState;
            lastChangeTimestamp = now;
        }
    } catch (e) {
        // In case of parsing error, show neutral state
        const now = Date.now();
        if ('non-person' !== currentState && (now - lastChangeTimestamp > UPDATE_INTERVAL)) {
            showDetection('non-person');
            currentState = 'non-person';
            lastChangeTimestamp = now;
        }
    }
}

function renderClasses() {
    // Clear the list
    recentDetectionsElement.innerHTML = ``;

    if (scans.length === 0) {
        recentDetectionsElement.innerHTML = `
            <div class="no-recent-scans">
                <img src="./img/no-face.svg">
                No person detected yet
            </div>
        `;
        return;
    }

    scans.forEach((iscan) => {
        try {
            const iiscan = JSON.parse(iscan);

            if (iiscan.length === 0) {
                return; // Skip empty detection arrays
            }

            iiscan.forEach((scan) => {
                const row = document.createElement('div');
                row.className = 'scan-container';

                // Create a container for content and time
                const cellContainer = document.createElement('span');
                cellContainer.className = 'scan-cell-container cell-border';

                // Content (text + icon)
                const contentText = document.createElement('span');
                contentText.className = 'scan-content';
                const value = scan.confidence;
                const result = Math.floor(value * 1000) / 10;
                contentText.innerHTML = `${result}% - ${scan.content}`;

                // Time
                const timeText = document.createElement('span');
                timeText.className = 'scan-content-time';
                timeText.textContent = new Date(scan.timestamp).toLocaleString('it-IT').replace(',', ' -');

                // Append content and time to the container
                cellContainer.appendChild(contentText);
                cellContainer.appendChild(timeText);

                row.appendChild(cellContainer);
                recentDetectionsElement.appendChild(row);
            });
        } catch (e) {
            console.error("Failed to parse scan data:", iscan, e);
            // Display an error in the list itself
            if(recentDetectionsElement.getElementsByClassName('scan-error').length === 0) {
                const errorRow = document.createElement('div');
                errorRow.className = 'scan-error';
                errorRow.textContent = `Error processing detection data. Check console for details.`;
                recentDetectionsElement.appendChild(errorRow);
            }
        }
    });
}


function initializeConfidenceSlider() {
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceResetButton = document.getElementById('confidenceResetButton');

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

    confidenceSlider.value = '0.5';
    confidenceInput.value = '0.50';
    updateConfidenceDisplay();
}

function showDetection(result) {
    const display = feedbackContentElement;
    display.innerHTML = ''; // Clear previous content

    if (result === 'person') {
        // Show hand and text as before
        const handImg = document.createElement('img');
        handImg.src = 'img/hand.gif';
        handImg.alt = 'Hand';
        handImg.style.width = '100px';

        const text = document.createElement('div');
        text.textContent = 'Person detected!';
        text.className = 'detection-text';

        display.appendChild(handImg);
        display.appendChild(text);
    } else {
        // Show no-face.svg and the text "non-person detected!"
        const starsImg = document.createElement('img');
        starsImg.src = 'img/no-face.svg';
        starsImg.alt = 'No-face';
        starsImg.style.width = '100px';

        const text = document.createElement('div');
        text.textContent = 'non-person detected!';
        text.className = 'detection-text';

        display.appendChild(starsImg);
        display.appendChild(text);
    }
}
