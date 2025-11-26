# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import re
from arduino.app_bricks.cloud_llm import CloudLLM, CloudModel
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App


llm = CloudLLM(
    model=CloudModel.GOOGLE_GEMINI,
    system_prompt="You are a bedtime story teller. Your response must be the story itself, formatted directly in HTML. Do not wrap your response in markdown code blocks or any other formatting. Use heading tags like <h1>, <h2> for titles and subtitles. Use <strong> or <b> for bold text. Include relevant emojis. If the story is chapter-based, use heading tags for chapter titles.",
)
llm.with_memory()

ui = WebUI()


def generate_story(_, data):
    try:
        age = data.get('age', 'any')
        theme = data.get('theme', 'any')
        tone = data.get('tone', 'any')
        ending_type = data.get('endingType', 'any')
        narrative_structure = data.get('narrativeStructure', 'any')
        duration = data.get('duration', 'any')
        characters = data.get('characters', [])
        other = data.get('other', '')

        # Create a prompt with HTML for display
        prompt_for_display = f"As a parent who loves to read bedtime stories to my <strong>{age}</strong> year old child, I need a delightful and age-appropriate story."

        if characters:
            prompt_for_display += " Characters of the story: "
            char_prompts = []
            for i, char in enumerate(characters):
                ch = f"Character {i+1} (<strong>{char.get('name')}</strong>, <strong>{char.get('role')}</strong>"
                ch += f", <strong>{char.get('description')}</strong>)" if char.get('description') else ")"
                char_prompts.append(ch)
            prompt_for_display += ", ".join(char_prompts)
            prompt_for_display += "."

        prompt_for_display += f" The story type is <strong>{theme}</strong>. The tone should be <strong>{tone}</strong>. The format should be a narrative-style story with a clear beginning, middle, and end, allowing for a smooth and engaging reading experience. The objective is to entertain and soothe the child before bedtime. Provide a brief introduction to set the scene and introduce the main character. The scope should revolve around the topic: managing emotions and conflicts. The length should be approximately <strong>{duration}</strong>. Please ensure the story has a <strong>{narrative_structure}</strong> narrative structure, leaving the child with a sense of <strong>{ending_type}</strong>. The language should be easy to understand and suitable for my child's age comprehension."
        if other:
            prompt_for_display += f"\n\nOther on optional stuff for the story: <strong>{other}</strong>"

        # Create a plain text prompt for the LLM by stripping HTML tags
        prompt_for_llm = re.sub('<[^>]*>', '', prompt_for_display)

        # Send the display prompt to the UI
        ui.send_message("prompt", prompt_for_display)

        # Use the plain text prompt for the LLM and stream the response
        for resp in llm.chat_stream(prompt_for_llm):
            ui.send_message("response", resp)

        # Signal the end of the stream
        ui.send_message("stream_end", {})
    except Exception as e:
        ui.send_message("story_error", {"error": str(e)})

ui.on_message("generate_story", generate_story)

App.run()
