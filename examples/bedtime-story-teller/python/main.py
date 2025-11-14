# SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
#
# SPDX-License-Identifier: MPL-2.0

import os
from arduino.app_bricks.cloud_llm import CloudLLM, CloudModel
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App


llm = CloudLLM(
    api_key=os.getenv("API_KEY"), # Make sure to set your API key in the environment variable
    model=CloudModel.GOOGLE_GEMINI,
    system_prompt="You are a bedtime story teller. Tell short, funny and relaxing stories that are suitable for children. Use a simple language and avoid long sentences.",
)
llm.with_memory()

ui = WebUI()

def find_character_by_role(characters, role):
    for char in characters:
        if char['role'] == role:
            return char
    return None

def generate_story(_, data):
    age = data.get('age', 'any')
    theme = data.get('theme', 'any')
    tone = data.get('tone', 'any')
    ending_type = data.get('endingType', 'any')
    narrative_structure = data.get('narrativeStructure', 'any')
    duration = data.get('duration', 'any')
    characters = data.get('characters', [])
    other = data.get('other', '')

    protagonist = find_character_by_role(characters, 'protagonist')
    helper = find_character_by_role(characters, 'positive-helper')
    antagonist = find_character_by_role(characters, 'antagonist')

    prompt = f"As a parent who loves to read bedtime stories to my {age} year old child, I need a delightful and age-appropriate story."
    if protagonist:
        prompt += f" about an {protagonist['description']}, {protagonist['name']}"
    else:
        prompt += " about a character"

    if helper:
        prompt += f" accompanied by his {helper['description']} helper {helper['name']}"
    else:
        prompt += " accompanied by a friend"
    
    if antagonist:
        prompt += f" who will have to face the {antagonist['description']} antagonist {antagonist['name']}"
    else:
        prompt += " who will have to face a villain"

    prompt += f". The story type is {theme}. The tone should be {tone}. The format should be a narrative-style story with a clear beginning, middle, and end, allowing for a smooth and engaging reading experience. The objective is to entertain and soothe the child before bedtime. Provide a brief introduction to set the scene and introduce the main character. The scope should revolve around the topic: managing emotions and conflicts. The length should be approximately {duration}. Please ensure the story has a {narrative_structure} narrative structure, leaving the child with a sense of {ending_type}. The language should be easy to understand and suitable for my child's age comprehension."
    if other:
        prompt += f"\n\nOther on optional stuff for the story: {other}"

    for resp in llm.chat_stream(prompt):
        ui.send_message("response", resp)

ui.on_message("generate_story", generate_story)

App.run()
