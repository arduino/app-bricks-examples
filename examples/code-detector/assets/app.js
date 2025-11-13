// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

/*
 * UI Elements definition: needed to interact with the HTML elements.
 */

const canvasElement = document.getElementById('videoCanvas');
const ctx = canvasElement.getContext('2d');
const scanInfoElement = document.getElementById('scanInfo');
const recentScansListElement = document.getElementById('recentScansList');
const initialListErrorElement = document.getElementById('initialListError');
const cameraStatusElement = document.getElementById('cameraStatus');
const scanMessageElement = document.getElementById('scanMessage');
const rescanButtonContainer = document.getElementById('rescan-button-container');
const deleteScanElement = document.getElementById('delete-scan');
let errorContainer = document.getElementById('error-container');


const MAX_RECENT_SCANS = 5;
let scans = [];
let currentImageBitmap = null; // Holds the current ImageBitmap for cleanup
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

/*
 * Socket initialization. We need it to communicate with the server
 */
function initSocketIO() {
    socket.on('connect', () => {
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    });

    socket.on('disconnect', (reason) => {
        if (currentImageBitmap) { // Clean up bitmap on disconnect
            currentImageBitmap.close();
            currentImageBitmap = null;
        }
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });

    socket.on('code_detected', async (message) => {
        updateCameraStatus('hide'); // Hide camera status when code is detected
        renderScanInfo(message);
        addScan(message);
        renderScans();
        await renderLatestScanImage(message.image, message.image_type);
    });

    socket.on('frame_detected', async (message) => {
        updateCameraStatus('show');
        scanInfoElement.innerHTML = ``; // Clear the scan info display
        rescanButtonContainer.style.display = 'none'; // Hide the "Scan another" button while scanning
        await renderFrameImage(message.image, message.image_type);
    });

    socket.on('error', async (message) => {
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
    });
}

/*
 * These functions are used to update the UI based on the code detected.
 */
function updateCameraStatus(action = 'show') {
    if (cameraStatusElement) {
        if (action === 'hide') {
            cameraStatusElement.style.display = 'none';
        } else {
            cameraStatusElement.style.display = 'flex';
        }
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    listScans();
    initSocketIO();
    socket.emit('reset_detection', {}); // Notify the server to reset detection
});


// Function to copy text to clipboard and show tooltip feedback
function copyToClipboard(iconWrapper, text) {
    const originalTooltip = iconWrapper.getAttribute('data-tooltip');

    navigator.clipboard.writeText(text).then(() => {
        // Change tooltip to "Copied!" and add success class
        iconWrapper.setAttribute('data-tooltip', 'Copied!');
        iconWrapper.classList.add('tooltip-success');

        // Revert back to original tooltip after 3 seconds
        setTimeout(() => {
            iconWrapper.setAttribute('data-tooltip', originalTooltip);
            iconWrapper.classList.remove('tooltip-success');
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

async function listScans() {
    try {
        const response = await fetch(`http://${window.location.host}/list_scans`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) {
            initialListErrorElement.textContent = `Failed to load initial scans: ${data.error}`;
            initialListErrorElement.style.display = 'block';
            return;
        }
        if (!data.scans) {
            initialListErrorElement.textContent = 'Received invalid data for initial scans.';
            initialListErrorElement.style.display = 'block';
        }

        scans = data.scans.slice(0, MAX_RECENT_SCANS);
        renderScans();
    } catch (error) {
        initialListErrorElement.textContent = `Error fetching initial scans: ${error.message}.`;
        initialListErrorElement.style.display = 'block';
    }
}

// Function to add a new scan to the list
function addScan(newScan) {
    scans.unshift(newScan);
    if (scans.length > MAX_RECENT_SCANS) {
        scans.pop();
    }
}

// Rescan button handler
function rescan() {
    socket.emit('reset_detection', {}); // Notify the server to reset detection
    scanInfoElement.innerHTML = ``; // Clear the scan info display
    updateCameraStatus('show'); // Show the search status again

    // Hide the "Scan another" button when starting a new scan
    rescanButtonContainer.style.display = 'none';
}

// Clear recent scans function
function clearRecentScans() {
    scans = [];
    renderScans(); // Re-render the empty list (will show "No recent scans")
}

// Function to get the icon HTML based on content type
function getIconHtml(content) {
    let isLink = (content) => {
        const urlPattern = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
        return urlPattern.test(content);
    }

    // Escape single quotes for safe HTML attribute usage
    const safeContent = String(content).replace(/'/g, "\\'");
    if (isLink(content)) {
        return `
            <span class="icon-wrapper" data-tooltip="Link" onclick="window.open('${safeContent}', '_blank')">
                <img class="icon" src="./img/link.svg">
            </span>
        `;
    }
    return `
        <span class="icon-wrapper" data-tooltip="Copy" onclick="copyToClipboard(this, '${safeContent}')">
            <img class="icon" src="./img/copy.svg">
        </span>
`;
}

// Function to render scan information
function renderScanInfo(message) {
    const contentHeader = getContentHeaderForType(message.type);
    const scanTime = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const iconHtml = getIconHtml(message.content);

    scanInfoElement.innerHTML = `
        <div class="scan-container">
            <div class="scan-header">${contentHeader}</div>
            <div class="scan-header">Scan Time</div>
        </div>
        <div class="scan-container">
            <div class="scan-content">${message.content}${iconHtml}</div>
            <div class="scan-content-time">${scanTime}</div>
        </div>
    `;

    // Show the "Scan another" button when a code is detected
    rescanButtonContainer.style.display = 'flex';
}

function getContentHeaderForType(type) {
    switch(type) {
        case 'QR_CODE':
            return 'QR Code content';
        case 'BARCODE':
            return 'Serial Number';
        default:
            return 'Serial Number';
    }
}

// Function to render the list of scans
function renderScans() {
    // Clear the list
    recentScansList.innerHTML = ``;

        if (scans.length === 0) {
        recentScansList.innerHTML = `
            <div class="no-recent-scans">
                <img src="./img/barcode.svg">
                No recent scans
            </div>
        `;
        scanMessageElement.style.display = 'none';
        deleteScanElement.style.display = 'none';
        return;
    }

    // Show scan message when there are scans
    scanMessageElement.style.display = 'block';
    deleteScanElement.style.display = 'block';

    scans.forEach((scan) => {
        const row = document.createElement('div');
        row.className = 'scan-container';

        // Create a container for content and time
        const cellContainer = document.createElement('span');
        cellContainer.className = 'scan-cell-container cell-border';

        // Content (text + icon)
        const iconHtml = getIconHtml(scan.content);
        const contentText = document.createElement('span');
        contentText.className = 'scan-content';
        contentText.innerHTML = `${scan.content}${iconHtml}`;

        // Time
        const timeText = document.createElement('span');
        timeText.className = 'scan-content-time';
        timeText.textContent = new Date(scan.timestamp).toLocaleString('it-IT').replace(',', ' -');

        // Append content and time to the container
        cellContainer.appendChild(contentText);
        cellContainer.appendChild(timeText);

        row.appendChild(cellContainer);
        recentScansListElement.appendChild(row);
    });
}

// Function to render the latest scan image
async function renderLatestScanImage() {
    if (scans.length === 0) {
        recentScansList.innerHTML = `
            <div class="no-recent-scans">
                <img src="./img/barcode.svg">
                No recent scans
            </div>
        `;
        return;
    }

    try {
        const image = base64ToUint8Array(scans[0].image);
        const blob = new Blob([image], { type: scans[0].image_type });

        // Clean up the previous ImageBitmap to free memory
        if (currentImageBitmap) {
            currentImageBitmap.close();
        }

        currentImageBitmap = await createImageBitmap(blob);

        // Match canvas size with image size
        if (canvasElement.width !== currentImageBitmap.width) {
            canvasElement.width = currentImageBitmap.width;
        }
        if (canvasElement.height !== currentImageBitmap.height) {
            canvasElement.height = currentImageBitmap.height;
        }

        ctx.drawImage(currentImageBitmap, 0, 0);
    } catch (error) {
        console.error('Error processing frame_bytes:', error);
    }
}

// Function to render a frame image
async function renderFrameImage(image, image_type) {
    try {
        const imageBytes = base64ToUint8Array(image);
        const blob = new Blob([imageBytes], { type: image_type });

        // Clean up the previous ImageBitmap to free memory
        if (currentImageBitmap) {
            currentImageBitmap.close();
        }

        currentImageBitmap = await createImageBitmap(blob);

        // Match canvas size with image size
        if (canvasElement.width !== currentImageBitmap.width) {
            canvasElement.width = currentImageBitmap.width;
        }
        if (canvasElement.height !== currentImageBitmap.height) {
            canvasElement.height = currentImageBitmap.height;
        }

        ctx.drawImage(currentImageBitmap, 0, 0);
    } catch (error) {
        console.error('Error processing frame_bytes:', error);
    }
}

// Function to convert base64 string to Uint8Array.
// This is used to convert the base64 encoded image data received from the server.
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
