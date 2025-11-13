// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

let socket;
let currentImage = null;
let imageType = null;
let imageInput;
let errorContainer;

function onImagePreviewClick() {
    if (!currentImage) {
        imageInput.click();
    }
}

/*
 * Socket and elements initialization. We need it to communicate with the server
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initSocketIO();
});

function initializeElements() {
    imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceResetButton = document.getElementById('confidenceResetButton');
    const classifyButton = document.getElementById('classifyButton');
    const uploadNewButton = document.getElementById('uploadNewButton');
    errorContainer = document.getElementById('error-container');

    imageInput.addEventListener('change', handleImageUpload);
    imagePreview.addEventListener('click', onImagePreviewClick);

    // Drag and drop functionality
    imagePreview.addEventListener('dragover', (e) => {
        e.preventDefault();
        imagePreview.classList.add('drag-over');
    });

    imagePreview.addEventListener('dragleave', () => {
        imagePreview.classList.remove('drag-over');
    });

    imagePreview.addEventListener('drop', (e) => {
        e.preventDefault();
        imagePreview.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageFile(files[0]);
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

    const confidencePopoverText = "Minimum confidence score for detected objects. Lower values show more results but may include false positives.";
    document.querySelectorAll('.info-btn.confidence').forEach(img => {
        const popover = img.parentElement.querySelector('.popover');
        img.addEventListener('mouseenter', () => {
            popover.textContent = confidencePopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });

    // Buttons
    classifyButton.addEventListener('click', runClassification);
    uploadNewButton.addEventListener('click', uploadNewImage);
}

function uploadNewImage() {
    currentImage = null;
    const imagePreview = document.getElementById('imagePreview');
    const resultsTable = document.getElementById('resultsTable');

    imagePreview.innerHTML = `
        <div class="upload-placeholder">
            <p class="drag-and-drop">Drag & drop an image here, or</p>
            <button class="drag-and-drop-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="0 0 12 14" class="btn-icon-upload">
                    <path d="M11.5 9.5C11.6326 9.5 11.7597 9.55272 11.8535 9.64648C11.9473 9.74025 12 9.8674 12 10V13C12 13.1326 11.9473 13.2598 11.8535 13.3535C11.7597 13.4473 11.6326 13.5 11.5 13.5H0.5C0.367399 13.5 0.240251 13.4473 0.146484 13.3535C0.0527236 13.2598 8.34753e-06 13.1326 0 13V10C1.15923e-08 9.8674 0.0527259 9.74025 0.146484 9.64648C0.240253 9.55272 0.367392 9.5 0.5 9.5C0.632608 9.5 0.759747 9.55272 0.853516 9.64648C0.947274 9.74025 1 9.8674 1 10V12.5H11V10C11 9.8674 11.0527 9.74025 11.1465 9.64648C11.2403 9.55272 11.3674 9.5 11.5 9.5ZM6 0.5C6.06599 0.5 6.13146 0.512713 6.19238 0.538086C6.25331 0.56347 6.30899 0.600597 6.35547 0.647461L10.3555 4.64746C10.4023 4.69394 10.4395 4.74963 10.4648 4.81055C10.4902 4.87144 10.5029 4.93696 10.5029 5.00293C10.5029 5.06891 10.4902 5.1344 10.4648 5.19531C10.4395 5.25604 10.4021 5.31103 10.3555 5.35742C10.309 5.40429 10.2533 5.44239 10.1924 5.46777C10.1315 5.49313 10.066 5.50586 10 5.50586C9.93402 5.50586 9.86852 5.49314 9.80762 5.46777C9.74669 5.44239 9.69101 5.40429 9.64453 5.35742L6.5 2.20801V10.5029C6.49998 10.6355 6.44727 10.7627 6.35352 10.8564C6.25975 10.9502 6.13259 11.0029 6 11.0029C5.86741 11.0029 5.74025 10.9502 5.64648 10.8564C5.55273 10.7627 5.50002 10.6355 5.5 10.5029V2.20801L2.35547 5.35742C2.26132 5.45157 2.13315 5.50488 2 5.50488C1.86685 5.50488 1.73868 5.45157 1.64453 5.35742C1.55068 5.26333 1.49806 5.13584 1.49805 5.00293C1.49805 4.86979 1.5504 4.74161 1.64453 4.64746L5.64453 0.647461C5.69101 0.600597 5.74669 0.56347 5.80762 0.538086C5.86854 0.512712 5.93401 0.5 6 0.5Z" fill="#008184"/>
                </svg>
                Upload
            </button>
            <div>
            <span class="drag-and-drop-text border">File Jpg or PnG</span><span class="drag-and-drop-text">Max 500kb</span>
            </div>
            <input type="file" id="imageInput" accept="image/*" style="display: none;">
        </div>
    `;
    imagePreview.style.border = '1px dashed #7F8C8D';
    resultsTable.innerHTML = '';

    // Re-assign global and re-attach listener
    imageInput = document.getElementById('imageInput');
    imageInput.addEventListener('change', handleImageUpload);

    setButtonState('initial');
    clearStatus();
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

function initSocketIO() {
    socket = io(`http://${window.location.host}`);

    socket.on('connect', () => {
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    });

    socket.on('classification_result', (data) => {
        console.log('📥 Received classification_result:', data);
        handleClassificationResult(data);
    });

    socket.on('classification_error', (data) => {
        console.log('📥 Received classification_error:', data);
        showError(`Classification failed: ${data.error}`);
        setButtonState('ready');
    });

    socket.on('disconnect', () => {
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentImage = e.target.result.split(',')[1];

        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded image" class="preview-image">`;
        imagePreview.style.border = 'none';

        setButtonState('ready');
        clearStatus();
    };
    reader.readAsDataURL(file);
}

function runClassification() {
    if (!currentImage) {
        showError('No image available for classification');
        return;
    }

    setButtonState('classifying');
    showStatus('Running classification...', 'info');

    const confidence = parseFloat(document.getElementById('confidenceSlider').value);

    socket.emit('classify_image', {
        image: currentImage,
        confidence: confidence,
        image_type: imageType
    });
}

function handleClassificationResult(data) {
    if (data.error || !data.success) {
        showError(`Classification failed: ${data.error || 'Unknown error'}`);
        setButtonState('ready');
        return;
    }

    const resultsTable = document.getElementById('resultsTable');
    resultsTable.innerHTML = ''; // Clear previous results

    if (data.results && data.results.classification && data.results.classification.length > 0) {
        const table = document.createElement('table');
        table.className = 'results-table';
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Detected object</th><th>Confidence</th></tr>';
        const tbody = document.createElement('tbody');

        data.results.classification.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="class-name">${item.class_name}</td><td class="confidence">${item.confidence}%</td>`;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        resultsTable.appendChild(table);

        showStatus('Classification completed successfully!', 'success');
    } else {
        showStatus('No objects detected with the current confidence threshold.', 'info');
    }
    setButtonState('completed');
}

function setButtonState(state) {
    const classifyButton = document.getElementById('classifyButton');
    const uploadNewButton = document.getElementById('uploadNewButton');

    switch (state) {
        case 'initial':
            classifyButton.style.display = 'none';
            uploadNewButton.style.display = 'none';
            break;
        case 'ready':
            classifyButton.style.display = 'inline-block';
            classifyButton.disabled = false;
            classifyButton.textContent = 'Run Classification ▶';
            uploadNewButton.style.display = 'flex';
            break;
        case 'classifying':
            classifyButton.disabled = true;
            classifyButton.textContent = 'Running...';
            break;
        case 'completed':
            classifyButton.style.display = 'inline-block';
            classifyButton.disabled = false;
            classifyButton.textContent = 'Run Again ▶';
            uploadNewButton.style.display = 'flex';
            break;
    }
}

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
}

function showError(message) {
    showStatus(message, 'error');
}

function clearStatus() {
    const statusElement = document.getElementById('statusMessage');
    statusElement.style.display = 'none';
    statusElement.textContent = '';
}
