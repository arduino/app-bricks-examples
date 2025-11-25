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
  
  // Static buffer to avoid dynamic allocation
  static uint32_t animation[MAX_FRAMES][5];
  
  // Convert bytes to uint32_t array
  const uint8_t* data = animation_bytes.data();
  for (int i = 0; i < frame_count; i++) {
    for (int j = 0; j < 5; j++) {
      int byte_offset = (i * 5 + j) * 4;
      // Reconstruct uint32_t from 4 bytes (little-endian)
      animation[i][j] = ((uint32_t)data[byte_offset]) |
                        ((uint32_t)data[byte_offset + 1] << 8) |
                        ((uint32_t)data[byte_offset + 2] << 16) |
                        ((uint32_t)data[byte_offset + 3] << 24);
    }
  }
  
  // Load and play the sequence using the Arduino_LED_Matrix library
  matrix.loadWrapper(animation, frame_count * 5 * sizeof(uint32_t));
  matrix.playSequence(false); // Don't loop by default
  
  Serial.println("[sketch] Animation playback complete");
}

void setup() {
  matrix.begin();
  Serial.begin(115200);
  // configure grayscale bits to 8 so the display can accept 0..255 brightness
  // The MCU expects full-byte brightness values from the backend.
  matrix.setGrayscaleBits(8);
  matrix.clear();

  Bridge.begin();

  // Register the draw provider (by-value parameter). Using by-value avoids
  // RPC wrapper template issues with const reference params.
  Bridge.provide("draw", draw);
  
  // Register the animation player provider
  Bridge.provide("play_animation", play_animation);
}

void loop() {
  delay(200);
}
