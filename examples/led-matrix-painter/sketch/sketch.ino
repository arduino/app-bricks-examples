// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

// Example sketch using Arduino_LED_Matrix and RouterBridge. This sketch
// exposes two providers:
//  - "draw" which accepts a std::vector<uint8_t> (by-value) and calls matrix.draw()
//  - "play_animation" which accepts a byte array representing multiple frames
#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include <vector>

Arduino_LED_Matrix matrix;

// Animation playback state (cooperative, interruptible by `stop_animation`)
static const int MAX_FRAMES = 50;
static uint32_t animation_buf[MAX_FRAMES][5]; // 4 words + duration
static int animation_frame_count = 0;
static volatile bool animation_running = false;
static volatile bool animation_loop = false;
static volatile int animation_current_frame = 0;
static unsigned long animation_next_time = 0;

void draw(std::vector<uint8_t> frame) {
  if (frame.empty()) {
    Serial.println("[sketch] draw called with empty frame");
    return;
  }
  Serial.print("[sketch] draw called, frame.size=");
  Serial.println((int)frame.size());
  matrix.draw(frame.data());
}

// Play animation using std::vector<uint8_t> to avoid C++ exception linking issues
// The data is sent as bytes from Python: each uint32_t is sent as 4 bytes (little-endian)
void play_animation(std::vector<uint8_t> animation_bytes) {
  if (animation_bytes.empty()) {
    Serial.println("[sketch] play_animation called with empty data");
    return;
  }
  
  // Each uint32_t is 4 bytes, each frame is 5 uint32_t (20 bytes)
  const int BYTES_PER_FRAME = 20;
  int frame_count = animation_bytes.size() / BYTES_PER_FRAME;
  
  Serial.print("[sketch] play_animation called, bytes=");
  Serial.print((int)animation_bytes.size());
  Serial.print(", frame_count=");
  Serial.println(frame_count);
  
  if (frame_count == 0) {
    Serial.println("[sketch] Invalid animation data: not enough bytes");
    return;
  }
  
  // Maximum 50 frames to avoid stack overflow
  const int MAX_FRAMES = 50;
  if (frame_count > MAX_FRAMES) {
    Serial.print("[sketch] Too many frames, truncating to ");
    Serial.println(MAX_FRAMES);
    frame_count = MAX_FRAMES;
  }
  
  // Parse bytes into the global animation buffer for cooperative playback
  const uint8_t* data = animation_bytes.data();
  int limit = min(frame_count, MAX_FRAMES);
  for (int i = 0; i < limit; i++) {
    for (int j = 0; j < 5; j++) {
      int byte_offset = (i * 5 + j) * 4;
      animation_buf[i][j] = ((uint32_t)data[byte_offset]) |
                            ((uint32_t)data[byte_offset + 1] << 8) |
                            ((uint32_t)data[byte_offset + 2] << 16) |
                            ((uint32_t)data[byte_offset + 3] << 24);
    }
  }
  animation_frame_count = limit;
  animation_current_frame = 0;
  animation_loop = false; // preserve existing behaviour (no loop)
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
  Serial.println("[sketch] stop_animation: animation halted");
}

// Cooperative animation tick executed from loop()
void animation_tick() {
  if (!animation_running || animation_frame_count == 0) return;

  unsigned long now = millis();
  if (now < animation_next_time) return;

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
    if (animation_loop) {
      animation_current_frame = 0;
    } else {
      animation_running = false;
      Serial.println("[sketch] Animation finished");
    }
  }
}

void setup() {
  matrix.begin();
  Serial.begin(115200);
  // configure grayscale bits to 3 so the display accepts 0..7 brightness
  // The backend will send quantized values in 0..(2^3-1) == 0..7.
  matrix.setGrayscaleBits(3);
  matrix.clear();

  Bridge.begin();

  // Register the draw provider (by-value parameter). Using by-value avoids
  // RPC wrapper template issues with const reference params.
  Bridge.provide("draw", draw);
  
  // Register the animation player provider
  Bridge.provide("play_animation", play_animation);
  // Provider to stop a running animation (invoked by backend)
  Bridge.provide("stop_animation", stop_animation);
}

void loop() {
  // Keep loop fast and let animation_tick handle playback timing
  animation_tick();
  delay(10);
}
