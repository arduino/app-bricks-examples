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

function setupChipSelection(container) {
    const chips = container.querySelectorAll('.chip');
    const selectedValue = container.querySelector('.selected-value');

    chips.forEach(chip => {
        chip.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the container from toggling

            // Remove selected class from all chips in this container
            chips.forEach(c => c.classList.remove('selected'));

            // Add selected class to the clicked chip
            chip.classList.add('selected');

            // Update the selected value display
            if (selectedValue) {
                selectedValue.textContent = chip.textContent;
                selectedValue.style.display = 'inline-block';
            }
        });
    });
}

function setupStoryTypeSelection(container) {
    const paragraphs = container.querySelectorAll('.story-type-paragraph');
    const optionalText = container.querySelector('.optional-text');

    paragraphs.forEach(paragraph => {
        const chips = paragraph.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (event) => {
                event.stopPropagation();

                // Single selection within the paragraph
                chips.forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                updateStoryTypeHeader(container);
            });
        });
    });
}

function updateStoryTypeHeader(container) {
    const optionalText = container.querySelector('.optional-text');
    const selectedChips = container.querySelectorAll('.chip.selected');
    const content = container.querySelector('.parameter-content');
    const isOpen = content.style.display === 'block';

    if (selectedChips.length === 0) {
        optionalText.textContent = '(optional)';
        return;
    }

    if (isOpen) {
        optionalText.textContent = Array.from(selectedChips).map(c => c.textContent).join(', ');
    } else {
        const firstTwo = Array.from(selectedChips).slice(0, 2).map(c => c.textContent).join(', ');
        const remaining = selectedChips.length - 2;
        if (remaining > 0) {
            optionalText.innerHTML = `${firstTwo} <span class="plus-x">+${remaining}</span>`;
        } else {
            optionalText.textContent = firstTwo;
        }
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();

    const parameterContainers = document.querySelectorAll('.parameter-container');

    parameterContainers.forEach(container => {
        const title = container.querySelector('.parameter-title').textContent;

        container.addEventListener('click', () => {
            const content = container.querySelector('.parameter-content');
            const arrow = container.querySelector('.arrow-icon');

            arrow.classList.toggle('rotated');
            if (content.style.display === 'block') {
                content.style.display = 'none';
            } else {
                content.style.display = 'block';
            }

            if (title === 'Story type') {
                updateStoryTypeHeader(container);
            } else if (title === 'Other') {
                const textarea = container.querySelector('.other-textarea');
                const charCounter = container.querySelector('.char-counter');
                const generateButton = document.querySelector('.generate-story-button');
                const maxLength = textarea.maxLength;

                textarea.addEventListener('input', () => {
                    const currentLength = textarea.value.length;
                    charCounter.textContent = `${currentLength} / ${maxLength}`;
                });

                // Toggle button visibility based on container content display
                if (content.style.display === 'block') {
                    generateButton.style.display = 'flex';
                } else {
                    generateButton.style.display = 'none';
                }
            } else {
                setupChipSelection(container);
            }
        });

        if (title === 'Story type') {
            setupStoryTypeSelection(container);
        } else if (title === 'Other') {
            // Initial state for the button when the page loads
            const generateButton = document.querySelector('.generate-story-button');
            const content = container.querySelector('.parameter-content');
            if (content.style.display === 'block') {
                generateButton.style.display = 'flex';
            } else {
                generateButton.style.display = 'none';
            }
        } else {
            setupChipSelection(container);
        }
    });
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
