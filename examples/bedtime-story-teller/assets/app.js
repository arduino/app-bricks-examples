// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

let generateStoryButtonOriginalHTML = ''; // To store the original content of the generate story button
let storyBuffer = '';

// Error container elements
const errorContainer = document.getElementById('error-container');

function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

function hideError() {
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';
}


function handlePrompt(data) {
    const promptContainer = document.getElementById('prompt-container');
    const promptDisplay = document.getElementById('prompt-display');
    promptDisplay.innerHTML = data;
    promptContainer.style.display = 'block';
}

function handleResponse(data) {
    document.getElementById('story-container').style.display = 'flex';
    storyBuffer += data;
}

function handleStreamEnd() {
    hideError(); // Hide any errors on successful stream end

    const storyResponse = document.getElementById('story-response');
    storyResponse.innerHTML = storyBuffer;

    document.getElementById('loading-spinner').style.display = 'none';
    const clearStoryButton = document.getElementById('clear-story-button');
    clearStoryButton.style.display = 'block';
    clearStoryButton.disabled = false;

    const generateStoryButton = document.querySelector('.generate-story-button');
    if (generateStoryButton) {
        generateStoryButton.disabled = false;
        generateStoryButton.innerHTML = generateStoryButtonOriginalHTML; // Restore original content
    }
}

function handleStoryError(data) {
    // Hide the loading spinner
    document.getElementById('loading-spinner').style.display = 'none';

    // Restore the generate story button
    const generateStoryButton = document.querySelector('.generate-story-button');
    if (generateStoryButton) {
        generateStoryButton.disabled = false;
        generateStoryButton.innerHTML = generateStoryButtonOriginalHTML;
    }

    // Display the error message in the dedicated error container
    showError(`An error occurred while generating the story: ${data.error}`);

    // Also show the "New story" button to allow the user to restart
    const clearStoryButton = document.getElementById('clear-story-button');
    clearStoryButton.style.display = 'block';
    clearStoryButton.disabled = false;
}

function initSocketIO() {
    socket.on('prompt', handlePrompt);
    socket.on('response', handleResponse);
    socket.on('stream_end', handleStreamEnd);
    socket.on('story_error', handleStoryError);

    socket.on('connect', () => {
        hideError(); // Clear any previous errors on successful connection
    });

    socket.on('disconnect', () => {
        showError("Connection to backend lost. Please refresh the page or check the backend server.");
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

function getRandomElement(elements) {
    if (elements.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * elements.length);
    return elements[randomIndex];
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

            // Collapse the current container
            const content = container.querySelector('.parameter-content');
            const arrow = container.querySelector('.arrow-icon');
            content.style.display = 'none';
            arrow.classList.remove('rotated');

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
                const paragraphChips = paragraph.querySelectorAll('.chip');
                paragraphChips.forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                updateStoryTypeHeader(container);
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
    optionalText.innerHTML = '';
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
            plusSpan.style.display = 'inline-block';
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

function gatherDataAndGenerateStory() {
    document.querySelectorAll('.parameter-container').forEach(container => {
        const content = container.querySelector('.parameter-content');
        if (content && content.style.display === 'block') {
            content.style.display = 'none';
            const arrow = container.querySelector('.arrow-icon');
            if (arrow) {
                arrow.classList.remove('rotated');
            }
        }
    });

    const age = document.querySelector('.parameter-container:nth-child(1) .chip.selected')?.textContent.trim() || 'any';
    const theme = document.querySelector('.parameter-container:nth-child(2) .chip.selected')?.textContent.trim() || 'any';
    const storyTypeContainer = document.querySelector('.parameter-container:nth-child(3)');
    const tone = storyTypeContainer.querySelector('.story-type-paragraph:nth-child(1) .chip.selected')?.textContent.trim() || 'any';
    const endingType = storyTypeContainer.querySelector('.story-type-paragraph:nth-child(2) .chip.selected')?.textContent.trim() || 'any';
    const narrativeStructure = storyTypeContainer.querySelector('.story-type-paragraph:nth-child(3) .chip.selected')?.textContent.trim() || 'any';
    const duration = storyTypeContainer.querySelector('.story-type-paragraph:nth-child(4) .chip.selected')?.textContent.trim() || 'any';
    
    const characters = [];
    const characterGroups = document.querySelectorAll('.character-input-group');
    characterGroups.forEach(group => {
        const name = group.querySelector('.character-name').value.trim();
        const role = group.querySelector('.character-role').value;
        const description = group.querySelector('.character-description').value.trim();
        if (name && role) {
            characters.push({ name, role, description });
        }
    });

    const other = document.querySelector('.other-textarea').value.trim();

    const storyData = {
        age,
        theme,
        tone,
        endingType,
        narrativeStructure,
        duration,
        characters,
        other,
    };

    generateStory(storyData);
}

function generateStory(data) {
    hideError(); // Hide any errors when starting a new generation
    document.querySelector('.story-output-placeholder').style.display = 'none';
    const responseArea = document.getElementById('story-response-area');
    responseArea.style.display = 'flex';
    document.getElementById('prompt-container').style.display = 'none';
    document.getElementById('prompt-display').textContent = '';
    document.getElementById('story-container').style.display = 'none';
    document.getElementById('story-response').innerHTML = ''; // Use innerHTML to clear
    storyBuffer = ''; // Reset buffer
    document.getElementById('loading-spinner').style.display = 'block'; // Show the general loading spinner

    const generateStoryButton = document.querySelector('.generate-story-button');
    if (generateStoryButton) {
        generateStoryButton.disabled = true;
        // Append the spinner instead of replacing innerHTML
        generateStoryButton.innerHTML += '<div class="button-spinner spinner"></div>';
    }
    
    document.getElementById('clear-story-button').style.display = 'none';
    socket.emit('generate_story', data);
}

function resetStoryView() {
    hideError(); // Hide any errors when resetting view
    document.querySelector('.story-output-placeholder').style.display = 'flex';
    const responseArea = document.getElementById('story-response-area');
    responseArea.style.display = 'none';
    document.getElementById('prompt-container').style.display = 'none';
    document.getElementById('story-container').style.display = 'none';
    document.getElementById('prompt-display').innerHTML = '';
    document.getElementById('story-response').textContent = '';

    // Reset parameter selections
    document.querySelectorAll('.chip.selected').forEach(chip => {
        chip.classList.remove('selected');
    });

    document.querySelectorAll('.selected-value').forEach(selectedValue => {
        selectedValue.innerHTML = '';
        selectedValue.style.display = 'none';
    });

    // Reset Story type optional text
    document.querySelectorAll('.parameter-container:nth-child(3) .optional-text').forEach(optionalText => {
        optionalText.textContent = '(optional)';
    });

    // Clear character inputs and remove extra groups
    const characterInputGroups = document.querySelectorAll('.character-input-group');
    characterInputGroups.forEach((group, index) => {
        if (index === 0) { // Only clear the first group, others will be removed
            group.querySelector('.character-name').value = '';
            group.querySelector('.character-role').selectedIndex = 0;
            group.querySelector('.character-description').value = '';
            group.querySelector('.delete-character-button').style.display = 'none';
        } else {
            group.remove();
        }
    });
    document.querySelector('.add-character-button').style.display = 'block'; // Ensure add character button is visible

    // Clear "Other" textarea
    const otherTextarea = document.querySelector('.other-textarea');
    if (otherTextarea) {
        otherTextarea.value = '';
        const charCounter = document.querySelector('.char-counter');
        if (charCounter) {
            charCounter.textContent = `0 / ${otherTextarea.maxLength}`;
        }
    }

    // Restore "Generate story" button to original state
    const generateStoryButton = document.querySelector('.generate-story-button');
    if (generateStoryButton) {
        generateStoryButton.style.display = 'none'; // Keep hidden if no chars, will be set to flex by checkCharactersAndUnlockNext
        generateStoryButton.disabled = false;
        generateStoryButton.innerHTML = generateStoryButtonOriginalHTML;
    }

    // Reset parameter containers state
    const parameterContainers = document.querySelectorAll('.parameter-container');
    parameterContainers.forEach((container, index) => {
        const content = container.querySelector('.parameter-content');
        const arrow = container.querySelector('.arrow-icon');

        if (index === 0) { // Age container
            content.style.display = 'block';
            arrow.classList.add('rotated');
            container.classList.remove('disabled');
        } else {
            if (container.id !== 'prompt-container') {
                container.classList.add('disabled');
            }
            content.style.display = 'none';
            arrow.classList.remove('rotated');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();

    const generateStoryButton = document.querySelector('.generate-story-button');
    if (generateStoryButton) {
        generateStoryButtonOriginalHTML = generateStoryButton.innerHTML; // Store original content
    }

    const parameterContainers = document.querySelectorAll('.parameter-container');

    parameterContainers.forEach((container, index) => {
        if (index === 0) {
            const content = container.querySelector('.parameter-content');
            const arrow = container.querySelector('.arrow-icon');
            content.style.display = 'block';
            arrow.classList.add('rotated');
        } else {
            if (container.id !== 'prompt-container') {
                container.classList.add('disabled');
            }
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
                checkCharactersAndUnlockNext(document.querySelector('.parameter-container:nth-child(4)'));
            });
            charactersList.appendChild(newCharacterGroup);
            if (document.querySelectorAll('.character-input-group').length === 5) {
                addCharacterButton.style.display = 'none';
            }
        }
    });

    document.querySelector('.generate-story-button').addEventListener('click', gatherDataAndGenerateStory);

    
    const modal = document.getElementById('new-story-modal');
    const clearButton = document.getElementById('clear-story-button');
    const closeButton = document.querySelector('.close-button');
    const confirmButton = document.getElementById('confirm-new-story-button');

    clearButton.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    confirmButton.addEventListener('click', () => {
        resetStoryView();
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    document.getElementById('copy-story-button').addEventListener('click', () => {
        const storyText = document.getElementById('story-response').innerText;
        const copyButton = document.getElementById('copy-story-button');
        const originalHTML = copyButton.innerHTML;
        const textarea = document.createElement('textarea');
        textarea.value = storyText;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            copyButton.textContent = 'Copied!';
            copyButton.disabled = true;
        } catch (err) {
            console.error('Could not copy text: ', err);
        }
        document.body.removeChild(textarea);

        setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.disabled = false;
        }, 2000);
    });

    document.getElementById('generate-randomly-button').addEventListener('click', () => {
        hideError(); // Hide any errors when starting a new generation
        // Age
        const ageChips = document.querySelectorAll('.parameter-container:nth-child(1) .chip');
        const randomAgeChip = getRandomElement(ageChips);
        const age = randomAgeChip ? randomAgeChip.textContent.trim() : 'any';

        // Theme
        const themeChips = document.querySelectorAll('.parameter-container:nth-child(2) .chip');
        const randomThemeChip = getRandomElement(themeChips);
        const theme = randomThemeChip ? randomThemeChip.textContent.trim() : 'any';

        // Story Type
        const storyTypeContainer = document.querySelector('.parameter-container:nth-child(3)');
        
        // Tone
        const toneChips = storyTypeContainer.querySelectorAll('.story-type-paragraph:nth-child(1) .chip');
        const randomToneChip = getRandomElement(toneChips);
        const tone = randomToneChip ? randomToneChip.textContent.trim() : 'any';

        // Ending type
        const endingTypeChips = storyTypeContainer.querySelectorAll('.story-type-paragraph:nth-child(2) .chip');
        const randomEndingTypeChip = getRandomElement(endingTypeChips);
        const endingType = randomEndingTypeChip ? randomEndingTypeChip.textContent.trim() : 'any';
        
        // Narrative structure
        const narrativeStructureChips = storyTypeContainer.querySelectorAll('.story-type-paragraph:nth-child(3) .chip');
        const randomNarrativeStructureChip = getRandomElement(narrativeStructureChips);
        const narrativeStructure = randomNarrativeStructureChip ? randomNarrativeStructureChip.textContent.trim() : 'any';

        // Duration
        const durationChips = storyTypeContainer.querySelectorAll('.story-type-paragraph:nth-child(4) .chip');
        const randomDurationChip = getRandomElement(durationChips);
        const duration = randomDurationChip ? randomDurationChip.textContent.trim() : 'any';

        // Characters and Other will be empty for random generation.
        const characters = [];
        const other = '';

        const storyData = {
            age,
            theme,
            tone,
            endingType,
            narrativeStructure,
            duration,
            characters,
            other,
        };

        generateStory(storyData);
    });
});