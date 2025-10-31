// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

/*
 * UI Elements definition: needed to interact with the HTML elements.
 */

const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

/*
 * Socket initialization. We need it to communicate with the server
 */
function initSocketIO() {
    socket.on('response', (data) => {
        const responseBox = document.getElementById('promptResponse');
        responseBox.textContent += data;
        responseBox.style.display = 'block';
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('clearStoryButton').disabled = false;
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
});

function generateStory(msg) {
    document.getElementById('sendStoryButton').disabled = true;
    document.getElementById('storyInput').disabled = true;
    document.getElementById('loadingSpinner').style.display = 'inline-block';
    socket.emit('generate_story', msg);
}

function resetUI() {
    document.getElementById('storyInput').value = '';
    document.getElementById('promptResponse').style.display = 'none';
    document.getElementById('promptResponse').scrollTop = 0; // Reset scroll position
    document.getElementById('promptResponse').textContent = '';
    document.getElementById('sendStoryButton').disabled = false;
    document.getElementById('storyInput').disabled = false;
}
