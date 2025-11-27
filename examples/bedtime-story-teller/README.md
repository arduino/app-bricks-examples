# Bedtime Story Teller

The **Bedtime Story Teller** example demonstrates how to build a generative AI application using the Arduino UNO Q. It uses a Large Language Model (LLM) to create personalized bedtime stories based on user-selected parameters like age, theme, and characters, streaming the result in real-time to a web interface.

![Bedtime Story Teller Example](assets/docs_assets/thumbnail.png)

## Description

This App transforms the UNO Q into an AI storytelling assistant. It uses the `cloud_llm` Brick to connect to a cloud-based AI model and the `web_ui` Brick to provide a rich configuration interface.

The workflow allows you to craft a story by selecting specific parameters—such as the child's age, story theme, tone, and specific characters—or to let the App **generate a story randomly** for a quick surprise. The backend constructs a detailed prompt, sends it to the AI model, and streams the generated story back to the browser text-token by text-token.

## Bricks Used

The bedtime story teller example uses the following Bricks:

- `cloud_llm`: Brick to interact with cloud-based Large Language Models (LLMs) like Google Gemini, OpenAI GPT, or Anthropic Claude.
- `web_ui`: Brick to create the web interface for parameter input and story display.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** This example requires an active internet connection to reach the AI provider's API. You will also need a valid **API Key** for the service used (e.g., Google AI Studio API Key).

## How to Use the Example

This example requires a valid API Key from an LLM provider (Google Gemini, OpenAI GPT, or Anthropic Claude) and an internet connection.

### Configure & Launch App

1. **Duplicate the Example**
   Since built-in examples are read-only, you must duplicate this App to edit the configuration. Click the arrow next to the App name and select **Duplicate** or click the **Copy and edit app** button on the top right corner of the App page.
   ![Duplicate example](assets/docs_assets/duplicate-app.png)

2. **Open Brick Configuration**
   On the App page, locate the **Bricks** section on the left. Click on the **Cloud LLM** Brick, then click the **Brick Configuration** button on the right side of the screen.
   ![Open Brick Configuration](assets/docs_assets/brick-config.png)

3. **Add API Key**
   In the configuration panel, enter your API Key into the corresponding field. This securely saves your credentials for the App to use. You can generate an API key from your preferred provider:
   *   **Google Gemini:** [Get API Key](https://aistudio.google.com/app/apikey)
   *   **OpenAI GPT:** [Get API Key](https://platform.openai.com/api-keys)
   *   **Anthropic Claude:** [Get API Key](https://console.anthropic.com/settings/keys)

   ![Enter your API KEY](assets/docs_assets/brick-credentials.png)

4. **Run the App**
   Launch the App by clicking the **Run** button in the top right corner. Wait for the App to start.
   ![Launch the App](assets/docs_assets/launch-app.png)

5. **Access the Web Interface**
   Open the App in your browser at `<UNO-Q-IP-ADDRESS>:7000`.

### Interacting with the App

1. **Choose Your Path**
   You have two options to create a story:
   *   **Option A: Manual Configuration** (Follow step 2)
   *   **Option B: Random Generation** (Skip to step 3)

2. **Set Parameters (Manual)**
   Use the interactive interface to configure the story details. The interface unlocks sections sequentially:
   - **Age:** Select the target audience (3-5, 6-8, 9-12, 13-16 years, or Adult).
   - **Theme:** Choose a genre (Fantasy/Adventure, Fairy Tale, Mystery/Horror, Science/Universe, Animals, or Comedy).
   - **Story Type (Optional):** Fine-tune the narrative:
     - *Tone:* e.g., Calm and sweet, Epic and adventurous, Tense and grotesque.
     - *Ending:* e.g., Happy, With a moral, Open and mysterious.
     - *Structure:* Classic, Chapter-based, or Episodic.
     - *Duration:* Short (5 min), Medium (10-15 min), or Long (20+ min).
   - **Characters:** You must add **at least one character** (max 5). Define their Name, Description, and Role (Protagonist, Antagonist, Positive/Negative Helper, or Other).
   - **Generate:** Once ready, click the **Generate story** button.

3. **Generate Randomly**
   If you prefer a surprise, click the **Generate Randomly** button on the right side of the screen. The App will automatically select random options for age, theme, tone, and structure to create a unique story instantly.

4. **Interact**
   The story streams in real-time. Once complete, you can:
   - **Copy** the text to your clipboard.
   - Click **New story** to reset the interface and start over.

## How it Works

Once the App is running, it performs the following operations:

- **User Input Collection**: The `web_ui` Brick serves an HTML page where users select story attributes via interactive "chips" and forms.
- **Prompt Engineering**: When the user requests a story, the Python backend receives a JSON object containing all parameters. It dynamically constructs a natural language prompt optimized for the LLM (e.g., "As a parent... I need a story about [Theme]...").
- **AI Inference**: The `cloud_llm` Brick sends this prompt to the configured cloud provider using the API Key set in the Brick Configuration.
- **Stream Processing**: Instead of waiting for the full text, the backend receives the response in chunks (tokens) and forwards them immediately to the frontend via WebSockets, ensuring the user sees progress instantly.

## Understanding the Code

### 🔧 Backend (`main.py`)

The Python script handles the logic of connecting to the AI and managing the data flow. Note that the API Key is not hardcoded; it is retrieved automatically from the Brick configuration.

- **Initialization**: The `CloudLLM` is set up with a system prompt that enforces HTML formatting for the output. The `CloudModel` constants map to specific efficient model versions:
  *   `CloudModel.GOOGLE_GEMINI` → `gemini-2.5-flash`
  *   `CloudModel.OPENAI_GPT` → `gpt-4o-mini`
  *   `CloudModel.ANTHROPIC_CLAUDE` → `claude-3-7-sonnet-latest`

```python
# The API Key is loaded automatically from the Brick Configuration
llm = CloudLLM(
    model=CloudModel.GOOGLE_GEMINI,
    system_prompt="You are a bedtime story teller. Your response must be the story itself, formatted directly in HTML..."
)
llm.with_memory()
```

- **Prompt Construction**: The `generate_story` function translates the structured data from the UI into a descriptive text prompt for the AI.

```python
def generate_story(_, data):
    # Extract parameters
    age = data.get('age', 'any')
    theme = data.get('theme', 'any')
    
    # Build natural language prompt
    prompt_for_display = f"As a parent who loves to read bedtime stories to my <strong>{age}</strong> year old child..."
    
    # ... logic to append characters and settings ...

    # Stream response back to UI
    prompt_for_llm = re.sub('<[^>]*>', '', prompt_for_display) # Clean tags for LLM
    for resp in llm.chat_stream(prompt_for_llm):
        ui.send_message("response", resp)
        
    ui.send_message("stream_end", {})
```

### 🔧 Frontend (`app.js`)

The JavaScript manages the complex UI interactions, random generation logic, and WebSocket communication.

- **Random Generation**: If the user chooses "Generate Randomly", the frontend programmatically selects random chips from the available options and submits the request.

```javascript
document.getElementById('generate-randomly-button').addEventListener('click', () => {
    // Select random elements from the UI lists
    const ageChips = document.querySelectorAll('.parameter-container:nth-child(1) .chip');
    const randomAgeChip = getRandomElement(ageChips);
    // ... repeat for theme, tone, etc ...

    const storyData = {
        age: randomAgeChip ? randomAgeChip.textContent.trim() : 'any',
        // ...
        characters: [], // Random stories use generic characters
    };

    generateStory(storyData);
});
```

- **Socket Listeners**: The frontend listens for chunks of text and appends them to the display buffer, creating the streaming effect.

```javascript
socket.on('response', (data) => {
    document.getElementById('story-container').style.display = 'flex';
    storyBuffer += data; // Accumulate text
});

socket.on('stream_end', () => {
    const storyResponse = document.getElementById('story-response');
    storyResponse.innerHTML = storyBuffer; // Final render
    document.getElementById('loading-spinner').style.display = 'none';
});
```
