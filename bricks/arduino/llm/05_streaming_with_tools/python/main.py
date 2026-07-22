# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.llm import LargeLanguageModel, tool
from arduino.app_utils import App


# Tool definition - simulates a simple weather API - please replace with actual API calls in a real application
@tool
def get_current_weather(location: str) -> str:
    """
    Get the current weather in a given location.
    The output is a string with a summary of the weather.

    Args:
        location (str): The location to get the weather for.

    Returns:
        str: A summary of the current weather in the specified location.

    """
    if "boston" in location.lower():
        return "The current weather in Boston is 15°C and partly cloudy."
    elif "paris" in location.lower():
        return "The current weather in Paris is 8°C and rainy."
    elif "turin" in location.lower():
        return "The current weather in Turin is 8°C and rainy."
    else:
        return f"Sorry, I do not have real-time weather data for {location}. Assuming it's a sunny day!"


llm = LargeLanguageModel(max_tokens=512, tools=[get_current_weather])


def ask_prompt():
    prompt = "What is the weather like in Turin?"
    for chunk in llm.chat_stream(prompt):
        print(chunk, end="", flush=True)
    print()
    raise StopIteration  # This stops the user loop


App.run(user_loop=ask_prompt)
