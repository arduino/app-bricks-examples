// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// Example sketch that drives two LED matrices through the RouterBridge: the 13x8 matrix
// built into the board (Arduino_LED_Matrix) and a 12x8 Modulino LED Matrix connected to the
// Qwiic connector (Arduino_Modulino). The Python side selects one of them and calls:
//  - "draw"                 — shows a frame on the board matrix
//  - "modulino_draw"        — shows a frame on the Modulino LED Matrix
//  - "load_frames"          — appends a chunk of board matrix frames to the animation buffer
//  - "modulino_load_frames" — appends a chunk of Modulino frames to the animation buffer
//  - "play_animation"       — starts sequential playback of the buffered frames
//  - "stop_animation"       — halts any running animation and empties the buffer

// Modulino_LED_Matrix.h goes first: Arduino_LED_Matrix.h defines macros (e.g. endTextAnimation)
// with the names of methods of the Modulino class, which must be declared before them.
#include <Modulino_LED_Matrix.h>
#include <Arduino_LED_Matrix.h>
#include <Arduino_RouterBridge.h>
#include <vector>
#include <zephyr/kernel.h>

Arduino_LED_Matrix matrix;

// Grayscale mode: 16 brightness levels, a frame is 48 bytes with 4 bits per LED.
ModulinoLEDMatrix modulino(DEFAULT_ADDRESS, DEFAULT_WIRE, DisplayMode::Grayscale);
static bool modulino_begun = false;

// Bridge providers run on a separate thread from loop().
// This mutex protects shared animation state and serializes the writes to the matrices.
K_MUTEX_DEFINE(anim_mtx);

// Animation playback state. The buffer is shared by the two matrices, since only one animation
// plays at a time: it holds either board matrix frames or Modulino frames, each with its duration.
static const int MAX_FRAMES = 300;
static const size_t DURATION_BYTES = sizeof(uint32_t);
static const size_t BOARD_FRAME_BYTES = 4 * sizeof(uint32_t);  // 4 words of pixels
static const size_t MODULINO_FRAME_BYTES = GRAYSCALE_FRAME_SIZE;  // 48 bytes of pixels
static uint8_t animation_buf[MAX_FRAMES * (MODULINO_FRAME_BYTES + DURATION_BYTES)];
static bool animation_on_modulino = false;
static int animation_frame_count = 0;
static bool animation_running = false;
static int animation_current_frame = 0;
static unsigned long animation_next_time = 0;

void setup() {
  matrix.begin();
  // Configure grayscale bits to 3 so the display accepts 0..7 brightness.
  // The backend sends quantized values in 0..(2^3-1) == 0..7.
  matrix.setGrayscaleBits(3);
  matrix.clear();

  // The Modulino is optional and can be plugged in later: it is set up at its first use.
  DEFAULT_WIRE.begin();

  Bridge.begin();
  Bridge.provide("draw", draw);
  Bridge.provide("modulino_draw", modulino_draw);
  Bridge.provide("load_frames", load_frames);
  Bridge.provide("modulino_load_frames", modulino_load_frames);
  Bridge.provide("play_animation", play_animation);
  Bridge.provide("stop_animation", stop_animation);
}

void loop() {
  // Keep loop fast and let animation_tick handle playback timing
  animation_tick();
}

// --- Modulino LED Matrix -----------------------------------------------------

// Tells whether the Modulino answers on the I2C bus, and makes sure it is in grayscale mode.
// The module reports its mode when read: one that was plugged in again starts in monochrome
// mode and is switched back. Call it with anim_mtx held, before every write to the module.
bool modulino_connected() {
  uint8_t id[MODE_IDENTIFIER_SIZE + 1];  // the address of the module, then its mode
  if (DEFAULT_WIRE.requestFrom(DEFAULT_ADDRESS, sizeof(id)) != sizeof(id)) {
    return false;
  }
  for (size_t i = 0; i < sizeof(id); i++) {
    id[i] = DEFAULT_WIRE.read();
  }

  if (!modulino_begun) {
    // begin() selects the mode given to the constructor
    modulino_begun = modulino.begin();
    return modulino_begun;
  }
  if (memcmp(id + 1, GRAYSCALE_IDENTIFIER, MODE_IDENTIFIER_SIZE) != 0) {
    modulino.setMode(DisplayMode::Grayscale);
  }
  return true;
}

// Appends frames to the animation buffer. Each entry is the pixels of a frame followed by its
// duration in ms; switching matrix empties the buffer. Call it with anim_mtx held.
int buffer_frames(bool on_modulino, size_t frame_bytes, const std::vector<uint8_t> &data) {
  const size_t entry_bytes = frame_bytes + DURATION_BYTES;

  if (animation_on_modulino != on_modulino) {
    animation_on_modulino = on_modulino;
    animation_running = false;
    animation_frame_count = 0;
  }
  for (size_t offset = 0; offset + entry_bytes <= data.size() && animation_frame_count < MAX_FRAMES; offset += entry_bytes) {
    memcpy(animation_buf + animation_frame_count * entry_bytes, data.data() + offset, entry_bytes);
    animation_frame_count++;
  }
  return animation_frame_count;
}

// --- Bridge providers --------------------------------------------------------

void draw(std::vector<uint8_t> frame) {
  if (frame.empty()) return;

  k_mutex_lock(&anim_mtx, K_FOREVER);
  matrix.draw(frame.data());
  k_mutex_unlock(&anim_mtx);
}

// The frame is 48 bytes, 4 bits per LED. Returns false when the Modulino is not connected.
bool modulino_draw(std::vector<uint8_t> frame) {
  if (frame.size() != MODULINO_FRAME_BYTES) return false;

  uint8_t pixels[MODULINO_FRAME_BYTES];
  memcpy(pixels, frame.data(), sizeof(pixels));

  k_mutex_lock(&anim_mtx, K_FOREVER);
  bool connected = modulino_connected();
  if (connected) {
    modulino.setFrame(pixels);
  }
  k_mutex_unlock(&anim_mtx);
  return connected;
}

// Each frame is 5 little-endian uint32: 4 words of pixels and the duration in ms.
// Returns how many frames are buffered, so the caller knows they all arrived.
int load_frames(std::vector<uint8_t> data) {
  k_mutex_lock(&anim_mtx, K_FOREVER);
  int count = buffer_frames(false, BOARD_FRAME_BYTES, data);
  k_mutex_unlock(&anim_mtx);
  return count;
}

// Each frame is 48 bytes of pixels and the duration in ms as a little-endian uint32.
// Returns how many frames are buffered, or -1 when the Modulino is not connected.
int modulino_load_frames(std::vector<uint8_t> data) {
  k_mutex_lock(&anim_mtx, K_FOREVER);
  int count = modulino_connected() ? buffer_frames(true, MODULINO_FRAME_BYTES, data) : -1;
  k_mutex_unlock(&anim_mtx);
  return count;
}

void play_animation() {
  k_mutex_lock(&anim_mtx, K_FOREVER);
  animation_current_frame = 0;
  animation_running = true;
  animation_next_time = millis();
  k_mutex_unlock(&anim_mtx);
}

void stop_animation() {
  k_mutex_lock(&anim_mtx, K_FOREVER);
  animation_running = false;
  animation_frame_count = 0;
  animation_current_frame = 0;
  k_mutex_unlock(&anim_mtx);
}

// --- Animation engine --------------------------------------------------------

void animation_tick() {
  k_mutex_lock(&anim_mtx, K_FOREVER);

  if (!animation_running || animation_frame_count == 0) {
    k_mutex_unlock(&anim_mtx);
    return;
  }

  unsigned long now = millis();
  if (now < animation_next_time) {
    k_mutex_unlock(&anim_mtx);
    return;
  }

  const size_t frame_bytes = animation_on_modulino ? MODULINO_FRAME_BYTES : BOARD_FRAME_BYTES;
  const uint8_t *entry = animation_buf + animation_current_frame * (frame_bytes + DURATION_BYTES);

  // Schedule next frame
  uint32_t interval;
  memcpy(&interval, entry + frame_bytes, DURATION_BYTES);
  if (interval == 0) interval = 1;
  animation_next_time = now + interval;

  animation_current_frame++;
  if (animation_current_frame >= animation_frame_count) {
    animation_running = false;
    animation_frame_count = 0;
    animation_current_frame = 0;
  }

  // Display frame while still under lock to prevent draw() interference
  if (animation_on_modulino) {
    uint8_t pixels[MODULINO_FRAME_BYTES];
    memcpy(pixels, entry, sizeof(pixels));
    // A frame is skipped while the Modulino is unplugged, the animation keeps its timing
    if (modulino_connected()) {
      modulino.setFrame(pixels);
    }
  } else {
    // Prepare frame words (reverse bits as the library expects)
    uint32_t words[4];
    memcpy(words, entry, sizeof(words));
    for (int i = 0; i < 4; i++) {
      words[i] = reverse(words[i]);
    }
    matrixWrite(words);
  }

  k_mutex_unlock(&anim_mtx);
}
