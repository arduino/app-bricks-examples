// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

// Global variables to hold the application state
let socket;
let currentAudio = null; // This will hold base64 data for UPLOADED files only
let resultAudio = null;

let currentAudioSource = 'sample'; // 'sample' or 'upload'
let sampleAudios = []; // Array of sample audio filenames
let selectedSampleAudio = null; // Filename of the selected sample audio
let errorContainer = document.getElementById('error-container');


/*
 * Socket initialization: required for communication with the server.
 * Also initializes all elements used in the Audio Classification UI, which are manipulated throughout the application's lifecycle.
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initSocketIO();

    // Popover logic
    const confidencePopoverText = "Minimum confidence score for detected audio. Lower values show more results but may include false positives.";

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
});

/**
 * Initializes all UI elements and attaches event listeners.
 */
function initializeElements() {
    const audioInput = document.getElementById('audioInput');
    const audioPreview = document.getElementById('audioPreview');
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceResetButton = document.getElementById('confidenceResetButton');
    const classifyButton = document.getElementById('classifyButton');
    const uploadNewButton = document.getElementById('uploadNewButton');

    const sampleAudioBtn = document.getElementById('sampleAudioBtn');
    const uploadAudioBtn = document.getElementById('uploadAudioBtn');
    errorContainer = document.getElementById('error-container');

    // Set initial confidence to 0.5
    confidenceSlider.value = '0.5';
    confidenceInput.value = '0.50';

    audioInput.addEventListener('change', handleAudioUpload);
    audioPreview.addEventListener('click', () => {
        if (!currentAudio && currentAudioSource === 'upload') {
            audioInput.click();
        }
    });

    // Drag and drop functionality (only when in upload mode)
    audioPreview.addEventListener('dragover', (e) => {
        if (currentAudioSource === 'upload') {
            e.preventDefault();
            audioPreview.classList.add('drag-over');
        }
    });

    audioPreview.addEventListener('dragleave', () => {
        audioPreview.classList.remove('drag-over');
    });

    audioPreview.addEventListener('drop', (e) => {
        if (currentAudioSource === 'upload') {
            e.preventDefault();
            audioPreview.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                handleAudioFile(files[0]);
            }
        }
    });

    // Confidence slider and input
    confidenceSlider.addEventListener('input', updateConfidenceDisplay);
    confidenceInput.addEventListener('input', handleConfidenceInputChange);
    confidenceInput.addEventListener('blur', validateConfidenceInput);
    updateConfidenceDisplay();

    confidenceResetButton.addEventListener('click', (e) => {
        if (e.target.classList.contains('reset-icon') || e.target.closest('.reset-icon')) {
            resetConfidence();
        }
    });

    // Source selection buttons
    sampleAudioBtn.addEventListener('click', () => switchAudioSource('sample'));
    uploadAudioBtn.addEventListener('click', () => switchAudioSource('upload'));

    // Buttons
    classifyButton.addEventListener('click', runClassification);
    uploadNewButton.addEventListener('click', uploadNewAudio);

    // Load sample audios on startup
    loadSampleAudios();
}

/**
 * Switches the UI between 'sample' and 'upload' modes.
 */
function switchAudioSource(source) {
    currentAudioSource = source;
    const sampleAudioBtn = document.getElementById('sampleAudioBtn');
    const uploadAudioBtn = document.getElementById('uploadAudioBtn');
    const sampleAudiosGrid = document.getElementById('sampleAudiosGrid');
    const audioPreview = document.getElementById('audioPreview');
    const audioPlayerContainer = document.getElementById('audioPlayerContainer');

    // Update button states
    sampleAudioBtn.classList.toggle('active', source === 'sample');
    uploadAudioBtn.classList.toggle('active', source === 'upload');

    // Show/hide appropriate containers
    if (source === 'sample') {
        sampleAudiosGrid.style.display = 'flex';
        audioPreview.style.display = 'none';
        if (audioPlayerContainer) audioPlayerContainer.style.display = 'none';

        if (selectedSampleAudio) {
            setButtonState('ready');
        } else {
            setButtonState('initial');
        }

        currentAudio = null;
    } else {
        sampleAudiosGrid.style.display = 'none';
        audioPreview.style.display = 'flex';

        if (currentAudio) {
            setButtonState('ready');
        } else {
            setButtonState('initial');
        }
    }

    clearStatus();
}

/**
 * Loads the list of sample audio files.
 * In a real application, this might be an API call.
 */
function loadSampleAudios() {
    const sampleAudiosGrid = document.getElementById('sampleAudiosGrid');

    if (!sampleAudiosGrid) {
        return;
    }

    // load the files from the audio folder
    const localAudioFiles = [
        '1_glass_breaking.wav',
        '2_glass_breaking.wav',
        '3_background.wav'
    ];

    // Simulate backend response
    sampleAudios = localAudioFiles;
    renderSampleAudios();

    // Set correct state
    if (currentAudioSource === 'sample') {
        if (sampleAudios.length === 0) {
            setButtonState('initial');
        }
    }
}

/**
 * Renders the loaded sample audios into the UI grid.
 */
function renderSampleAudios() {
    const sampleAudiosGrid = document.getElementById('sampleAudiosGrid');

    if (!sampleAudiosGrid) {
        return;
    }

    if (!sampleAudios || sampleAudios.length === 0) {
        sampleAudiosGrid.innerHTML = '<div class="sample-audios-loading">No sample audios available</div>';
        return;
    }

    const html = sampleAudios.map((audio, index) => `
        <div class="sample-audio-item" data-index="${index}">
            <div class="audio-info-container" onclick="selectSampleAudio(${index})">
                <div class="audio-icon">🎵</div>
                <span class="audio-name">${audio}</span>
            </div>
            <audio controls controlsList="noplaybackrate" src="audio/${audio}" preload="none" class="sample-audio-player"></audio>
        </div>
    `).join('');

    sampleAudiosGrid.innerHTML = html;

    // Add event listeners to stop other audios when one starts playing
    document.querySelectorAll('.sample-audio-player').forEach(player => {
        player.addEventListener('play', (e) => {
            document.querySelectorAll('.sample-audio-player').forEach(otherPlayer => {
                if (otherPlayer !== e.target) {
                    otherPlayer.pause();
                }
            });
        });
    });
}

/**
 * Handles the selection of a sample audio from the grid.
 */
function selectSampleAudio(index) {
    selectedSampleAudio = sampleAudios[index];
    currentAudio = null;

    // Update visual selection
    document.querySelectorAll('.sample-audio-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });

    // Hide audio player if it was visible
    const audioPlayerContainer = document.getElementById('audioPlayerContainer');
    if (audioPlayerContainer) {
        audioPlayerContainer.style.display = 'none';
    }

    setButtonState('ready');
    const audioSourceSelection = document.querySelector('.image-source-selection');
    if (audioSourceSelection) audioSourceSelection.style.display = 'flex';
    clearStatus();
}

/**
 * Triggered when a user selects a file from the upload dialog.
 */
function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleAudioFile(file);
    }
}

/**
 * Processes the selected audio file (from upload or drag-and-drop).
 * Reads the file as a Data URL to prepare it for sending and playback.
 */
function handleAudioFile(file) {
    if (!file.type.startsWith('audio/')) {
        showError('Please select a valid audio file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentAudio = e.target.result.split(',')[1];

        const audioPreview = document.getElementById('audioPreview');
        const audioPlayer = document.getElementById('audioPlayer');
        const audioPlayerContainer = document.getElementById('audioPlayerContainer');
        const audioInfo = document.getElementById('audioInfo');

        // Hide upload area and show player
        if (audioPreview) audioPreview.style.display = 'none';
        if (audioPlayerContainer) audioPlayerContainer.style.display = 'block';

        if (audioPlayer) {
            audioPlayer.src = e.target.result;
        }
        if (audioInfo) {
            audioInfo.textContent = `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) | Processing time: --`;
        }

        setButtonState('ready');
        clearStatus();
    };
    reader.readAsDataURL(file);
}

/**
 * Resets the entire UI to its initial state for a new classification.
 */
function uploadNewAudio() {
    currentAudio = null;
    resultAudio = null;
    selectedSampleAudio = null;

    // Clear selections
    document.querySelectorAll('.sample-audio-item').forEach(item => {
        item.classList.remove('selected');
        item.style.display = ''; // Reset display style to default
    });

    setSampleAudiosDisabled(false);

    // Reset audio display
    resetAudioDisplay();

    // Reset input
    const audioInput = document.getElementById('audioInput');
    if (audioInput) audioInput.value = '';

    // Hide classification results table
    const classificationResults = document.getElementById('classificationResults');
    if (classificationResults) {
        classificationResults.style.display = 'none';
        classificationResults.innerHTML = '';
    }

    // Switch to sample mode by default
    switchAudioSource('sample');
    setButtonState('initial');
    clearStatus();

    // Show the selection source buttons again
    const audioSourceSelection = document.querySelector('.image-source-selection');
    if (audioSourceSelection) {
        audioSourceSelection.style.display = 'flex';
    }
}

// Handle confidence input change
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

// Update confidence display
function updateConfidenceDisplay() {
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceValueDisplay = document.getElementById('confidenceValueDisplay');
    const sliderProgress = document.getElementById('sliderProgress');

    const value = parseFloat(confidenceSlider.value);
    const percentage = (value - confidenceSlider.min) / (confidenceSlider.max - confidenceSlider.min) * 100;

    const displayValue = value.toFixed(2);
    if (confidenceValueDisplay) confidenceValueDisplay.textContent = displayValue;

    if (document.activeElement !== confidenceInput) {
        confidenceInput.value = displayValue;
    }

    if (sliderProgress) sliderProgress.style.width = percentage + '%';
    if (confidenceValueDisplay) confidenceValueDisplay.style.left = percentage + '%';
}

// Reset confidence
function resetConfidence() {
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');

    confidenceSlider.value = '0.5';
    confidenceInput.value = '0.50';
    updateConfidenceDisplay();
}

/**
 * Initializes the Socket.IO connection and sets up event listeners
 * for messages from the backend server.
 */
function initSocketIO() {
    socket = io(`http://${window.location.host}`);

    socket.on('connect', () => {
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    });

    // Handles the final classification result from the server
    socket.on('classification_complete', handleClassificationResult);

    socket.on('classification_error', (data) => {
        showError(`Audio classification failed: ${data.message}`);
        setButtonState('ready');
    });

    socket.on('disconnect', () => {
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });
}

/**
 * Processes the classification result received from the server
 * and updates the UI accordingly.
 */
function handleClassificationResult(data) {
    if (data.error) {
        showError(`Classification failed: ${data.error}`);
        setButtonState('ready');
        return;
    }

    // Check if we have a list of results or a single result
    if (data.classifications && Array.isArray(data.classifications)) {
        displayMultipleClassificationResults(data.classifications, data.processing_time);
    } else if (data.classification) {
        displayClassificationResults(data.classification, data.processing_time);
    } else if (data.results) {
        if (Array.isArray(data.results)) {
            displayMultipleClassificationResults(data.results, data.processing_time);
        } else {
            displayClassificationResults(data.results, data.processing_time);
        }
    } else {
        showError('No classification results received');
    }
    setButtonState('completed');
}

function displayClassificationResults(classification, processingTime) {
    // Convert single result to array to use the same function
    const classifications = [classification];
    displayMultipleClassificationResults(classifications, processingTime);
}

/**
 * Renders the classification results into a table in the UI.
 */
function displayMultipleClassificationResults(classifications, processingTime) {
    const classificationResults = document.getElementById('classificationResults');

    if (!classificationResults) {
        return;
    }

    // Update audioInfo with processing time
    const audioInfo = document.getElementById('audioInfo');
    if (audioInfo && processingTime) {
        const currentText = audioInfo.textContent;
        if (currentText.includes('Processing time:')) {
            audioInfo.textContent = currentText.replace(/Processing time: .+/, `Processing time: ${processingTime.toFixed(1)} ms`);
        } else {
            audioInfo.textContent = `${currentText} | Processing time: ${processingTime.toFixed(1)} ms`;
        }
    }

    // Create HTML table
    const tableHTML = `
        <div class="results-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Class</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${classifications.map(result => {
                        // Check if confidence is already in percentage (> 1) or in decimal (0-1)
                        const confidenceValue = result.confidence > 1 ? result.confidence : result.confidence * 100;
                        return `<tr><td class="class-name">${result.class_name}</td><td class="confidence">${confidenceValue.toFixed(1)}%</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    classificationResults.innerHTML = tableHTML;
    classificationResults.style.display = 'block';
}

/**
 * Main function to start the classification process.
 * It gathers all necessary data (audio, confidence) and sends it
 * to the backend in a single 'run_classification' event.
 */
function runClassification() {
    const classificationResults = document.getElementById('classificationResults');
    if (classificationResults) {
        classificationResults.style.display = 'none';
        classificationResults.innerHTML = '';
    }

    setButtonState('classifying');
    if (currentAudioSource === 'sample') {
        document.querySelectorAll('.sample-audio-item').forEach(item => {
            if (!item.classList.contains('selected')) {
                item.style.display = 'none';
            }
        });
    } else {
        setSampleAudiosDisabled(true);
    }

    const confidence = parseFloat(document.getElementById('confidenceSlider').value);
    const payload = { confidence: confidence };

    if (currentAudioSource === 'upload') {
        if (currentAudio) {
            payload.audio_data = currentAudio;
            socket.emit('run_classification', payload);
        } else {
            showError('No audio uploaded for classification');
            setButtonState('ready');
            setSampleAudiosDisabled(false);
        }
    } else if (currentAudioSource === 'sample') {
        if (selectedSampleAudio) {
            payload.selected_file = selectedSampleAudio;
            socket.emit('run_classification', payload);
        } else {
            showError('No sample audio selected for classification');
            setButtonState('ready');
            setSampleAudiosDisabled(false);
        }
    }
}

/**
 * Manages the state of the main action buttons (e.g., hiding/showing, enabling/disabling).
 */
function setButtonState(state) {
    const classifyButton = document.getElementById('classifyButton');
    const uploadNewButton = document.getElementById('uploadNewButton');
    const audioSourceSelection = document.querySelector('.image-source-selection');

    switch (state) {
        case 'initial':
            if (classifyButton) classifyButton.style.display = 'none';
            if (uploadNewButton) uploadNewButton.style.display = 'none';
            if (audioSourceSelection) audioSourceSelection.style.display = 'flex';
            break;
        case 'ready':
            if (classifyButton) {
                classifyButton.style.display = 'inline-block';
                classifyButton.disabled = false;
                classifyButton.textContent = 'Run Classification ▶';
            }
            if (uploadNewButton) uploadNewButton.style.display = 'flex';
            if (audioSourceSelection) audioSourceSelection.style.display = 'none';
            break;
        case 'classifying':
            if (classifyButton) classifyButton.style.display = 'none';
            if (uploadNewButton) uploadNewButton.style.display = 'none';
            if (audioSourceSelection) audioSourceSelection.style.display = 'none';
            break;
        case 'completed':
            if (classifyButton) {
                classifyButton.style.display = 'inline-block';
                classifyButton.disabled = false;
                classifyButton.textContent = 'Run Again ▶';
            }
            if (uploadNewButton) uploadNewButton.style.display = 'flex';
            if (audioSourceSelection) audioSourceSelection.style.display = 'none';
            break;
    }
}

/**
 * Displays a status message in the UI.
 */
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'block';
    }
}

/**
 * Displays an error message in the status area.
 */
function showError(message) {
    showStatus(message, 'error');
}

/**
 * Clears the status message area.
 */
function clearStatus() {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.style.display = 'none';
        statusElement.textContent = '';
    }
}

function resetAudioDisplay() {
    const audioContainer = document.querySelector('.audio-container');
    const sampleGrid = document.getElementById('sampleAudiosGrid');
    const audioPreview = document.getElementById('audioPreview');

    if (currentAudioSource === 'sample') {
        if (sampleGrid) sampleGrid.style.display = 'flex';
        if (audioPreview) audioPreview.style.display = 'none';
    } else {
        if (sampleGrid) sampleGrid.style.display = 'none';
        if (audioPreview) audioPreview.style.display = 'flex';
    }

    if (audioContainer) {
        audioContainer.style.display = '';
        audioContainer.style.justifyContent = '';
        audioContainer.style.alignItems = '';
    }
}

function setSampleAudiosDisabled(disabled) {
    document.querySelectorAll('.sample-audio-item').forEach(item => {
        if (disabled) {
            item.classList.add('disabled');
            item.style.pointerEvents = 'none';
        } else {
            item.classList.remove('disabled');
            item.style.pointerEvents = '';
        }
    });
}
