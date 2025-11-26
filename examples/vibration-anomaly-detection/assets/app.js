// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const maxSamples = 200;
const samples = [];
let errorContainer;

const recentAnomaliesElement = document.getElementById('recentClassifications');
let anomalies = [];
const MAX_RECENT_ANOMALIES = 5;

let hasDataFromBackend = false; // New global flag

const accelerometerDataDisplay = document.getElementById('accelerometer-data-display');
const noAccelerometerDataPlaceholder = document.getElementById('no-accelerometer-data');

function drawPlot() {
  if (!hasDataFromBackend) return; // Only draw if we have data

  const currentWidth = canvas.clientWidth;
  const currentHeight = canvas.clientHeight;

  if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
    canvas.width = currentWidth;
    canvas.height = currentHeight;
  }
  // Clear the canvas before drawing the new frame!
  ctx.clearRect(0, 0, currentWidth, currentHeight);
  // All grid lines (every 0.5) - same size
  ctx.strokeStyle = '#31333F99';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i=0; i<=8; i++){
    const y = 10 + i*((currentHeight-20)/8);
    ctx.moveTo(40,y);
    ctx.lineTo(currentWidth,y);
  }
  ctx.stroke();

  // Y-axis labels (-2.0 to 2.0 every 0.5)
  ctx.fillStyle = '#666';
  ctx.font = '400 14px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i=0; i<=8; i++) {
    const y = 10 + i*((currentHeight-20)/8);
    const value = (4.0 - i * 1.0).toFixed(1);
    ctx.fillText(value, 35, y);
  }

  // draw each series
  function drawSeries(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0;i<samples.length;i++){
      const s = samples[i];
      const x = 40 + (i/(maxSamples-1))*(currentWidth-40);
      const v = s[key];
      const y = (currentHeight/2) - (v * ((currentHeight-20)/8));
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  drawSeries('x','#0068C9');
  drawSeries('y','#FF9900');
  drawSeries('z','#FF2B2B');
}

function pushSample(s){
  samples.push(s);
  if (samples.length>maxSamples) samples.shift();
  if (!hasDataFromBackend) { // Check if this is the first data received
    hasDataFromBackend = true;
    renderAccelerometerData();
  }
  drawPlot();
}

/*
 * Socket initialization. We need it to communicate with the server
 */
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

const feedbackContentWrapper = document.getElementById('feedback-content-wrapper');
let feedbackTimeout;

// ... (existing code between)

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
    renderAccelerometerData(); // Initial render for accelerometer
    renderAnomalies(); // Initial render for anomalies
    updateFeedback(null); // Initial feedback state
    initializeConfidenceSlider(); // Initialize the confidence slider

    // Popover logic
    document.querySelectorAll('.info-btn.confidence').forEach(img => {
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });

    document.querySelectorAll('.info-btn.accelerometer-data').forEach(img => {
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });
});

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

    let value = parseInt(confidenceInput.value, 10);

    if (isNaN(value)) value = 5;
    if (value < 1) value = 1;
    if (value > 10) value = 10;

    confidenceSlider.value = value;
    updateConfidenceDisplay();
}

function validateConfidenceInput() {
    const confidenceInput = document.getElementById('confidenceInput');
    let value = parseInt(confidenceInput.value, 10);

    if (isNaN(value)) value = 5;
    if (value < 1) value = 1;
    if (value > 10) value = 10;

    confidenceInput.value = value.toFixed(0);

    handleConfidenceInputChange();
}

function updateConfidenceDisplay() {
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceValueDisplay = document.getElementById('confidenceValueDisplay');
    const sliderProgress = document.getElementById('sliderProgress');

    const value = parseFloat(confidenceSlider.value);
    socket.emit('override_th', value / 10); // Send scaled confidence to backend (0.1 to 1.0)
    const percentage = (value - confidenceSlider.min) / (confidenceSlider.max - confidenceSlider.min) * 100;

    const displayValue = value.toFixed(0);
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

    confidenceSlider.value = '5';
    confidenceInput.value = '5';
    updateConfidenceDisplay();
}

function initSocketIO() {
    socket.on('anomaly_detected', async (message) => {
        if (!hasDataFromBackend) { // Check if this is the first data received
            hasDataFromBackend = true;
            renderAccelerometerData();
        }
        printAnomalies(message);
        renderAnomalies();
        try {
            const parsedAnomaly = JSON.parse(message);
            updateFeedback(parsedAnomaly.score); // Pass the anomaly score
        } catch (e) {
            console.error("Failed to parse anomaly message for feedback:", message, e);
            updateFeedback(null); // Fallback to no anomaly feedback
        }
    });

    socket.on('sample', (s) => {
      pushSample(s);
    });

    socket.on('connect', () => {
      if (errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.textContent = '';
      }
    });

    socket.on('disconnect', () => {
      errorContainer = document.getElementById('error-container');
      if (errorContainer) {
        errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
        errorContainer.style.display = 'block';
      }
    });
}

// ... (existing printAnomalies and renderAnomalies functions)

function updateFeedback(anomalyScore = null) {
    clearTimeout(feedbackTimeout); // Clear any existing timeout

    if (!hasDataFromBackend) {
        feedbackContentWrapper.innerHTML = `
            <div class="feedback-content">
                <img src="./img/no-data.png" alt="No Data">
                <p class="feedback-text">No data</p>
            </div>
        `;
        return;
    }

    if (anomalyScore !== null) { // Anomaly detected
        feedbackContentWrapper.innerHTML = `
            <div class="feedback-content">
                <img src="./img/bad.svg" alt="Anomaly Detected">
                <p class="feedback-text">Anomaly detected: ${anomalyScore.toFixed(2)}</p>
            </div>
        `;
        feedbackTimeout = setTimeout(() => {
            updateFeedback(null); // Reset after 3 seconds
        }, 3000);
    } else { // No anomaly or reset
        feedbackContentWrapper.innerHTML = `
            <div class="feedback-content">
                <img src="./img/good.svg" alt="No Anomalies">
                <p class="feedback-text">No anomalies</p>
            </div>
        `;
    }
}

function printAnomalies(newAnomaly) {
    anomalies.unshift(newAnomaly);
    if (anomalies.length > MAX_RECENT_ANOMALIES) { anomalies.pop(); }
}

function renderAnomalies() {
    recentAnomaliesElement.innerHTML = ``; // Clear the list

    if (anomalies.length === 0) {
        recentAnomaliesElement.innerHTML = `
            <div class="no-recent-anomalies">
                <img src="./img/no-data.png">
                <p>No recent anomalies</p>
            </div>
        `;
        return;
    }

    anomalies.forEach((anomaly) => {
        try {
            const parsedAnomaly = JSON.parse(anomaly);

            if (Object.keys(parsedAnomaly).length === 0) {
                return; // Skip empty anomaly objects
            }

            const listItem = document.createElement('li');
            listItem.className = 'anomaly-list-item';

            const score = parsedAnomaly.score.toFixed(1);
            const date = new Date(parsedAnomaly.timestamp);

            const timeString = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');

            listItem.innerHTML = `
                <span class="anomaly-score">${score}</span>
                <span class="anomaly-text">Anomaly</span>
                <span class="anomaly-time">${timeString} - ${dateString}</span>
            `;

            recentAnomaliesElement.appendChild(listItem);

        } catch (e) {
            console.error("Failed to parse anomaly data:", anomaly, e);
            if(recentAnomaliesElement.getElementsByClassName('anomaly-error').length === 0) {
                const errorRow = document.createElement('div');
                errorRow.className = 'anomaly-error';
                errorRow.textContent = `Error processing anomaly data. Check console for details.`;
                recentAnomaliesElement.appendChild(errorRow);
            }
        }
    });
}

function renderAccelerometerData() {
    if (hasDataFromBackend) {
        accelerometerDataDisplay.style.display = 'block';
        noAccelerometerDataPlaceholder.style.display = 'none';
        drawPlot();
    } else {
        accelerometerDataDisplay.style.display = 'none';
        noAccelerometerDataPlaceholder.style.display = 'flex'; // Use flex for centering content
    }
}
