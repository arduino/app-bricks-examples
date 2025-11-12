# Mascot Jump Game

An endless runner game inspired by the classic browser dinosaur game, where you control an LED character jumping over electronic components. Features progressively increasing difficulty, score tracking, one-button gameplay, and synchronized LED matrix animations on the UNO Q.

![Mascot Jump Game Example](assets/docs_assets/thumbnail.png)

## Description

The App uses the `web_ui` Brick to create a browser-based game with real-time communication between the UNO Q and a web interface. The backend manages game physics, collision detection, and scoring at 60 FPS, while the frontend renders the LED character using PNG images for different animations.

![Mascot Jump Game - LED Character](assets/docs_assets/led_character_animation.png)

Key features include:

- LED character with six animation states (4 running patterns, jump, game over)
- Electronic component obstacles: resistors, transistors, and microchips
- Synchronized LED matrix display mirroring game state
- Progressive difficulty scaling with score
- Keyboard and mouse control
- Session high score tracking

## Bricks Used

The mascot jump game example uses the following Bricks:

- `web_ui`: Brick to create a web interface with real-time communication between the browser and Arduino board with game state updates, input handling, and rendering synchronization.

## Hardware and Software Requirements

### Hardware

- Arduino UNO Q (x1)
- USB-C® cable (for power and programming) (x1)

### Software

- Arduino App Lab

**Note:** You can also run this example using your Arduino UNO Q as a Single Board Computer (SBC) using a [USB-C hub](https://store.arduino.cc/products/usb-c-to-hdmi-multiport-adapter-with-ethernet-and-usb-hub) with a mouse, keyboard and display attached.

## How to Use the Example

1. **Run the App**
   
![Arduino App Lab - Run App](assets/docs_assets/launch-app.png)

2. **Access the Web Interface**
   
The App should open automatically in the web browser. You can also open it manually via `<board-name>.local:7000`. The `WebUI` brick establishes a WebSocket connection for real-time communication between browser and UNO Q.

3. **Wait for Game Initialization**

The game loads and displays the LED character in idle state. The `GameState` class initializes with default parameters, while the Arduino sketch begins polling game state through `Bridge.call("get_led_state").result(gameState)`.

4. **Start Playing**
   
Press **SPACE** or **UP ARROW** to jump over obstacles. The keypress triggers a `player_action` WebSocket message to the backend, which validates and applies the jump physics. Use **R** to restart after game over.

![Gameplay Example](assets/docs_assets/game_play_state.gif)

5. **Avoid Obstacles**
   
Jump over three types of electronic components: *resistors* (small), *transistors* (medium), and *microchips* (large). The backend's `spawn_obstacle()` creates new obstacles at random intervals, while the game loop moves them across the screen. Your score increases continuously based on survival time.

6. **Game Over**
   
When you hit an obstacle, `check_collisions()` detects the hit and triggers game over. Your final score and session high score are displayed. The LED character shows a fallen animation. Press **SPACE** to call `game.reset()` and restart.

![Game Over Screen](assets/docs_assets/game_over_state.gif)

7. **LED Matrix Synchronization**

The LED matrix on your UNO Q mirrors the game state. The Arduino sketch calls `Bridge.call("get_led_state").result(gameState)` every 50 ms to get the current state (*running*, *jumping*, *game_over*, or *idle*), then displays the matching LED frame from `game_frames.h`. For more information about the LED matrix, see the [LED Matrix setion from the UNO Q user manual](https://docs.arduino.cc/tutorials/uno-q/user-manual/#led-matrix).

![LED Matrix Frames](assets/docs_assets/led_matrix_frames.png)

8. **Progressive Difficulty**
   
The game speed increases as your score grows using `BASE_SPEED + (score / 1500.0)`. The `game_loop()` runs at 60 FPS, updating physics, moving obstacles, checking collisions, and broadcasting state to all connected clients.

## How it Works

Once the App is running, it performs the following operations:

- **Managing game state and physics calculations on the backend.**

The backend maintains the complete game state and physics engine:

```python
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
import time
import random
import threading
import json
...
class GameState:
   def __init__(self):
      self.reset()
      self.high_score = 0
      
   def reset(self):
      self.mascot_y = GROUND_Y - MASCOT_HEIGHT
      self.velocity_y = 0.0
      self.on_ground = True
      self.obstacles = []
      self.score = 0
      self.game_over = False
      self.speed = BASE_SPEED
      self.last_spawn_time = time.time()
      self.next_spawn_delay = random.uniform(SPAWN_MIN_MS/1000, SPAWN_MAX_MS/1000)
      
   def update_physics(self, dt):
      if not self.on_ground:
         self.velocity_y += GRAVITY * dt * 60  # Scale for 60 FPS base
         self.mascot_y += self.velocity_y * dt * 60
         
         # Ground collision
         if self.mascot_y >= GROUND_Y - MASCOT_HEIGHT:
               self.mascot_y = GROUND_Y - MASCOT_HEIGHT
               self.velocity_y = 0.0
               self.on_ground = True
...
game = GameState()
```

The physics engine calculates gravity effects, jump trajectories, and collision boundaries at a fixed timestep for consistent gameplay.

- **Providing LED matrix state through Bridge communication.**

The LED Matrix on the UNO Q displays the game state in real-time with a simplified mascot design:

```python
def get_led_state():
   global game_started
   
   if game.game_over:
      return "game_over"
   elif not game_started and game.score == 0:
      return "idle"
   elif not game.on_ground:
      return "jumping"
   else:
      return "running"

...
# Provide function to Arduino sketch
Bridge.provide("get_led_state", get_led_state)
```

The LED matrix shows different animations:

- **Running State:** 4-frame animation cycling through leg positions
- **Jumping State:** Mascot in mid-air with arms spread
- **Idle State:** Standing mascot waiting to start
- **Game Over State:** Fallen mascot rotated 45 degrees with extended arms

The Arduino sketch processes these states using the `Arduino_LED_Matrix` library:

```cpp
#include <Arduino_RouterBridge.h>
#include <Arduino_LED_Matrix.h>
#include "game_frames.h"

Arduino_LED_Matrix matrix;

int animationFrame = 0;
unsigned long lastFrameTime = 0;
const unsigned long ANIMATION_DELAY = 200;

void setup() {
   matrix.begin();
   matrix.setGrayscaleBits(3); // 3-bit grayscale (0-7 brightness levels)
   Bridge.begin();
}

void loop() {
   String gameState;
   bool ok = Bridge.call("get_led_state").result(gameState);
   
   if (ok) {
      if (gameState == "running") {
         // Animate between four running frames
         unsigned long currentTime = millis();
         if (currentTime - lastFrameTime > ANIMATION_DELAY) {
               animationFrame = (animationFrame + 1) % 4;
               lastFrameTime = currentTime;
         }
         
         switch(animationFrame) {
               case 0: matrix.draw(running_frame1); break;
               case 1: matrix.draw(running_frame2); break;
               case 2: matrix.draw(running_frame3); break;
               case 3: matrix.draw(running_frame4); break;
         }
      } else if (gameState == "jumping") {
         matrix.draw(jumping);
         animationFrame = 0;
      } else if (gameState == "game_over") {
         matrix.draw(game_over);
         animationFrame = 0;
      } else if (gameState == "idle") {
         matrix.draw(idle);
         animationFrame = 0;
      } else {
         matrix.draw(idle);
      }
   } else {
      matrix.draw(idle);
   }
   
   delay(50); // Update at ~20 FPS
}
```

- **Processing user input through WebSocket events.**

Input handling uses event-based communication:

```python
def on_player_action(client_id, data):
   global game_started
   action = data.get('action')
   
   if action == 'jump':
      game_started = True 
      if game.jump():
         ui.send_message('jump_confirmed', {'success': True})
   elif action == 'restart':
      game.reset()
      game_started = True  # Game restarts
      ui.send_message('game_reset', {'state': game.to_dict()})

ui = WebUI()
...
ui.on_message('player_action', on_player_action)
```

The backend validates inputs to prevent invalid actions, such as jumping while airborne or during the game-over state.

- **Running the main game loop with fixed timestep updates.**

The game loop runs at 60 FPS intervals:

```python
def game_loop():
   global game_running, game_started
   last_update = time.time()
   
   while game_running:
      current_time = time.time()
      dt = current_time - last_update
      
      if not game.game_over:
         game.update_physics(dt)
         game.update_obstacles(dt)
         game.check_collisions()
         game.score += int(60 * dt)
         game.speed = BASE_SPEED + (game.score / 1500.0)
      
      ui.send_message('game_update', game.to_dict())
      
      last_update = current_time
      sleep_time = max(0, (1/FPS) - (time.time() - current_time))
      time.sleep(sleep_time)
```

- **Handling obstacle generation and collision detection.**

The system manages three types of electronic component obstacles:

```python
OBSTACLE_TYPES = [
   {'name': 'resistor', 'height': 28},    # Small
   {'name': 'transistor', 'height': 38},  # Medium
   {'name': 'microchip', 'height': 48}    # Large
]

def spawn_obstacle(self):
   obstacle_type = random.choice(OBSTACLE_TYPES)
   height = obstacle_type['height']
   
   obstacle = {
      'x': GAME_WIDTH + 30,
      'y': GROUND_Y - height,
      'width': OBSTACLE_WIDTH,
      'height': height,
      'type': obstacle_type['name']
   }
   self.obstacles.append(obstacle)
```

- **Synchronizing game state with frontend rendering.**

The frontend maintains rendering with PNG images for the LED character:

```javascript
function loadLEDImages() {
   const imagesToLoad = [
   { key: 'move1', src: 'img/ledcharacter_move1.png' },
   { key: 'move2', src: 'img/ledcharacter_move2.png' },
   { key: 'move3', src: 'img/ledcharacter_move3.png' },
   { key: 'move4', src: 'img/ledcharacter_move4.png' },
   { key: 'jump', src: 'img/ledcharacter_jump.png' },
   { key: 'gameover', src: 'img/ledcharacter_gameover.png' }
   ];
 ...
}

// Cycle through movement patterns on each jump
socket.on('jump_confirmed', (data) => {
   if (data.success) {
       currentMovePattern = (currentMovePattern % 4) + 1;
   }
});

function drawMascot() {
   if (!gameConfig || !gameState || !imagesLoaded) return;
   
   const x = gameConfig.mascot_x;
   const y = Math.round(gameState.mascot_y);
   
   let imageToUse = null;
   
   // Select appropriate image based on game state
   if (gameState.game_over) {
      imageToUse = ledImages.gameover;
   } else if (!gameState.on_ground) {
      imageToUse = ledImages.jump;
   } else {
      // Use current movement pattern
      switch(currentMovePattern) {
         case 1: imageToUse = ledImages.move1; break;
         case 2: imageToUse = ledImages.move2; break;
         case 3: imageToUse = ledImages.move3; break;
         case 4: imageToUse = ledImages.move4; break;
         default: imageToUse = ledImages.move1;
      }
   }
    
    ...
}
```

The high-level data flow looks like this:

1. **User Input**: Player presses SPACE/UP or clicks to jump
2. **WebSocket**: Input is sent to backend
3. **Backend Processing**: Validates action and updates game state
4. **Game Loop (60 FPS)**:
- Physics update (such as gravity, velocity, and position)
- Collision detection
- State broadcast to clients
5. **Parallel Rendering**:
- Frontend: Canvas draws mascot and obstacles
- LED matrix update: UNO Q displays synchronized LED animations based on game state
6. **Visual Feedback**: Updated display on browser and LED matrix

## Understanding the Code

Here is a brief explanation of the App components:

### 🔧 Backend (`main.py`)

The Python® component manages all game logic and state.

- **Game state management**: Tracks the LED character's position, velocity, obstacle locations, score, and game status
- **Physics engine**: Simulates gravity and jump mechanics with frame-independent movement at 60 FPS
- **Obstacle system**: Randomly spawns three types of electronic components (resistors, transistors, microchips) at intervals between 900-1500 ms, moves them across the screen, and removes them when off-screen
- **Collision detection**: Checks if the LED character intersects with any obstacles each frame and triggers game over on collision
- **Bridge communication**: Provides game state to the Arduino LED matrix through the `get_led_state` function
- **Game loop**: Updates physics, obstacles, and score 60 times per second, then broadcasts the game state to the web interface

### 🔧 Frontend (`app.js` + `index.html`)

The web interface renders the game using HTML5 Canvas and PNG images.

- **Canvas rendering**: Displays the LED character using 6 PNG sprites, cycles through 4 running patterns with each jump, and renders electronic component obstacles at 60 FPS
- **Input handling**: Captures keyboard controls (**SPACE/UP** to jump, **R** to restart) and sends actions to the backend via WebSocket
- **Obstacle rendering**: Draws resistors with color bands (red, yellow, green), transistors with *TO-92* package and three pins, and microchips labeled IC555
- **WebSocket communication**: Connects to the backend on page load, sends player actions, and receives real-time game state updates
- **Score display**: Shows current score and session high score with zero-padded formatting, updating in real-time

### 🔧 Arduino Component (`sketch.ino` + `game_frames.h`)

The Arduino sketch displays synchronized LED matrix animations.

- **Bridge integration**: Retrieves the current game state from the Python® backend via Bridge communication
- **Animation system**: Plays different LED patterns based on game state (running, jumping, game over, or idle)
- **LED patterns**: Each frame is an 8x13 matrix (104 values) stored in `game_frames.h`:

```cpp
// Example: Running frame 1
uint8_t running_frame1[104] = {
    0,0,0,0,7,7,0,0,0,0,0,0,0,  // Row 0: Head
    0,0,0,7,7,7,7,0,0,0,0,0,0,  // Row 1: Body
    0,0,0,7,7,7,7,0,0,0,0,0,0,  
    0,5,7,7,7,7,7,7,5,0,0,0,0,  
    0,5,7,7,7,7,7,7,5,0,0,0,0,  
    0,0,0,7,0,0,7,0,0,0,0,0,0,  // Row 5: Body/legs
    0,0,7,0,0,0,0,7,0,0,0,0,0,  // Row 6: Legs animated
    7,7,7,7,7,7,7,7,7,7,7,7,7   // Row 7: Ground line
};
```

### 👾 Customizing LED Matrix Frames

The LED matrix frames can be easily customized in `game_frames.h`. Each frame is 8 rows × 13 columns (104 values):

- **Brightness values**: 0 (off), 1-3 (dim), 4-5 (medium), 6-7 (bright)
- **Row 7**: Always the ground line (all 7s)
- **Animation**: Only row 6 changes between running frames (leg positions)

To create custom frames:

1. Design your pattern on an 8×13 grid
2. Use values 0-7 for different brightness levels
3. Replace the array values in `game_frames.h`
4. Upload the sketch to see your custom mascot

### 🕹️ Game Configuration

Key constants that define the gameplay, found in `main.py` and can be modified:

- **Physics**: Gravity (0.65), jump velocity (-12.5), ground position (240px)
- **Canvas**: 800x300px with LED character size of 44x48px
- **Obstacles**: Resistor (28px), Transistor (38px), Microchip (48px), width (18px)
- **Timing**: Base speed (6.0), spawn intervals (900-1500 ms), target 60 FPS
- **Difficulty**: Speed increases with score (score/1500 rate)

You can adjust these values at the top of `main.py` to customize gameplay difficulty, physics, and visual layout. LED matrix frames can be customized in `game_frames.h` by modifying the 8x13 arrays.