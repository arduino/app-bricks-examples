# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

import json, ast
from datetime import datetime, UTC
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI

# ---------- Pin config: add pins here ----------
# - "active_low": True if the hardware turns ON when the pin is LOW
PIN_CONFIG = {
    # JDIGITAL
    "D21": {"active_low": False},
    "D20": {"active_low": False},   
    "D13": {"active_low": False},
    "D12": {"active_low": False},
    "D11": {"active_low": False},
    "D10": {"active_low": False},
    "D9": {"active_low": False},
    "D8": {"active_low": False},
    "D7": {"active_low": False},
    "D6": {"active_low": False},
    "D5": {"active_low": False},
    "D4": {"active_low": False},
    "D3": {"active_low": False},
    "D2": {"active_low": False},
    "D1": {"active_low": False},
    "D0": {"active_low": False},
    # JANALOG
    "A0": {"active_low": False},
    "A1": {"active_low": False},
    "A2": {"active_low": False},
    "A3": {"active_low": False},
    "A4": {"active_low": False},
    "A5": {"active_low": False},
    # STM LEDS
    "LED3_R": {"active_low": True},
    "LED3_G": {"active_low": True},
    "LED3_B": {"active_low": True},
    "LED4_R": {"active_low": True},
    "LED4_G": {"active_low": True},
    "LED4_B": {"active_low": True},

}
PIN_NAMES = tuple(PIN_CONFIG.keys())

# Store *logical* states (True = ON as seen by the UI)
pin_states = {name: False for name in PIN_NAMES}

ui = WebUI()

def _iso_now() -> str:
    return datetime.now(UTC).isoformat()

def _normalize_state(value) -> bool:
    if isinstance(value, bool): return value
    if isinstance(value, (int, float)): return bool(int(value))
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("on","true","1"):  return True
        if v in ("off","false","0"): return False
    raise ValueError(f"Invalid state value: {value!r}")

def _ensure_dict(payload):
    if isinstance(payload, (list, tuple)) and len(payload) == 1:
        payload = payload[0]
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, (bytes, bytearray)):
        payload = payload.decode("utf-8", errors="strict")
    if isinstance(payload, str):
        s = payload.strip()
        try:
            return json.loads(s)
        except Exception:
            try:
                val = ast.literal_eval(s)
                if isinstance(val, (list, tuple)) and len(val) == 1 and isinstance(val[0], dict):
                    return val[0]
                if isinstance(val, dict):
                    return val
            except Exception:
                pass
        raise ValueError(f"Unsupported string payload: {s[:80]}...")
    raise ValueError(f"Unsupported payload type: {type(payload).__name__}")

def _state_for_hw(name: str, logical_state: bool) -> bool:
    """Return the boolean to send to the MCU, applying active-low if set."""
    cfg = PIN_CONFIG.get(name, {})
    return (not logical_state) if cfg.get("active_low") else logical_state

def on_pin_toggle(sid, message):
    try:
        data = _ensure_dict(message)
        name = data.get("name")
        if name not in PIN_NAMES:
            raise ValueError(f"Unknown Pin '{name}'")

        # Logical state from UI ("on"/"off", 1/0, true/false -> bool)
        logical = _normalize_state(data.get("state"))
        pin_states[name] = logical

        # Apply active-low for the MCU call
        state_for_hw = _state_for_hw(name, logical)

        Bridge.call("set_pin_by_name", name, state_for_hw)

        print(f"[{_iso_now()}] [{sid}] {name} -> logical={'ON' if logical else 'OFF'} hw={state_for_hw}")
        ui.send_message("pin_state_update", {
            "name": name,
            "state": logical,           # broadcast logical state to clients
            "timestamp": _iso_now()
        })

    except Exception as e:
        ui.send_message("error", f"Pin toggle error: {e}")

def on_get_states():
    # Return logical states to the UI
    return {"timestamp": _iso_now(), "states": pin_states}

ui.on_message("pin_toggle", on_pin_toggle)
ui.expose_api("GET", "/states", on_get_states)

App.run()
