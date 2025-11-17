// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

function generateRandomTestStory() {
    document.querySelector('.story-output-placeholder').style.display = 'none';
    const responseArea = document.getElementById('story-response-area');
    responseArea.style.display = 'flex';
    document.getElementById('prompt-container').style.display = 'none';
    document.getElementById('story-container').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';
    document.getElementById('story-response').textContent = '';
    document.getElementById('clear-story-button').style.display = 'none';
    setTimeout(() => {
        const randomStory = `Once upon a time, in a land far, far away, there lived a brave ${Math.random() > 0.5 ? 'knight' : 'princess'}. They embarked on a quest to find a magical ${Math.random() > 0.5 ? 'dragon' : 'unicorn'} and save their kingdom from a wicked ${Math.random() > 0.5 ? 'sorcerer' : 'giant'}. After many adventures and challenges, they succeeded and lived happily ever after. The end.`;
        document.getElementById('story-container').style.display = 'flex';
        const storyResponse = document.getElementById('story-response');
        storyResponse.textContent += randomStory;
        document.getElementById('loading-spinner').style.display = 'none';
        const clearStoryButton = document.getElementById('clear-story-button');
        clearStoryButton.style.display = 'block';
        clearStoryButton.disabled = false;
    }, 1500);
}

function initSocketIO() {
    socket.on('response', (data) => {
        document.getElementById('story-container').style.display = 'flex';
        const storyResponse = document.getElementById('story-response');
        document.getElementById('loading-spinner').style.display = 'none';
        const clearStoryButton = document.getElementById('clear-story-button');
        clearStoryButton.style.display = 'block';
        clearStoryButton.disabled = false;
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
    const protagonist = characters.find(c => c.role === 'protagonist');
    const helper = characters.find(c => c.role === 'positive-helper');
    const antagonist = characters.find(c => c.role === 'antagonist');
    const other = document.querySelector('.other-textarea').value.trim();
    const formattedPrompt = `As a parent who loves to read bedtime stories to my <strong>${age}</strong> year old child, I need a delightful and age-appropriate story about an <strong>${protagonist ? protagonist.description : ''}</strong>, <strong>${protagonist ? protagonist.name : 'a character'}</strong> accompanied by his <strong>${helper ? helper.description : ''}</strong> helper <strong>${helper ? helper.name : 'a friend'}</strong> who will have to face the <strong>${antagonist ? antagonist.description : ''}</strong> antagonist <strong>${antagonist ? antagonist.name : 'a villain'}</strong>. The story type is <strong>${theme}</strong>. The tone should be <strong>${tone}</strong>. The format should be a narrative-style story with a clear beginning, middle, and end, allowing for a smooth and engaging reading experience. The objective is to entertain and soothe the child before bedtime. Provide a brief introduction to set the scene and introduce the main character. The scope should revolve around the topic: managing emotions and conflicts. The length should be approximately <strong>${duration}</strong>. Please ensure the story has a <strong>${narrativeStructure}</strong> narrative structure, leaving the child with a sense of <strong>${endingType}</strong>. The language should be easy to understand and suitable for my child's age comprehension.
    ${other ? `

Other on optional stuff for the story: <strong>${other}</strong>` : ''}`;
    document.getElementById('prompt-display').innerHTML = formattedPrompt;
    document.getElementById('prompt-container').style.display = 'flex';
    const rawPrompt = formattedPrompt.replace(/<strong>/g, '').replace(/<\/strong>/g, '');
    generateStory(rawPrompt);
}

function generateStory(msg) {
    document.querySelector('.story-output-placeholder').style.display = 'none';
    const responseArea = document.getElementById('story-response-area');
    responseArea.style.display = 'flex';
    document.getElementById('story-container').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';
    document.getElementById('story-response').textContent = '';
    document.getElementById('clear-story-button').style.display = 'none';
    socket.emit('generate_story', msg);
}

function resetStoryView() {
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

    // Hide "Generate story" button
    const generateStoryButton = document.querySelector('.generate-story-button');
    if (generateStoryButton) {
        generateStoryButton.style.display = 'none';
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
            container.classList.add('disabled');
            content.style.display = 'none';
            arrow.classList.remove('rotated');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();

    const parameterContainers = document.querySelectorAll('.parameter-container');

    parameterContainers.forEach((container, index) => {
        if (index === 0) {
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
    document.querySelector('.generate-randomly-button').addEventListener('click', generateRandomTestStory);
    
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
        const storyText = document.getElementById('story-response').textContent;
        navigator.clipboard.writeText(storyText).then(() => {
            const copyButton = document.getElementById('copy-story-button');
            const originalHTML = copyButton.innerHTML;
            copyButton.textContent = 'Copied!';
            copyButton.disabled = true;
            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
                copyButton.disabled = false;
            }, 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    });
});
