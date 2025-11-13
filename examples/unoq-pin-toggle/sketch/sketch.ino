// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>

struct PinEntry { const char* name; uint8_t pin; };

static const PinEntry kPins[] = {
  {"D21", D21}, {"D20", D20}, {"D13", D13}, {"D12", D12},
  {"D11", D11}, {"D10", D10}, {"D9",  D9 }, {"D8",  D8 },
  {"D7",  D7 }, {"D6",  D6 }, {"D5",  D5 }, {"D4",  D4 },
  {"D3",  D3 }, {"D2",  D2 }, {"D1",  D1 }, {"D0",  D0 },
  {"A0",  A0 }, {"A1",  A1 }, {"A2",  A2 }, {"A3",  A3 },
  {"A4",  A4 }, {"A5",  A5 },
  {"LED3_R", LED_BUILTIN}, {"LED3_G", LED_BUILTIN + 1}, {"LED3_B", LED_BUILTIN + 2},
  {"LED4_R", LED_BUILTIN + 3}, {"LED4_G", LED_BUILTIN + 4}, {"LED4_B", LED_BUILTIN + 5},
};

static inline int findIndex(const char* n) {
  for (size_t i = 0; i < sizeof(kPins)/sizeof(kPins[0]); ++i) {
    if (strcmp(kPins[i].name, n) == 0) return (int)i;
  }
  return -1;
}

// Generic setter: name + bool
void set_pin_by_name(String name, bool s) {
  int idx = findIndex(name.c_str());
  if (idx < 0) return;              // unknown name
  digitalWrite(kPins[idx].pin, s ? HIGH : LOW);   // Python already applied active_low
}


void setup()
{
    for (auto &e : kPins) pinMode(e.pin, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(LED_BUILTIN + 1, HIGH);
    digitalWrite(LED_BUILTIN + 2, HIGH);
    digitalWrite(LED_BUILTIN + 3, HIGH);
    digitalWrite(LED_BUILTIN + 4, HIGH);
    digitalWrite(LED_BUILTIN + 5, HIGH);

    Bridge.begin();
    
    Bridge.provide("set_pin_by_name", set_pin_by_name);
}

void loop() {}
