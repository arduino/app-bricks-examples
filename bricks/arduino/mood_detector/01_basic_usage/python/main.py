# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App
from arduino.app_bricks.mood_detector import MoodDetector


def main():
    # Initialize the Mood Detector
    detector = MoodDetector()

    # Example texts with different moods
    texts = [
        "I am so happy today! Everything is going great!",
        "This is really frustrating and disappointing.",
        "The weather is nice.",
        "I love spending time with my family. It brings me so much joy!",
        "I'm feeling anxious about the upcoming presentation.",
    ]

    # Analyze each text
    for i, text in enumerate(texts, 1):
        print(f"\nText {i}: {text}")

        # Detect mood
        result = detector.get_sentiment(text)

        print(f"Detected Mood: {result}")


if __name__ == "__main__":
    main()

App.run()
