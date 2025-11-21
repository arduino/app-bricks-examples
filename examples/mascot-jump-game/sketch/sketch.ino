// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include "game_frames.h"

Arduino_LED_Matrix matrix;

// Animation state tracking
int animationFrame = 0;
unsigned long lastFrameTime = 0;
const unsigned long ANIMATION_DELAY = 200; // milliseconds between frames

void setup() {
    matrix.begin();
    matrix.setGrayscaleBits(3); // Use 3-bit grayscale (0-7 levels)
    Bridge.begin();
}

void loop() {
    String gameState;
    bool ok = Bridge.call("get_led_state").result(gameState);
    
    if (ok) {
        if (gameState == "running") {
            // Animate between four running frames for leg movement
            unsigned long currentTime = millis();
            if (currentTime - lastFrameTime > ANIMATION_DELAY) {
                animationFrame = (animationFrame + 1) % 4;
                lastFrameTime = currentTime;
            }
            
            switch(animationFrame) {
                case 0:
                    matrix.draw(running_frame1);
                    break;
                case 1:
                    matrix.draw(running_frame2);
                    break;
                case 2:
                    matrix.draw(running_frame3);
                    break;
                case 3:
                    matrix.draw(running_frame4);
                    break;
            }
            
        } else if (gameState == "jumping") {
            // Show jumping frame when mascot is in the air
            matrix.draw(jumping);
            animationFrame = 0; // Reset animation frame
            
        } else if (gameState == "game_over") {
            // Show game over pattern
            matrix.draw(game_over);
            animationFrame = 0;
            
        } else if (gameState == "idle") {
            // Show idle frame when game has not started
            matrix.draw(idle);
            animationFrame = 0;
            
        } else {
            // Default to idle if state is unknown
            matrix.draw(idle);
        }
    } else {
        // If communication fails, show idle
        matrix.draw(idle);
    }
    
    delay(50); // Update LED matrix at around 20 FPS
}