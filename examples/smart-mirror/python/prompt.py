from pathlib import Path
import yaml
import random


PROMPT_PATH = Path(__file__).with_name("prompt.yaml")
MESSAGE_OPENERS = [
    "Looks like you've got on",
    "You're wearing",
    "Today you've got",
    "You're rocking",
    "I see you've chosen",
    "Your outfit includes",
]
TIP_STARTERS = [
    "Try",
    "Next time",
    "To level it up",
    "For a cleaner look",
    "Maybe try",
    "Why not",
]


def load_prompts() -> tuple[str, str]:
    with PROMPT_PATH.open("r", encoding="utf-8") as prompt_file:
        prompt_data = yaml.safe_load(prompt_file) or {}

    system_prompt = (prompt_data.get("system") or "").strip()
    user_prompt_template = (prompt_data.get("user") or "").strip()

    if not system_prompt:
        raise ValueError(f"Missing 'system' prompt in {PROMPT_PATH}")
    if not user_prompt_template:
        raise ValueError(f"Missing 'user' prompt in {PROMPT_PATH}")

    return system_prompt, user_prompt_template


def build_user_prompt(user_prompt_template: str) -> str:
    return user_prompt_template.format(
        opener=random.choice(MESSAGE_OPENERS),
        tip_starter=random.choice(TIP_STARTERS),
    )