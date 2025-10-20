// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>
#include "heart_frames.h"

// TODO: those will go into an header file.
extern "C" void matrixWrite(const uint32_t* buf);
extern "C" void matrixBegin();

bool awake = false;

void setup() {
  matrixBegin();
  playAnimation(HeartStatic, 1, 1, 2000);
  Bridge.begin();
  Bridge.provide("keyword_detected", wake_up); 
}

void loop() {
  if (awake) {
    playAnimation(HeartAnim, 8, 1, 50);
    delay(1000);
    playAnimation(HeartStatic, 1, 1, 2000);
    awake = false;
  }
}

void playAnimation(const uint32_t* frames[], int frameCount, int repeat, int frameDelay) {
  for (int r = 0; r < repeat; r++) {
    for (int i = 0; i < frameCount; i++) {
      matrixWrite(frames[i]);
      delay(frameDelay);
    }
  }
}

void wake_up() {
  awake = true;
}
