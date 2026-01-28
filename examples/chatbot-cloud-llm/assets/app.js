// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

let thinkingMessageElement = null; // To keep track of the thinking message element
let sendButton;
let sendButtonImg;
let quickActionButtonsContainer;
let customPlaceholder;
let lastUserPrompt = ''; // To store the last user prompt

function showError(message) {
    console.log(message);
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorBanner && errorMessage) {
        errorMessage.textContent = message;
        errorBanner.style.display = 'block';
    }
}

function hideError() {
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
        errorBanner.style.display = 'none';
    }
}

function removeThinkingMessage() {
    if (thinkingMessageElement && thinkingMessageElement.parentNode) {
        thinkingMessageElement.parentNode.removeChild(thinkingMessageElement);
        thinkingMessageElement = null;
    }
}

function handleResponse(data) {
    const ai_msg = document.getElementById('active-ai-response');
    if (thinkingMessageElement) {
        // First chunk of stream
        const textContent = thinkingMessageElement.querySelector('.text-content');
        if (textContent) {
            textContent.innerHTML = '';
        }
        thinkingMessageElement.classList.remove('thinking-message');
        thinkingMessageElement.dataset.rawText = '';
        thinkingMessageElement = null;
    }

    if (ai_msg) {
        ai_msg.dataset.rawText += data;
        const textContent = ai_msg.querySelector('.text-content');
        if (textContent) {
            textContent.innerHTML = marked.parse(ai_msg.dataset.rawText);
        }
    }
}

function handleStreamEnd() {
    removeThinkingMessage(); // Ensure it's removed if stream ends
    ai_msg = document.getElementById('active-ai-response');
    if (ai_msg) {
        ai_msg.id = '';
    }
    if (sendButton) {
        sendButton.classList.remove('sending-state');
        if (sendButtonImg) {
            sendButtonImg.src = 'img/send.svg';
        }
    }
    updateSendButtonState(); // Update button state after stream ends
    updateClearChatButtonState(); // Update clear chat button state after stream ends
}

function handleCompletedCommand(data) {
    console.log(`Command completed: ${data.command}`);
    const userInput = document.getElementById('user-input'); // Get it once

    if (data.command === 'stop_stream'){
        handleStreamEnd();
        const disclaimer = document.createElement('div');
        disclaimer.className = 'stop-disclaimer';
        disclaimer.textContent = 'You stopped this response';
        document.getElementById('messages').appendChild(disclaimer);

        if (userInput) {
            userInput.value = lastUserPrompt;
            autoExpandInput(userInput);
            updateSendButtonState();
            updatePlaceholderVisibility();
            userInput.focus();
        }
    } else if (data.command === 'clear_chat') {
        document.getElementById('messages').innerHTML = '';
        document.getElementById('empty-chat-container').style.display = 'flex';
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.remove('chat-active');
        }
        if (userInput) {
            userInput.value = '';
            userInput.style.height = '32px';
        }
        if (quickActionButtonsContainer) {
            quickActionButtonsContainer.style.display = 'none'; // Hide quick action buttons
        }
        lastUserPrompt = '';
        updateSendButtonState();
        updateClearChatButtonState();
        updatePlaceholderVisibility();
        if (userInput) {
            userInput.focus();
        }
    }
}

function handleCommandError(data) {
    const message = `Command error: ${data.command} - ${data.error}`;
    showError(message);
}

function sendClearChatCommand() {
    socket.emit('commands', { command: 'clear_chat' });
}



function handleLLMError(data) {
    const message = `LLM error: ${data.error}`;
    showError(message);
    removeThinkingMessage(); // Ensure it's removed if an error occurs
    if (quickActionButtonsContainer) {
        quickActionButtonsContainer.style.display = 'none'; // Hide quick action buttons
    }
    handleStreamEnd();
}

function initSocketIO() {
    socket.on('response', handleResponse);
    socket.on('stream_end', handleStreamEnd);
    socket.on('llm_error', handleLLMError);
    socket.on('command_ok', handleCompletedCommand);
    socket.on('command_error', handleCommandError);

    socket.on('connect', () => {
        console.log("Connected to backend");
    });

    socket.on('disconnect', () => {
        showError("Connection to backend lost. Please refresh the page or check the backend server.");
    });
}

function autoExpandInput(field) {
    field.style.height = 'auto';
    field.style.height = field.scrollHeight + 'px';
}

function updateSendButtonState() {
    const userInput = document.getElementById('user-input');
    if (userInput && sendButton) {
        if (sendButton.classList.contains('sending-state')) {
            sendButton.classList.remove('disabled');
            sendButton.removeAttribute('disabled');
            return;
        }

        if (userInput.value.trim() === '') {
            sendButton.classList.add('disabled');
            sendButton.setAttribute('disabled', 'disabled');
        } else {
            sendButton.classList.remove('disabled');
            sendButton.removeAttribute('disabled');
        }
    }
}

function updateClearChatButtonState() {
    const messagesContainer = document.getElementById('messages');
    const clearChatButton = document.getElementById('clear-chat-button-header');
    if (messagesContainer && clearChatButton) {
        if (messagesContainer.children.length === 0) {
            clearChatButton.classList.add('disabled');
            clearChatButton.setAttribute('disabled', 'disabled');
        } else {
            clearChatButton.classList.remove('disabled');
            clearChatButton.removeAttribute('disabled');
        }
    }
}

function sendMessage(text) {
    hideError();
    document.getElementById('empty-chat-container').style.display = 'none';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('chat-active');
    }
    const userInput = document.getElementById('user-input');
    if (!text) {
        text = userInput.value;
    }
    lastUserPrompt = text; // Store the prompt

    if (sendButton) {
        sendButton.classList.add('sending-state');
        if (sendButtonImg) {
            sendButtonImg.src = 'img/stop.svg';
        }
    }

    userInput.value = '';
    userInput.style.height = '32px';
    updateSendButtonState();
    updatePlaceholderVisibility();

    if (quickActionButtonsContainer) {
        quickActionButtonsContainer.style.display = 'flex';
    }

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'user-message';
    userMessageDiv.textContent = text;
    document.getElementById('messages').appendChild(userMessageDiv);

    thinkingMessageElement = document.createElement('div');
    thinkingMessageElement.className = 'ai-response thinking-message';
    thinkingMessageElement.id = 'active-ai-response';

    const icon = document.createElement('img');
    icon.src = 'img/sparkle.svg';
    icon.className = 'ai-icon';
    thinkingMessageElement.appendChild(icon);

    const textContent = document.createElement('div');
    textContent.className = 'text-content';
    textContent.innerHTML = '<span class="circular-loader"></span>Thinking<span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span>';
    thinkingMessageElement.appendChild(textContent);

    document.getElementById('messages').appendChild(thinkingMessageElement);

    socket.emit('prompt', { prompt: text });
    updateClearChatButtonState();
    document.getElementById('user-input').focus();
}

function updatePlaceholderVisibility() {
    const userInput = document.getElementById('user-input');
    if (customPlaceholder) {
        if (userInput.value.trim() === '') {
            customPlaceholder.style.display = 'flex';
        } else {
            customPlaceholder.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();

    const userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button');
    sendButtonImg = sendButton ? sendButton.querySelector('img') : null;
    quickActionButtonsContainer = document.getElementById('quick-action-buttons');
    customPlaceholder = document.querySelector('.custom-placeholder');
    const clearChatButton = document.getElementById('clear-chat-button-header');

    // Initial state
    updateSendButtonState();
    updateClearChatButtonState();
    updatePlaceholderVisibility();
    userInput.focus(); // Set initial focus

    // Listen for input changes
    userInput.addEventListener('input', () => {
        autoExpandInput(userInput);
        updateSendButtonState();
        updatePlaceholderVisibility();
    });

    // Listen for Enter key press in the input field
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            // Ensure the send button is not disabled before sending
            if (!sendButton.classList.contains('disabled')) {
                sendMessage();
            }
        }
    });

    // Use a single click handler for the send button, acting as send or stop
    if (sendButton) {
        sendButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default form submission if any
            if (sendButton.classList.contains('disabled')) {
                return;
            } else if (sendButton.classList.contains('sending-state')) {
                socket.emit('commands', { command: 'stop_stream' });
            } else {
                sendMessage();
            }
        });
    }

    clearChatButton.addEventListener('click', (event) => {
        if (clearChatButton.classList.contains('disabled')) {
            event.preventDefault(); // Prevent action if disabled
        } else {
            sendClearChatCommand();
        }
    });

    // Add event listeners for quick action buttons
    if (quickActionButtonsContainer) {
        const quickButtons = quickActionButtonsContainer.querySelectorAll('.quick-action-button');
        quickButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (userInput.value.length > 0 && userInput.value.slice(-1) !== ' ') {
                    userInput.value += ' ';
                }
                userInput.value += button.textContent;
                autoExpandInput(userInput);
                updateSendButtonState();
                updatePlaceholderVisibility();
                userInput.focus();
            });
        });
    }

    document.getElementById('card-1').addEventListener('click', () => sendMessage(document.getElementById('card-1').querySelector('p').textContent));
    document.getElementById('card-2').addEventListener('click', () => sendMessage(document.getElementById('card-2').querySelector('p').textContent));
    document.getElementById('card-3').addEventListener('click', () => sendMessage(document.getElementById('card-3').querySelector('p').textContent));
    document.getElementById('card-4').addEventListener('click', () => sendMessage(document.getElementById('card-4').querySelector('p').textContent));
});