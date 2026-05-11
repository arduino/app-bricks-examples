// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ui = new WebUI();
ui.on_connect(onUIConnected);
ui.on_disconnect(onUIDisconnected);
ui.on_message('response', handleResponse);
ui.on_message('stream_end', handleStreamEnd);
ui.on_message('llm_error', handleLLMError);
ui.on_message('command_ok', handleCompletedCommand);
ui.on_message('command_error', handleCommandError);

let thinkingMessageElement = null;
let lastUserPrompt = '';
let isFirstPrompt = true;
let thinkingMessageInterval = null;

const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const chatMessagesContainer = document.getElementById(
  'chat-messages-container',
);
const userInput = document.getElementById('user-input');
const messagesContainer = document.getElementById('messages');
const emptyChatContainer = document.getElementById('empty-chat-container');
const mainContent = document.querySelector('.main-content');
const sendButton = document.getElementById('send-button');
const sendButtonImg = sendButton ? sendButton.querySelector('img') : null;
const quickActionButtonsContainer = document.getElementById(
  'quick-action-buttons',
);
const clearChatButton = document.getElementById('clear-chat-button-header');
const card1 = document.getElementById('card-1');
const card2 = document.getElementById('card-2');
const card3 = document.getElementById('card-3');
const card4 = document.getElementById('card-4');

function onUIConnected() {
    console.log('Connected to backend');
}

function onUIDisconnected() {
  showError(
    'Connection to backend lost. Please refresh the page or check the backend server.',
  );
}

/**
 * Displays an error message in the error banner.
 * @param {string} message - The error message to display.
 */
function showError(message) {
  console.log(message);
  errorMessage.textContent = message;
  errorBanner.style.display = 'block';
}

/** Hides the error banner. */
function hideError() {
  errorBanner.style.display = 'none';
}

/** Scrolls the chat messages container to the bottom. */
function scrollToBottom() {
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

/** Removes the thinking/loading message from the chat if present. */
function removeThinkingMessage() {
  if (thinkingMessageInterval) {
    clearInterval(thinkingMessageInterval);
    thinkingMessageInterval = null;
  }
  if (thinkingMessageElement && thinkingMessageElement.parentNode) {
    thinkingMessageElement.parentNode.removeChild(thinkingMessageElement);
    thinkingMessageElement = null;
  }
}

/**
 * Handles a streamed response chunk from the backend.
 * On the first chunk, clears the thinking message and starts rendering the response.
 * Updates the AI response element with parsed markdown content.
 * @param {string} data - The text chunk received from the stream.
 */
function handleResponse(data) {
  const ai_msg = document.getElementById('active-ai-response');
  if (thinkingMessageElement) {
    if (thinkingMessageInterval) {
      clearInterval(thinkingMessageInterval);
      thinkingMessageInterval = null;
    }
    if (isFirstPrompt) {
      isFirstPrompt = false;
    }
    thinkingMessageElement.querySelector('.text-content').innerHTML = '';
    thinkingMessageElement.classList.remove('thinking-message');
    thinkingMessageElement.dataset.rawText = '';
    thinkingMessageElement = null;
  }

  if (ai_msg) {
    ai_msg.dataset.rawText += data;
    ai_msg.querySelector('.text-content').innerHTML = marked.parse(
      ai_msg.dataset.rawText,
    );
    scrollToBottom();
  }
}

/**
 * Handles the end of a streamed response.
 * Removes the thinking message, restores UI to idle state, and updates button states.
 */
function handleStreamEnd() {
  removeThinkingMessage();
  ai_msg = document.getElementById('active-ai-response');
  if (ai_msg) {
    ai_msg.id = '';
  }
  sendButton.classList.remove('sending-state');
  sendButtonImg.src = 'img/send.svg';
  updateSendButtonState();
  updateClearChatButtonState();
}

/** Handles the stop_stream command: ends the stream and restores the last user prompt. */
function handleStopStream() {
  handleStreamEnd();
  const disclaimer = document.createElement('div');
  disclaimer.className = 'stop-disclaimer';
  disclaimer.textContent = 'You stopped this response';
  messagesContainer.appendChild(disclaimer);

  userInput.value = lastUserPrompt;
  autoExpandInput(userInput);
  updateSendButtonState();
  userInput.focus();
}

/** Handles the clear_chat command: resets the chat UI to its initial empty state. */
function handleClearChat() {
  messagesContainer.innerHTML = '';
  emptyChatContainer.style.display = 'flex';
  mainContent.classList.remove('chat-active');
  userInput.value = '';
  userInput.style.height = '56px';
  quickActionButtonsContainer.style.display = 'none';
  lastUserPrompt = '';
  updateSendButtonState();
  updateClearChatButtonState();
  userInput.focus();
}

/**
 * Dispatches a completed command event to the appropriate handler.
 * @param {{command: string}} data - The command payload from the backend.
 */
function handleCompletedCommand(data) {
  console.log(`Command completed: ${data.command}`);

  if (data.command === 'stop_stream') {
    handleStopStream();
  } else if (data.command === 'clear_chat') {
    handleClearChat();
  }
}

/**
 * Handles a command error event from the backend.
 * @param {{command: string, error: string}} data - The error payload.
 */
function handleCommandError(data) {
  const message = `Command error: ${data.command} - ${data.error}`;
  showError(message);
}

/** Emits a clear_chat command to the backend. */
function sendClearChatCommand() {
  ui.send_message('commands', { command: 'clear_chat' });
}

/**
 * Handles an LLM error event from the backend.
 * Displays the error message, removes thinking state, and restores UI.
 * @param {{error: string}} data - The error payload containing the error message.
 */
function handleLLMError(data) {
  const message = `LLM error: ${data.error}`;
  showError(message);
  removeThinkingMessage();
  quickActionButtonsContainer.style.display = 'none';
  handleStreamEnd();
}



/**
 * Expands or collapses a textarea based on its content.
 * Maintains minimum height of 56px and maximum height of 200px.
 * Scrolls to the bottom when content expands beyond the minimum height.
 * @param {HTMLTextAreaElement} field - The textarea element to resize.
 */
function autoExpandInput(field) {
  field.style.height = '56px';

  if (field.value.trim() === '') {
    return;
  }

  const scrollHeight = field.scrollHeight;

  if (scrollHeight > 56) {
    const newHeight = Math.min(scrollHeight, 200);
    field.style.height = `${newHeight}px`;
    field.scrollTop = field.scrollHeight;
  }
}

/**
 * Updates the send button's disabled/enabled state.
 * Button is disabled when input is empty and enabled when the user is typing.
 * When a response is being streamed, the button acts as a stop button.
 */
function updateSendButtonState() {
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

/** Updates the clear chat button's disabled/enabled state based on whether there are messages. */
function updateClearChatButtonState() {
  if (messagesContainer.children.length === 0) {
    clearChatButton.classList.add('disabled');
    clearChatButton.setAttribute('disabled', 'disabled');
  } else {
    clearChatButton.classList.remove('disabled');
    clearChatButton.removeAttribute('disabled');
  }
}

/**
 * Sends a user message to the backend and updates the chat UI.
 * Creates a user message element, displays a loading indicator,
 * and emits the message via WebSocket for backend processing.
 * @param {string} [text] - The message text. If omitted, reads from the textarea input.
 */
function sendMessage(text) {
  hideError();
  emptyChatContainer.style.display = 'none';
  mainContent.classList.add('chat-active');

  if (!text) {
    text = userInput.value;
  }
  lastUserPrompt = text;

  sendButton.classList.add('sending-state');
  sendButtonImg.src = 'img/stop.svg';

  userInput.value = '';
  userInput.style.height = '56px';
  updateSendButtonState();

  quickActionButtonsContainer.style.display = 'flex';

  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'user-message';
  userMessageDiv.textContent = text;
  messagesContainer.appendChild(userMessageDiv);
  scrollToBottom();

  thinkingMessageElement = document.createElement('div');
  thinkingMessageElement.className = 'ai-response thinking-message';
  thinkingMessageElement.id = 'active-ai-response';

  const icon = document.createElement('img');
  icon.src = 'img/sparkle.svg';
  icon.className = 'ai-icon';
  thinkingMessageElement.appendChild(icon);

  const textContent = document.createElement('div');
  textContent.className = 'text-content';

  const message = isFirstPrompt ? 'Loading Model' : 'Thinking';
  let dotsCount = 0;
  textContent.innerHTML = `<span class="circular-loader"></span>${message}`;
  thinkingMessageInterval = setInterval(() => {
    dotsCount = (dotsCount + 1) % 4;
    textContent.innerHTML = `<span class="circular-loader"></span>${message}${'.'.repeat(dotsCount)}`;
  }, 600);

  thinkingMessageElement.appendChild(textContent);

  messagesContainer.appendChild(thinkingMessageElement);
  scrollToBottom();

  ui.send_message('prompt', { prompt: text });
  updateClearChatButtonState();
  userInput.focus();
}


// Initial state
updateSendButtonState();
updateClearChatButtonState();
userInput.focus(); // Set initial focus

// Listen for input changes
userInput.addEventListener('input', () => {
  autoExpandInput(userInput);
  updateSendButtonState();
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
sendButton.addEventListener('click', (event) => {
  event.preventDefault(); // Prevent default form submission if any
  if (sendButton.classList.contains('disabled')) {
    return;
  } else if (sendButton.classList.contains('sending-state')) {
    ui.send_message('commands', { command: 'stop_stream' });
  } else {
    sendMessage();
  }
});

clearChatButton.addEventListener('click', (event) => {
  if (clearChatButton.classList.contains('disabled')) {
    event.preventDefault(); // Prevent action if disabled
  } else {
    sendClearChatCommand();
  }
});

// Add event listeners for quick action buttons
const quickButtons = quickActionButtonsContainer.querySelectorAll(
  '.quick-action-button',
);
quickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (userInput.value.length > 0 && userInput.value.slice(-1) !== ' ') {
      userInput.value += ' ';
    }
    userInput.value += button.textContent;
    autoExpandInput(userInput);
    updateSendButtonState();
    userInput.focus();
  });
});

card1.addEventListener('click', () =>
  sendMessage(card1.querySelector('p').textContent),
);
card2.addEventListener('click', () =>
  sendMessage(card2.querySelector('p').textContent),
);
card3.addEventListener('click', () =>
  sendMessage(card3.querySelector('p').textContent),
);
card4.addEventListener('click', () =>
  sendMessage(card4.querySelector('p').textContent),
);
