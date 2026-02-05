// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

// Example sketch using Arduino_LED_Matrix and RouterBridge. This sketch
// exposes four providers:
//  - "draw" which accepts a std::vector<uint8_t> (by-value) and calls matrix.draw()
//  - "load_frame" which loads frame data into animation buffer
//  - "play_animation" which starts playback of loaded animation frames
//  - "stop_animation" which halts any running animation
#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include <vector>

Arduino_LED_Matrix matrix;

// Animation playback state (cooperative, interruptible by `stop_animation`)
static const int MAX_FRAMES = 300;
static uint32_t animation_buf[MAX_FRAMES][5]; // 4 words + duration
static int animation_frame_count = 0;
static volatile bool animation_running = false;
static volatile int animation_current_frame = 0;
static unsigned long animation_next_time = 0;

void setup() {
  matrix.begin();
  Serial.begin(115200);
  // configure grayscale bits to 3 so the display accepts 0..7 brightness
  // The backend will send quantized values in 0..(2^3-1) == 0..7.
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();
  Bridge.provide("draw", draw);
  Bridge.provide("load_frame", load_frame);
  Bridge.provide("play_animation", play_animation);
  Bridge.provide("stop_animation", stop_animation);
}

void loop() {
  // Keep loop fast and let animation_tick handle playback timing
  animation_tick();
}

void draw(std::vector<uint8_t> frame) {
  if (frame.empty()) {
    Serial.println("[sketch] draw called with empty frame");
    return;
  }
  Serial.print("[sketch] draw called, frame.size=");
  Serial.println((int)frame.size());
  matrix.draw(frame.data());
}

void load_frame(std::array<uint32_t,5> animation_bytes){
  Serial.print("[sketch] load_frame ");
  if (animation_bytes.empty()) {
    Serial.println("[sketch] load_frame called with empty data");
    return;
  }

  // Limit frames to MAX_FRAMES to avoid buffer overflow
  if (animation_frame_count >= MAX_FRAMES) {
    Serial.print("[sketch] Too many frames, truncating to ");
    Serial.println(MAX_FRAMES);
    animation_frame_count = MAX_FRAMES;
    return;
  }
  
  animation_buf[animation_frame_count][0] = animation_bytes[0];
  animation_buf[animation_frame_count][1] = animation_bytes[1];
  animation_buf[animation_frame_count][2] = animation_bytes[2];
  animation_buf[animation_frame_count][3] = animation_bytes[3];
  animation_buf[animation_frame_count][4] = animation_bytes[4];

  Serial.print(" time=");
  Serial.println(animation_bytes[4]);

  animation_frame_count++;
}

void play_animation() {
  animation_current_frame = 0;
  animation_running = true;
  animation_next_time = millis();
  Serial.print("[sketch] Animation queued, frames=");
  Serial.println(animation_frame_count);
}

// Provider to stop any running animation
void stop_animation() {
  if (!animation_running) {
    Serial.println("[sketch] stop_animation called but no animation running");
    return;
  }
  animation_running = false;
  animation_frame_count = 0;
  Serial.println("[sketch] stop_animation: animation halted");
}

// Cooperative animation tick executed from loop()
void animation_tick() {
  if (!animation_running || animation_frame_count == 0) return;

  unsigned long now = millis();
  if (now < animation_next_time) return;

  Serial.print("animation tick, frame num:");
  Serial.println(animation_current_frame);
  
  // Prepare frame words (reverse bits as the library expects)
  uint32_t frame[4];
  frame[0] = reverse(animation_buf[animation_current_frame][0]);
  frame[1] = reverse(animation_buf[animation_current_frame][1]);
  frame[2] = reverse(animation_buf[animation_current_frame][2]);
  frame[3] = reverse(animation_buf[animation_current_frame][3]);

  // Display frame
  matrixWrite(frame);

  // Schedule next frame
  uint32_t interval = animation_buf[animation_current_frame][4];
  if (interval == 0) interval = 1;
  animation_next_time = now + interval;

  animation_current_frame++;
  if (animation_current_frame >= animation_frame_count) {
      animation_running = false;
      animation_frame_count = 0;
      animation_current_frame = 0;
      Serial.println("[sketch] Animation finished");
  }
}
