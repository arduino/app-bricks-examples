// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

function initSocketIO() {
    socket.on('response', (data) => {
        const responseBox = document.getElementById('promptResponse');
        responseBox.textContent += data;
        responseBox.style.display = 'block';
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('clearStoryButton').disabled = false;
    });
}

function unlockAndOpenNext(currentContainer) {
    const nextContainer = currentContainer.nextElementSibling;
    if (nextContainer && nextContainer.classList.contains('parameter-container')) {
        if (nextContainer.classList.contains('disabled')) {
            nextContainer.classList.remove('disabled');
            const content = nextContainer.querySelector('.parameter-content');
            const arrow = nextContainer.querySelector('.arrow-icon');
            if (content.style.display !== 'block') {
                content.style.display = 'block';
                arrow.classList.add('rotated');
            }
        }
    }
}

function setupChipSelection(container) {
    const chips = container.querySelectorAll('.chip');
    const selectedValue = container.querySelector('.selected-value');

    chips.forEach(chip => {
        chip.addEventListener('click', (event) => {
            event.stopPropagation();

            const alreadySelected = chip.classList.contains('selected');

            chips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');

            if (selectedValue) {
                selectedValue.innerHTML = chip.innerHTML;
                selectedValue.style.display = 'inline-flex';
            }

            if (!alreadySelected) {
                unlockAndOpenNext(container);
            }
        });
    });
}

function setupStoryTypeSelection(container) {
    const paragraphs = container.querySelectorAll('.story-type-paragraph');

    paragraphs.forEach(paragraph => {
        const chips = paragraph.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (event) => {
                event.stopPropagation();

                // Allow only one selection per paragraph
                const paragraphChips = paragraph.querySelectorAll('.chip');
                paragraphChips.forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                updateStoryTypeHeader(container);

                // Check if all subcategories have a selection
                const selectedChips = container.querySelectorAll('.chip.selected');
                if (selectedChips.length === paragraphs.length) {
                    unlockAndOpenNext(container);
                }
            });
        });
    });
}

function updateStoryTypeHeader(container) {
    const optionalText = container.querySelector('.optional-text');
    const selectedChips = container.querySelectorAll('.chip.selected');
    const content = container.querySelector('.parameter-content');
    const isOpen = content.style.display === 'block';

    optionalText.innerHTML = ''; // Clear previous content

    if (selectedChips.length === 0) {
        optionalText.textContent = '(optional)';
        return;
    }

    if (isOpen) {
        Array.from(selectedChips).forEach(chip => {
            const pill = document.createElement('span');
            pill.className = 'selection-pill';
            pill.innerHTML = chip.innerHTML;
            optionalText.appendChild(pill);
        });
    } else {
        const firstTwo = Array.from(selectedChips).slice(0, 2);
        firstTwo.forEach(chip => {
            const pill = document.createElement('span');
            pill.className = 'selection-pill';
            pill.innerHTML = chip.innerHTML;
            optionalText.appendChild(pill);
        });

        const remaining = selectedChips.length - 2;
        if (remaining > 0) {
            const plusSpan = document.createElement('span');
            plusSpan.className = 'plus-x';
            plusSpan.style.display = 'inline-block'; // make it visible
            plusSpan.textContent = `+${remaining}`;
            optionalText.appendChild(plusSpan);
        }
    }
}

function checkCharactersAndUnlockNext(charactersContainer) {
    const characterGroups = charactersContainer.querySelectorAll('.character-input-group');
    let atLeastOneCharacterEntered = false;
    characterGroups.forEach(group => {
        const nameInput = group.querySelector('.character-name');
        const roleSelect = group.querySelector('.character-role');
        if (nameInput.value.trim() !== '' && roleSelect.value !== '') {
            atLeastOneCharacterEntered = true;
        }
    });

    const generateButton = document.querySelector('.generate-story-button');
    if (atLeastOneCharacterEntered) {
        unlockAndOpenNext(charactersContainer);
        generateButton.style.display = 'flex';
    } else {
        generateButton.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();

    const parameterContainers = document.querySelectorAll('.parameter-container');

    // Initial setup for sequential containers
    parameterContainers.forEach((container, index) => {
        if (index === 0) { // First container (Age)
            const content = container.querySelector('.parameter-content');
            const arrow = container.querySelector('.arrow-icon');
            content.style.display = 'block';
            arrow.classList.add('rotated');
        } else {
            container.classList.add('disabled');
        }
    });

    parameterContainers.forEach(container => {
        const title = container.querySelector('.parameter-title').textContent;
        const header = container.querySelector('.parameter-header');

        header.addEventListener('click', () => {
            if (container.classList.contains('disabled')) return;

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
                const maxLength = textarea.maxLength;

                textarea.addEventListener('input', () => {
                    const currentLength = textarea.value.length;
                    charCounter.textContent = `${currentLength} / ${maxLength}`;
                });
            }
        });

        // Setup interaction listeners for unlocking the next container
        if (title === 'Story type') {
            setupStoryTypeSelection(container);
        } else if (title === 'Characters') {
            const charactersList = container.querySelector('.characters-list');
            charactersList.addEventListener('input', () => {
                checkCharactersAndUnlockNext(container);
            });
            container.querySelector('.add-character-button').addEventListener('click', () => {
                checkCharactersAndUnlockNext(container);
            });
        } else if (title === 'Other') {
            container.querySelector('.other-textarea').addEventListener('input', () => unlockAndOpenNext(container), { once: true });
        } else {
            setupChipSelection(container);
        }
    });

    const addCharacterButton = document.querySelector('.add-character-button');
    const charactersList = document.querySelector('.characters-list');
    const characterInputGroup = document.querySelector('.character-input-group');

    addCharacterButton.addEventListener('click', () => {
        const characterGroups = document.querySelectorAll('.character-input-group');
        if (characterGroups.length < 5) {
            const newCharacterGroup = characterInputGroup.cloneNode(true);
            newCharacterGroup.querySelector('.character-name').value = '';
            newCharacterGroup.querySelector('.character-role').selectedIndex = 0;
            newCharacterGroup.querySelector('.character-description').value = '';
            
            const deleteButton = newCharacterGroup.querySelector('.delete-character-button');
            deleteButton.style.display = 'block';
            deleteButton.addEventListener('click', () => {
                newCharacterGroup.remove();
                if (document.querySelectorAll('.character-input-group').length < 5) {
                    addCharacterButton.style.display = 'block';
                }
            });

            charactersList.appendChild(newCharacterGroup);

            if (document.querySelectorAll('.character-input-group').length === 5) {
                addCharacterButton.style.display = 'none';
            }
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
    // This function might need to be updated to reset the sequential locking
    document.getElementById('storyInput').value = '';
    document.getElementById('promptResponse').style.display = 'none';
    document.getElementById('promptResponse').scrollTop = 0;
    document.getElementById('promptResponse').textContent = '';
    document.getElementById('sendStoryButton').disabled = false;
    document.getElementById('storyInput').disabled = false;

    // Reset sequential containers
    const parameterContainers = document.querySelectorAll('.parameter-container');
    parameterContainers.forEach((container, index) => {
        // Close content and un-rotate arrow
        const content = container.querySelector('.parameter-content');
        const arrow = container.querySelector('.arrow-icon');
        content.style.display = 'none';
        arrow.classList.remove('rotated');

        // Reset selected chips
        container.querySelectorAll('.chip.selected').forEach(c => c.classList.remove('selected'));
        const selectedValue = container.querySelector('.selected-value');
        if (selectedValue) {
            selectedValue.textContent = '';
            selectedValue.style.display = 'none';
        }

        if (index === 0) { // First container (Age)
            container.classList.remove('disabled');
            content.style.display = 'block';
            arrow.classList.add('rotated');
        } else {
            container.classList.add('disabled');
        }
    });
}