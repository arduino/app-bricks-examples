// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

let socket;
let currentImage = null;
let resultImage = null;
let errorContainer;

let currentImageSource = 'sample';
let sampleImages = [];
let selectedSampleImage = null;

/*
 * Socket initialization: required for communication with the server.
 * Also initializes all elements used in the Anomaly Detection UI, which are manipulated throughout the application's lifecycle.
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initSocketIO();

    // Popover logic
    const confidencePopoverText = "Minimum confidence score for detected cracks. Lower values show more results but may include false positives.";

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

function initializeElements() {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceInput = document.getElementById('confidenceInput');
    const confidenceResetButton = document.getElementById('confidenceResetButton');
    const detectButton = document.getElementById('detectButton');
    const uploadNewButton = document.getElementById('uploadNewButton');
    const downloadButton = document.getElementById('downloadButton');
    errorContainer = document.getElementById('error-container');

    const sampleImageBtn = document.getElementById('sampleImageBtn');
    const uploadImageBtn = document.getElementById('uploadImageBtn');

    imageInput.addEventListener('change', handleImageUpload);
    imagePreview.addEventListener('click', () => {
        if (!currentImage && currentImageSource === 'upload') {
            imageInput.click();
        }
    });

    // Drag and drop functionality (only when in upload mode)
    imagePreview.addEventListener('dragover', (e) => {
        if (currentImageSource === 'upload') {
            e.preventDefault();
            imagePreview.classList.add('drag-over');
        }
    });

    imagePreview.addEventListener('dragleave', () => {
        imagePreview.classList.remove('drag-over');
    });

    imagePreview.addEventListener('drop', (e) => {
        if (currentImageSource === 'upload') {
            e.preventDefault();
            imagePreview.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                handleImageFile(files[0]);
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
    sampleImageBtn.addEventListener('click', () => switchImageSource('sample'));
    uploadImageBtn.addEventListener('click', () => switchImageSource('upload'));

    // Buttons
    detectButton.addEventListener('click', runDetection);
    uploadNewButton.addEventListener('click', uploadNewImage);
    downloadButton.addEventListener('click', downloadResult);

    // Load sample images on startup
    loadSampleImages();
}

// Switch between image sources
function switchImageSource(source) {
    currentImageSource = source;
    const sampleImageBtn = document.getElementById('sampleImageBtn');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const sampleImagesGrid = document.getElementById('sampleImagesGrid');
    const imagePreview = document.getElementById('imagePreview');

    // Update button states
    sampleImageBtn.classList.toggle('active', source === 'sample');
    uploadImageBtn.classList.toggle('active', source === 'upload');

    // Show/hide appropriate containers
    if (source === 'sample') {
        sampleImagesGrid.style.display = 'grid';
        imagePreview.style.display = 'none';

        if (selectedSampleImage) {
            setButtonState('ready');
        } else {
            setButtonState('initial');
            showImageSelectionHeader();
        }

        currentImage = null;
    } else {
        sampleImagesGrid.style.display = 'none';
        imagePreview.style.display = 'flex';

        if (currentImage) {
            setButtonState('ready');
        } else {
            setButtonState('initial');
            showImageSelectionHeader();
        }
    }

    clearStatus();
}

function loadSampleImages() {
    const sampleImagesGrid = document.getElementById('sampleImagesGrid');
    sampleImagesGrid.innerHTML = '<div class="sample-images-loading">Loading sample images...</div>';

    const imageFiles = [
        'anomaly.cracked.7126-168.jpg',
        'anomaly.cracked.7133-135.jpg',
        'anomaly.cracked.7133-81.jpg',
        'anomaly.cracked.7133-99.jpg',
        'anomaly.cracked.7135-116.jpg',
        'no anomaly.uncracked.7117.jpg',
        'no anomaly.uncracked.7120.jpg',
        'no anomaly.uncracked.7124.jpg',
        'no anomaly.uncracked.7125.jpg',
        'no anomaly.uncracked.7127.jpg'
    ];

    sampleImages = imageFiles.map(filename => ({
        filename,
        path: `img/${filename}`,
        hasAnomaly: filename.includes('anomaly.cracked'),
        displayName: filename.replace(/\.(jpg|png)$/i, '').replace(/[._]/g, ' ')
    }));

    renderSampleImages();
}

function renderSampleImages() {
    const sampleImagesGrid = document.getElementById('sampleImagesGrid');

    sampleImagesGrid.innerHTML = sampleImages.map((img, index) => `
        <div class="sample-image-item" data-index="${index}" onclick="selectSampleImage(${index})">
            <img src="${img.path}" alt="${img.displayName}" loading="lazy">
        </div>
    `).join('');
}

// Select sample image function
function selectSampleImage(index) {
    selectedSampleImage = sampleImages[index];

    // Update visual selection
    document.querySelectorAll('.sample-image-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });

    setButtonState('ready');
    clearStatus();
}

// Upload new image function
function uploadNewImage() {
    currentImage = null;
    resultImage = null;
    selectedSampleImage = null;

    // Clear selections
    document.querySelectorAll('.sample-image-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Reset image display
    resetImageDisplay();

    // Recreate the complete structure of image-container
    const imageContainer = document.querySelector('.image-container');
    imageContainer.innerHTML = `
        <div id="sampleImagesGrid" class="sample-images-grid"></div>
        <div id="imagePreview" class="image-preview" style="display: none;">
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
        </div>
    `;

    // Reset container style
    imageContainer.style.display = '';
    imageContainer.style.justifyContent = '';
    imageContainer.style.alignItems = '';

    // Reload sample images
    renderSampleImages();

    // Reattach event listeners
    const newImageInput = document.getElementById('imageInput');
    const newImagePreview = document.getElementById('imagePreview');

    if (newImageInput) {
        newImageInput.addEventListener('change', handleImageUpload);
    }

    if (newImagePreview) {
        // Reattach all event listeners for drag & drop
        newImagePreview.addEventListener('click', () => {
            if (!currentImage && currentImageSource === 'upload') {
                newImageInput.click();
            }
        });

        newImagePreview.addEventListener('dragover', (e) => {
            if (currentImageSource === 'upload') {
                e.preventDefault();
                newImagePreview.classList.add('drag-over');
            }
        });

        newImagePreview.addEventListener('dragleave', () => {
            newImagePreview.classList.remove('drag-over');
        });

        newImagePreview.addEventListener('drop', (e) => {
            if (currentImageSource === 'upload') {
                e.preventDefault();
                newImagePreview.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type.startsWith('image/')) {
                    handleImageFile(files[0]);
                }
            }
        });
    }

    // Switch to sample mode by default
    switchImageSource('sample');
    setButtonState('initial');
    clearStatus();

    // Hide result title when resetting
    showImageSelectionHeader();

    // Show the selection source buttons again
    const imageSourceSelection = document.querySelector('.image-source-selection');
    if (imageSourceSelection) {
        imageSourceSelection.style.display = 'flex';
    }
}

// Show/Hide headers
function showImageSelectionHeader() {
    const imageSelectionHeader = document.getElementById('imageSelectionHeader');
    const resultHeader = document.getElementById('resultHeader');
    if (imageSelectionHeader) imageSelectionHeader.style.display = 'block';
    if (resultHeader) resultHeader.style.display = 'none';
}

function showResultHeader() {
    const imageSelectionHeader = document.getElementById('imageSelectionHeader');
    const resultHeader = document.getElementById('resultHeader');
    if (imageSelectionHeader) imageSelectionHeader.style.display = 'none';
    if (resultHeader) resultHeader.style.display = 'block';
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
    confidenceValueDisplay.textContent = displayValue;

    if (document.activeElement !== confidenceInput) {
        confidenceInput.value = displayValue;
    }

    sliderProgress.style.width = percentage + '%';
    confidenceValueDisplay.style.left = percentage + '%';
}

// Reset confidence
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

    socket.on('detection_result', (data) => {
        handleDetectionResult(data);
    });

    socket.on('detection_error', (data) => {
        showError(`Anomaly detection failed: ${data.error}`);
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

        setButtonState('ready');
        clearStatus();
    };
    reader.readAsDataURL(file);
}

function runDetection() {
    setButtonState('detecting');
    showStatus('Running anomaly detection...', 'info');
    showResultHeader();

    if (currentImageSource === 'sample' && selectedSampleImage && !currentImage) {
        loadSampleImageForDetection(selectedSampleImage.path)
            .then(() => {
                sendDetectionRequest();
            })
            .catch(error => {
                console.error('❌ Error loading sample image:', error);
                showError('Failed to load sample image');
                setButtonState('ready');
            });
    } else {
        sendDetectionRequest();
    }
}

function sendDetectionRequest() {
    if (!currentImage) {
        showError('No image available for detection');
        setButtonState('ready');
        return;
    }

    const confidence = parseFloat(document.getElementById('confidenceSlider').value);

    socket.emit('detect_anomalies', {
        image: currentImage,
        confidence: confidence
    });
}

function loadSampleImageForDetection(imagePath) {
    return new Promise((resolve, reject) => {
        fetch(imagePath)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentImage = e.target.result.split(',')[1];
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(reject);
    });
}

function displayImage(imageSrc, container) {
    const imageContainer = document.querySelector(container);

    // Clear existing content
    imageContainer.innerHTML = '';

    // Create image element
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Detection Result';
    img.className = 'preview-image';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '500px';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';

    // Add image to container
    imageContainer.appendChild(img);

    // Show the image container and hide sample grid
    imageContainer.style.display = 'flex';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.alignItems = 'center';

    const sampleGrid = document.getElementById('sampleImagesGrid');
    if (sampleGrid) {
        sampleGrid.style.display = 'none';
    }

    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
}

function handleDetectionResult(data) {
    if (data.error) {
        showError(`Detection failed: ${data.error}`);
        setButtonState('ready');
        return;
    }

    if (data.result_image) {
        // Store the result image
        resultImage = data.result_image;

        // Display the result image in the image container
        displayImage(`data:image/png;base64,${data.result_image}`, '.image-container');

        // Show result title and download button
        showResultHeader();

        showStatus('Detection completed successfully!', 'success');
    } else {
        showError('No result image received from detection');
        setButtonState('ready');
        return;
    }

    setButtonState('completed');
}

function setButtonState(state) {
    const detectButton = document.getElementById('detectButton');
    const uploadNewButton = document.getElementById('uploadNewButton');
    const downloadButton = document.getElementById('downloadButton');
    const imageSourceSelection = document.querySelector('.image-source-selection'); // Add this line

    switch (state) {
        case 'initial':
            detectButton.style.display = 'none';
            uploadNewButton.style.display = 'none';
            downloadButton.style.display = 'none';
            imageSourceSelection.style.display = 'flex'; // Show selection buttons
            break;
        case 'ready':
            detectButton.style.display = 'inline-block';
            detectButton.disabled = false;
            detectButton.textContent = 'Run Detection ▶';
            uploadNewButton.style.display = 'flex';
            downloadButton.style.display = 'none';
            imageSourceSelection.style.display = 'none'; // Hide selection buttons
            break;
        case 'detecting':
            detectButton.style.display = 'none';
            uploadNewButton.style.display = 'none';
            downloadButton.style.display = 'none';
            imageSourceSelection.style.display = 'none'; // Hide selection buttons
            break;
        case 'completed':
            detectButton.style.display = 'inline-block';
            detectButton.disabled = false;
            detectButton.textContent = 'Run Again ▶';
            uploadNewButton.style.display = 'flex';
            downloadButton.style.display = 'inline-block';
            imageSourceSelection.style.display = 'none'; // Hide selection buttons
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

function downloadResult() {
    if (!resultImage) {
        showError('No result image to download');
        return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${resultImage}`;
    link.download = 'anomaly-detection-result.png';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('📥 Result image downloaded');
}

// Also add a function to reset the view when changing images
function resetImageDisplay() {
    const imageContainer = document.querySelector('.image-container');
    const sampleGrid = document.getElementById('sampleImagesGrid');
    const imagePreview = document.getElementById('imagePreview');

    // Reset to show appropriate container based on current source
    if (currentImageSource === 'sample') {
        if (sampleGrid) sampleGrid.style.display = 'grid';
        if (imagePreview) imagePreview.style.display = 'none';
    } else {
        if (sampleGrid) sampleGrid.style.display = 'none';
        if (imagePreview) imagePreview.style.display = 'flex';
    }

    // Reset the image container style in case it was modified by displayImage
    if (imageContainer) {
        imageContainer.style.display = '';
        imageContainer.style.justifyContent = '';
        imageContainer.style.alignItems = '';
    }
}
