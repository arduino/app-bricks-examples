// SPDX-FileCopyrightText: Copyright (C) 2025
// SPDX-License-Identifier: MPL-2.0

// Game configuration received from backend
let gameConfig = null;
let gameState = null;
let socket = null;

// Canvas setup
let canvas = null;
let ctx = null;

// Animation state
let currentMovePattern = 1; // Track movement pattern (1-4)
let blinkState = true;
let lastBlinkTime = Date.now();
let animationId = null;

// LED Character Images
let ledImages = {
    move1: null,
    move2: null,
    move3: null,
    move4: null,
    jump: null,
    gameover: null
};

// Track which images are loaded
let imagesLoaded = false;

// Colors
const BG_COLOR = '#f5f5f5';
const FG_COLOR = '#282828';
const ACCENT_COLOR = '#3c3c3c';

document.addEventListener('DOMContentLoaded', () => {
    loadLEDImages();
    initCanvas();
    initSocketIO();
    initInputHandlers();
    startGameLoop();
});

function loadLEDImages() {
    const imagesToLoad = [
        { key: 'move1', src: 'img/ledcharacter_move1.png' },
        { key: 'move2', src: 'img/ledcharacter_move2.png' },
        { key: 'move3', src: 'img/ledcharacter_move3.png' },
        { key: 'move4', src: 'img/ledcharacter_move4.png' },
        { key: 'jump', src: 'img/ledcharacter_jump.png' },
        { key: 'gameover', src: 'img/ledcharacter_gameover.png' }
    ];
    
    let loadedCount = 0;
    
    imagesToLoad.forEach(({ key, src }) => {
        const img = new Image();
        img.onload = () => {
            ledImages[key] = img;
            loadedCount++;
            if (loadedCount === imagesToLoad.length) {
                imagesLoaded = true;
                console.log('All LED character images loaded from img/ folder');
            }
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            // Try loading from root directory as fallback
            const filename = src.split('/').pop();
            console.log(`Trying fallback path: ${filename}`);
            img.src = filename;
        };
        img.src = src;
    });
}

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas properties for pixels
    ctx.imageSmoothingEnabled = false;
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    handleResize();
}

function handleResize() {
    // Scale canvas to fit window while maintaining aspect ratio
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 150;
    const scale = Math.min(maxWidth / 800, maxHeight / 300, 1);
    
    if (scale < 1) {
        canvas.style.width = `${800 * scale}px`;
        canvas.style.height = `${300 * scale}px`;
    }
}

function initSocketIO() {
    socket = io(`http://${window.location.host}`);
    
    socket.on('connect', () => {
        console.log('Connected to game server');
        updateConnectionStatus(true);
        socket.emit('client_connected', {});
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from game server');
        updateConnectionStatus(false);
    });
    
    socket.on('game_init', (data) => {
        console.log('Received game initialization:', data);
        gameConfig = data.config;
        gameState = data.state;
        updateScoreDisplay();
    });
    
    socket.on('game_update', (data) => {
        gameState = data;
        updateScoreDisplay();
    });
    
    socket.on('game_reset', (data) => {
        console.log('Game reset');
        gameState = data.state;
        updateScoreDisplay();
        // Reset animation states
        currentMovePattern = 1;
        blinkState = true;
    });
    
    socket.on('jump_confirmed', (data) => {
        if (data.success) {
            console.log('⬆Jump confirmed');
            // Cycle to next movement pattern (1->2->3->4->1)
            currentMovePattern = (currentMovePattern % 4) + 1;
        }
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        showError('Connection error: ' + error);
    });
}

function initInputHandlers() {
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Touch/click controls for mobile
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasTouch);
    
    // Prevent default touch behaviors
    canvas.addEventListener('touchmove', (e) => e.preventDefault());
    canvas.addEventListener('touchend', (e) => e.preventDefault());
}

function handleKeyPress(e) {
    switch(e.code) {
        case 'Space':
        case 'ArrowUp':
            e.preventDefault();
            performAction();
            break;
        case 'KeyR':
            e.preventDefault();
            restartGame();
            break;
    }
}

function handleCanvasClick(e) {
    e.preventDefault();
    performAction();
}

function handleCanvasTouch(e) {
    e.preventDefault();
    performAction();
}

function performAction() {
    if (!gameState) return;
    
    if (gameState.game_over) {
        restartGame();
    } else {
        jump();
    }
}

function jump() {
    if (socket && socket.connected) {
        socket.emit('player_action', { action: 'jump' });
    }
}

function restartGame() {
    if (socket && socket.connected) {
        socket.emit('player_action', { action: 'restart' });
    }
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
        statusElement.textContent = connected ? 'Connected' : 'Disconnected';
    }
}

function updateScoreDisplay() {
    if (!gameState) return;
    
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('highScore');
    
    if (scoreElement) {
        scoreElement.textContent = String(Math.floor(gameState.score)).padStart(5, '0');
    }
    
    if (highScoreElement) {
        highScoreElement.textContent = String(Math.floor(gameState.high_score)).padStart(5, '0');
    }
}

function showError(message) {
    console.error(message);

    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Drawing functions
function clearCanvas() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
    if (!gameConfig) return;
    
    // Ground line
    ctx.strokeStyle = ACCENT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gameConfig.ground_y + 1);
    ctx.lineTo(canvas.width, gameConfig.ground_y + 1);
    ctx.stroke();
    
    // Ground texture dots
    ctx.fillStyle = ACCENT_COLOR;
    for (let x = 0; x < canvas.width; x += 14) {
        ctx.fillRect(x, gameConfig.ground_y + 3, 1, 1);
    }
}

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
            case 1:
                imageToUse = ledImages.move1;
                break;
            case 2:
                imageToUse = ledImages.move2;
                break;
            case 3:
                imageToUse = ledImages.move3;
                break;
            case 4:
                imageToUse = ledImages.move4;
                break;
            default:
                imageToUse = ledImages.move1;
        }
    }
    
    // Draw the LED character image if available
    if (imageToUse) {
        // Draw image at original size or scale if needed
        // Assuming the PNGs are sized appropriately for the mascot
        ctx.drawImage(imageToUse, x, y, gameConfig.mascot_width, gameConfig.mascot_height);
    } else {
        // Fallback: draw a simple rectangle if image not loaded
        ctx.fillStyle = FG_COLOR;
        ctx.fillRect(x, y, gameConfig.mascot_width, gameConfig.mascot_height);
        
        // Simple face
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(x + 10, y + 10, 5, 5);
        ctx.fillRect(x + 29, y + 10, 5, 5);
    }
}

function drawObstacles() {
    if (!gameState || !gameState.obstacles) return;
    
    for (const obstacle of gameState.obstacles) {
        const x = Math.round(obstacle.x);
        const y = Math.round(obstacle.y);
        const h = obstacle.height;
        
        // Determine obstacle type based on height
        if (h <= 32) {
            // Small: Resistor
            drawResistor(x, y - 10);
        } else if (h <= 42) {
            // Medium: Transistor
            drawTransistor(x, y - 8);
        } else {
            // Large: Microchip
            drawMicrochip(x, y);
        }
    }
}

function drawResistor(x, y) {
    ctx.fillStyle = '#8B4513';      // Brown color for resistor body
    ctx.fillRect(x, y + 8, 20, 14);    
    
    // Resistor bands
    ctx.fillStyle = '#FF0000';      // Red band
    ctx.fillRect(x + 3, y + 8, 3, 14);
    ctx.fillStyle = '#FFFF00';      // Yellow band
    ctx.fillRect(x + 9, y + 8, 3, 14);
    ctx.fillStyle = '#00FF00';      // Green band
    ctx.fillRect(x + 15, y + 8, 3, 14);
    
    // Wires
    ctx.fillStyle = '#606060';
    ctx.fillRect(x - 3, y + 13, 5, 3);
    ctx.fillRect(x + 18, y + 13, 5, 3);
    
    // Add vertical wires
    ctx.fillRect(x - 1, y + 3, 2, 10);
    ctx.fillRect(x + 19, y + 3, 2, 10);
}

function drawTransistor(x, y) {
    // Pixel art transistor (medium obstacle)
    ctx.fillStyle = FG_COLOR;
    
    // Main body (TO-92 package style)
    ctx.fillRect(x + 2, y + 2, 16, 24);
    
    // Rounded top
    ctx.fillRect(x + 4, y, 12, 3);
    ctx.fillRect(x + 6, y - 1, 8, 1);
    
    // Three legs
    ctx.fillStyle = '#606060';
    ctx.fillRect(x + 4, y + 26, 3, 12);
    ctx.fillRect(x + 9, y + 26, 3, 12);
    ctx.fillRect(x + 14, y + 26, 3, 12);
    
    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 5, y + 8, 10, 10);
    ctx.fillStyle = FG_COLOR;
    ctx.font = '12px monospace';
    ctx.fillText('T', x + 8, y + 16);
}

function drawMicrochip(x, y) {
    // Pixel art microchip/IC (large obstacle)
    ctx.fillStyle = FG_COLOR;
    
    // Main IC body
    ctx.fillRect(x + 2, y + 10, 14, 20);
    
    // Notch at top
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(x + 7, y + 10, 4, 3);
    
    // IC pins
    ctx.fillStyle = '#606060';
    for (let i = 0; i < 4; i++) {
        // Left side pins
        ctx.fillRect(x - 2, y + 14 + i*4, 4, 2);
        // Right side pins
        ctx.fillRect(x + 14, y + 14 + i*4, 4, 2);
    }
    
    // Label on IC
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 4, y + 16, 10, 8);
    ctx.fillStyle = FG_COLOR;
    ctx.font = '6px monospace';
    ctx.fillText('IC', x + 6, y + 21);
    ctx.fillText('555', x + 5, y + 23);
}

function drawGameOver() {
    if (!gameState || !gameState.game_over) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(245, 245, 245, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game Over text
    ctx.fillStyle = FG_COLOR;
    ctx.font = 'bold 32px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 30);
    
    // Score display
    ctx.font = '20px Consolas, monospace';
    ctx.fillText(`Score: ${Math.floor(gameState.score)}`, canvas.width/2, canvas.height/2);
    
    // Blinking restart prompt
    const currentTime = Date.now();
    if (currentTime - lastBlinkTime > 500) {
        blinkState = !blinkState;
        lastBlinkTime = currentTime;
    }
    
    if (blinkState) {
        ctx.font = '16px Consolas, monospace';
        ctx.fillStyle = ACCENT_COLOR;
        ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 35);
    }
}

function drawDebugInfo() {
    // Optional: Display debug information
    if (!gameState || !gameConfig) return;
    
    ctx.fillStyle = ACCENT_COLOR;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const debugInfo = [
        `FPS: ${(1000 / 16).toFixed(0)}`,
        `Speed: ${gameState.speed.toFixed(1)}`,
        `Obstacles: ${gameState.obstacles.length}`,
        `Y: ${gameState.mascot_y.toFixed(0)}`,
        `Vel: ${gameState.velocity_y.toFixed(1)}`,
        `Pattern: ${currentMovePattern}`,
        `Images: ${imagesLoaded ? 'Loaded' : 'Loading...'}`
    ];
    
    debugInfo.forEach((info, i) => {
        ctx.fillText(info, 10, 10 + i * 12);
    });
}

// Main game rendering loop
function render() {
    clearCanvas();
    drawGround();
    drawObstacles();
    drawMascot();
    drawGameOver();
    
    // Uncomment for debug info
    //drawDebugInfo();
}

function startGameLoop() {
    function loop() {
        render();
        animationId = requestAnimationFrame(loop);
    }
    loop();
}

function stopGameLoop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopGameLoop();
    if (socket) {
        socket.disconnect();
    }
});