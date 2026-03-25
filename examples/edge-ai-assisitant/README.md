# Edge AI Assistant

The **Edge AI Assistant** example demonstrates how to build a generative AI chatbot using the Arduino Ventuno Q. It uses a Large Language Model (LLM) to create a chatbot that helps you in your daily life. The board exploits its own hardware features to run the model locally, preserving the confidentiality of your data.

## Description

This App transforms the Ventuno Q into an AI assistant. It uses the `llm` Brick to connect to a local AI model (qwen 2.5 7b) and the `web_ui` Brick to provide a chat-like interface.

The interface come with some pre-built prompts and a free text area, the thread of messages is developed according to a chat style: your enquires on the right and the AI replies on the left. 
Morover, there are some tips buttons that help you in building your prompts in the input text area.

## Bricks Used

The Edge AI assistant example uses the following Bricks:

- `llm`: Brick to interact with the local Large Language Models (LLMs) and to exploit the powerful Neural Processing Unit onboarded on the Arduino Ventuno Q.
- `web_ui`: Brick to create the chatbot-like web interface.

## Hardware and Software Requirements

### Hardware

- Arduino VENTUNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

## How to Use the Example

### Configure & Launch App

1. **Duplicate the Example**
   Since built-in examples are read-only, you must duplicate this App to edit the configuration. Click the arrow next to the App name and select **Duplicate** or click the **Copy and edit app** button on the top right corner of the App page.
   ![Duplicate example](assets/docs_assets/duplicate-app.png)

2. **Run the App**
   Launch the App by clicking the **Run** button in the top right corner. Wait for the App to start.
   ![Launch the App](assets/docs_assets/launch-app.png)

3. **Access the Web Interface**
   Open the App in your browser at `<VENTUNO-IP-ADDRESS>:7000`.

### Interacting with the App

1. **Choose Your Card**
   You have the opportunity to start a conversation with the AI starting from pre-built prompt or submit your own question.

2. **Chat page**
   In the chat page you can have a conversation with the AI. 
   Your enquires are on the left and the AI replies on the right in a chat-like style.

3. **Enhance your prompt**
   Click on the tips buttons to enhance your prompts to make them more sofisticated.
   The text inside the clicked button will be appended to your prompt in the text area.

4. **Interact**
   The AI responses are streamed in real-time. Once complete, you can:
   - **Continue on that topic** asking more questions.
   - Click **Reset chat** to reset the interface and start over.

## How it Works

Once the App is running, it performs the following operations:

- **Chatbot UI**: The `web_ui` Brick serves an HTML page where users can interact with the LLM in a chat-like style.
- **AI Inference**: The `llm` Brick sends the prompt to the local LLM.
- **Stream Processing**: Instead of waiting for the full text, the backend receives the response in chunks (tokens) and forwards them immediately to the frontend via WebSockets, ensuring the user sees progress instantly.

## Understanding the Code

### 🔧 Backend (`main.py`)

The Python script handles the logic of connecting to the AI and managing the data flow. Note that the API Key is not hardcoded; it is retrieved automatically from the Brick configuration.

- **Initialization**: The `LargeLanguageModel` is set up with a system prompt that enforces HTML formatting for the output, and for meaningful responses.

```python
llm = LargeLanguageModel(
                model="genie:qwen2.5-7b",
                system_prompt=load_system_prompt()
            )

llm.with_memory(20)
```

- **Prompt execution**: The `generate_prompt` function gets the prompt from the user and queries the LLM. The LLM response is streamed to the UI with the function `ui.send_message("response", resp)`

```python
def generate_prompt(_, data):
    try:
        prompt = data.get('prompt', '')
        # Use the plain text prompt for the LLM and stream the response
        for resp in llm.chat_stream(prompt):
            ui.send_message("response", resp)

        # Signal the end of the stream
        ui.send_message("stream_end", {})
    except Exception as e:
        ui.send_message("llm_error", {"error": str(e)})
```

### 🔧 Frontend (`app.js`)

The JavaScript manages the complex UI interactions, buttons, and WebSocket communication.

- **Socket Listeners**: The frontend listens for chunks of text and appends them to the display buffer, creating the streaming effect.

```javascript

function initSocketIO() {
    socket.on('response', handleResponse);
    socket.on('stream_end', handleStreamEnd);
    ```omissis```
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
```
