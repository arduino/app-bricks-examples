# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
import time
import random
import threading
import json

# Game Constants
GAME_WIDTH = 800
GAME_HEIGHT = 300
GROUND_Y = 240
FPS = 60

MASCOT_WIDTH = 44
MASCOT_HEIGHT = 48
MASCOT_X = 80

OBSTACLE_WIDTH = 18
MIN_OBSTACLE_HEIGHT = 28  # Resistor height
MID_OBSTACLE_HEIGHT = 38  # Transistor height  
MAX_OBSTACLE_HEIGHT = 48  # Microchip height

# Obstacle types with their specific heights
OBSTACLE_TYPES = [
    {'name': 'resistor', 'height': 28},    # Small
    {'name': 'transistor', 'height': 38},  # Medium
    {'name': 'microchip', 'height': 48}    # Large
]

JUMP_VELOCITY = -12.5
GRAVITY = 0.65
BASE_SPEED = 6.0

SPAWN_MIN_MS = 900
SPAWN_MAX_MS = 1500

class GameState:
    """Manages the complete game state"""
    def __init__(self):
        self.reset()
        self.high_score = 0
        
    def reset(self):
        """Reset game to initial state"""
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
        """Update mascot physics"""
        if not self.on_ground:
            self.velocity_y += GRAVITY * dt * 60  # Scale for 60 FPS base
            self.mascot_y += self.velocity_y * dt * 60
            
            # Ground collision
            if self.mascot_y >= GROUND_Y - MASCOT_HEIGHT:
                self.mascot_y = GROUND_Y - MASCOT_HEIGHT
                self.velocity_y = 0.0
                self.on_ground = True
    
    def update_obstacles(self, dt):
        """Update obstacle positions and spawn new ones"""
        current_time = time.time()
        
        # Move existing obstacles
        for obstacle in self.obstacles:
            obstacle['x'] -= self.speed * dt * 60
        
        # Remove offscreen obstacles
        self.obstacles = [obs for obs in self.obstacles if obs['x'] > -OBSTACLE_WIDTH - 10]
        
        # Spawn new obstacles
        if current_time - self.last_spawn_time >= self.next_spawn_delay:
            self.spawn_obstacle()
            self.last_spawn_time = current_time
            self.next_spawn_delay = random.uniform(SPAWN_MIN_MS/1000, SPAWN_MAX_MS/1000)
    
    def spawn_obstacle(self):
        """Create a new obstacle"""
        # Randomly select an obstacle type
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
    
    def check_collisions(self):
        """Check for mascot-obstacle collisions"""
        mascot_rect = {
            'x': MASCOT_X,
            'y': self.mascot_y,
            'width': MASCOT_WIDTH,
            'height': MASCOT_HEIGHT
        }
        
        for obstacle in self.obstacles:
            if self.rectangles_intersect(mascot_rect, obstacle):
                self.game_over = True
                self.high_score = max(self.high_score, self.score)
                return True
        return False
    
    def rectangles_intersect(self, rect1, rect2):
        """Check if two rectangles intersect"""
        return not (rect1['x'] + rect1['width'] < rect2['x'] or
                   rect2['x'] + rect2['width'] < rect1['x'] or
                   rect1['y'] + rect1['height'] < rect2['y'] or
                   rect2['y'] + rect2['height'] < rect1['y'])
    
    def jump(self):
        """Make the mascot jump if on ground"""
        if self.on_ground and not self.game_over:
            self.velocity_y = JUMP_VELOCITY
            self.on_ground = False
            return True
        return False
    
    def to_dict(self):
        """Serialize game state for transmission"""
        return {
            'mascot_y': self.mascot_y,
            'velocity_y': self.velocity_y,
            'on_ground': self.on_ground,
            'obstacles': self.obstacles,
            'score': self.score,
            'high_score': self.high_score,
            'game_over': self.game_over,
            'speed': self.speed
        }

# Initialize game and UI
game = GameState()
ui = WebUI()

# Game loop control
game_running = True
game_thread = None
game_started = False  # Track if game has started

def get_led_state():
    """Return current LED state for the LED matrix display"""
    global game_started
    
    if game.game_over:
        return "game_over"
    elif not game_started and game.score == 0:
        return "idle"
    elif not game.on_ground:
        return "jumping"
    else:
        return "running"

def game_loop():
    """Main game loop running at ~60 FPS"""
    global game_running, game_started
    last_update = time.time()
    
    while game_running:
        current_time = time.time()
        dt = current_time - last_update
        
        if not game.game_over:
            # Update game logic
            game.update_physics(dt)
            game.update_obstacles(dt)
            game.check_collisions()
            
            # Update score (approximately 1 point per frame at 60 FPS)
            game.score += int(60 * dt)
            
            # Increase difficulty
            game.speed = BASE_SPEED + (game.score / 1500.0)
        
        # Send game state to all connected clients
        ui.send_message('game_update', game.to_dict())
        
        last_update = current_time
        
        # Target 60 FPS
        sleep_time = max(0, (1/FPS) - (time.time() - current_time))
        time.sleep(sleep_time)

def on_player_action(client_id, data):
    """Handle player input actions"""
    global game_started
    action = data.get('action')
    
    if action == 'jump':
        game_started = True  # Game starts on first jump
        if game.jump():
            ui.send_message('jump_confirmed', {'success': True})
    elif action == 'restart':
        game.reset()
        game_started = True  # Game restarts
        ui.send_message('game_reset', {'state': game.to_dict()})

def on_client_connected(client_id, data):
    """Send initial game state when client connects"""
    ui.send_message('game_init', {
        'state': game.to_dict(),
        'config': {
            'width': GAME_WIDTH,
            'height': GAME_HEIGHT,
            'ground_y': GROUND_Y,
            'mascot_x': MASCOT_X,
            'mascot_width': MASCOT_WIDTH,
            'mascot_height': MASCOT_HEIGHT
        }
    })

# Register WebSocket event handlers
ui.on_message('player_action', on_player_action)
ui.on_message('client_connected', on_client_connected)

# Provide the LED state function to the Arduino sketch
Bridge.provide("get_led_state", get_led_state)

# Run the app
App.run(user_loop=game_loop)