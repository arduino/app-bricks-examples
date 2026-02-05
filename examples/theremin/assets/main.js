/*
 * SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
 *
 * SPDX-License-Identifier: MPL-2.0
 */

(function(){
  const TEST_MODE = false;
  const socket = io({ transports: ['websocket'] });
  const playArea = document.getElementById('play-area');
  const powerBtn = document.getElementById('power-btn');
  const accessBtn = document.getElementById('access-btn');
  const gridToggleBtn = document.getElementById('grid-toggle-btn');
  const freqDisplay = document.querySelector('#freq-display span');
  const ampDisplay = document.querySelector('#amp-display span');
  const visualizer = document.getElementById('visualizer');
  const visualizerCtx = visualizer.getContext('2d');
  const trailCanvas = document.getElementById('trail-canvas');
  const trailCtx = trailCanvas.getContext('2d');

  const thereminSvg = document.getElementById('theremin-svg');

  let currentVolume = 80; // Default volume (0-100)
  let powerOn = false;
  let accessOn = false;
  let isGridOn = false;
  let isDown = false;
  let lastPos = { x: 0, y: 1 };
  let lastEmit = 0;
  const EMIT_MIN_MS = 12; // throttle emits to ~80Hz

  // --- Canvas setup ---
  function resizeCanvas() {
    const rect = playArea.getBoundingClientRect();
    trailCanvas.width = rect.width;
    trailCanvas.height = rect.height;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);


  // --- Control Buttons ---
  let testModeInterval = null;

  function updateStateDisplay(freq, amp) {
    if (freq !== undefined) {
      freqDisplay.textContent = Math.round(freq);
    }
    if (amp !== undefined) {
      ampDisplay.textContent = amp.toFixed(2);
    }
    if (freq !== undefined && amp !== undefined) {
      drawVisualizer(freq, amp);
    }
  }

  function setPower(isOn) {
    powerOn = isOn;
    accessBtn.src = powerOn ? 'img/switch-on.svg' : 'img/switch-off.svg';
    powerBtn.src = powerOn ? 'img/power-on.svg' : 'img/power-off.svg';
    thereminSvg.src = powerOn ? 'img/theremin-on.svg' : 'img/theremin.svg';
    socket.emit('theremin:power', { on: powerOn });

    if (powerOn) {
      if (TEST_MODE) {
        if (testModeInterval) clearInterval(testModeInterval);
        testModeInterval = setInterval(() => {
          const randomFreq = Math.random() * 500 + 20; // Freq between 20 and 1020
          const randomAmp = Math.random();
          updateStateDisplay(randomFreq, randomAmp);
        }, 100);
      }
    } else {
      if (testModeInterval) {
        clearInterval(testModeInterval);
        testModeInterval = null;
      }
      updateStateDisplay(0, 0); // Reset to silent
    }
  }



  accessBtn.addEventListener('click', () => {
    setPower(!powerOn);
  });

  gridToggleBtn.addEventListener('click', () => {
    isGridOn = !isGridOn;
    gridToggleBtn.src = isGridOn ? 'img/switch-on.svg' : 'img/switch-off.svg';
    playArea.classList.toggle('grid-on', isGridOn);
  });

  const volumeBtn = document.getElementById('volume-btn');

  if (volumeBtn) {
    volumeBtn.addEventListener('click', (event) => {
      const plusBtn = event.target.closest('#volume-plus-btn');
      const minusBtn = event.target.closest('#volume-minus-btn');

      let newVolume = currentVolume;

      if (plusBtn) {
        newVolume = Math.min(100, currentVolume + 10);
      } else if (minusBtn) {
        newVolume = Math.max(0, currentVolume - 10);
      }

      if (newVolume !== currentVolume) {
        currentVolume = newVolume;
        updateVolumeIndicator(currentVolume);
        socket.emit('theremin:set_volume', { volume: newVolume });
      }
    });
  }



  // --- Mouse Trail ---
  const trailParticles = [];

  function addTrailParticle(x, y) {
    trailParticles.push({
      x: x,
      y: y,
      size: 8,
      opacity: 1,
    });
  }

  function animateTrail() {
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    trailCtx.strokeStyle = 'yellow';
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';

    for (let i = 1; i < trailParticles.length; i++) {
      const p1 = trailParticles[i - 1];
      const p2 = trailParticles[i];

      trailCtx.beginPath();
      trailCtx.moveTo(p1.x, p1.y);
      trailCtx.lineTo(p2.x, p2.y);

      trailCtx.lineWidth = p2.size;
      trailCtx.globalAlpha = p2.opacity;

      trailCtx.stroke();
    }
    trailCtx.globalAlpha = 1.0; // Reset globalAlpha

    // Particle update logic
    for (let i = 0; i < trailParticles.length; i++) {
      const p = trailParticles[i];
      p.opacity -= 0.05;
      p.size -= 0.2;
      if (p.opacity <= 0 || p.size <= 0) {
        trailParticles.splice(i, 1);
        i--;
      }
    }
    requestAnimationFrame(animateTrail);
  }
  animateTrail();


  // --- Theremin Play Area Logic ---
  function sendPos(e){
    if(!powerOn || accessOn) return;
    const now = Date.now();
    if(now - lastEmit < EMIT_MIN_MS) return;
    lastEmit = now;
    const rect = playArea.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    if(x === lastPos.x && y === lastPos.y) return;
    lastPos.x = x; lastPos.y = y;
    socket.emit('theremin:move', { x, y, ts: Date.now() });
  }

  function sendStop(){
    socket.emit('theremin:move', { x: (lastPos.x || 0), y: 1, ts: Date.now() });
  }

  playArea.addEventListener('mousemove', (e) => {
    if (powerOn) {
      const rect = playArea.getBoundingClientRect();
      addTrailParticle(e.clientX - rect.left, e.clientY - rect.top);
      showDot(e.clientX, e.clientY);
      sendPos(e);
    }
  });

  playArea.addEventListener('mouseenter', (e) => {
    if (powerOn) {
      showDot(e.clientX, e.clientY);
    }
  });

  playArea.addEventListener('mouseleave', (e) => {
    if (powerOn) {
      removeDot();
      sendStop();
    }
  });

  playArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDown = true;
    const touch = e.touches[0];
    sendPos(touch);
    showDot(touch.clientX, touch.clientY);
    if (powerOn) {
      const rect = playArea.getBoundingClientRect();
      addTrailParticle(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  });

  playArea.addEventListener('touchmove', (e) => {
    if(isDown) {
      e.preventDefault();
      const touch = e.touches[0];
      sendPos(touch);
      showDot(touch.clientX, touch.clientY);
      if (powerOn) {
        const rect = playArea.getBoundingClientRect();
        addTrailParticle(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    }
  });

  playArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    if(isDown){
      isDown = false;
      sendStop();
      removeDot();
    }
  });

  // --- Visual Indicators ---
  function showDot(x, y){
    let dot = document.getElementById('lock-dot');
    if(!dot){ dot = document.createElement('div'); dot.id = 'lock-dot'; playArea.appendChild(dot); }
    const r = playArea.getBoundingClientRect();
    dot.style.left = (x - r.left) + 'px';
    dot.style.top = (y - r.top) + 'px';
  }

  function removeDot(){ const d = document.getElementById('lock-dot'); if(d) d.remove(); }

  playArea.addEventListener('dragstart', (e) => { e.preventDefault(); });

  function drawVisualizer(freq, amp) {
    const width = visualizer.width;
    const height = visualizer.height;
    const mid = height / 2;

    visualizerCtx.clearRect(0, 0, width, height);
    visualizerCtx.strokeStyle = '#25C2C7';
    visualizerCtx.lineWidth = 2;
    visualizerCtx.beginPath();
    visualizerCtx.moveTo(0, mid);

    if (amp > 0) {
      const freqScale = freq / 500;
      for (let i = 0; i < width; i++) {
        const y = mid + (amp * (height / 2) * Math.sin(i * freqScale * 2 * Math.PI / width));
        visualizerCtx.lineTo(i, y);
      }
    } else {
      visualizerCtx.lineTo(width, mid);
    }
    visualizerCtx.stroke();
  }

  function updateVolumeIndicator(volume) {
    const indicator = document.getElementById('volume-indicator');
    if (indicator) {
      const angle = ((volume / 100.0) - 0.5) * 180; // -90 to +90 degrees
      indicator.style.transform = `rotate(${angle}deg)`;
    }
  }

  // --- Socket Event Handlers ---
  socket.on('theremin:state', (s) => {
    if (accessOn) return;
    updateStateDisplay(s.freq, s.amp);
  });

  socket.on('theremin:volume', (v) => {
    if(v.volume !== undefined) {
      currentVolume = v.volume;
      updateVolumeIndicator(v.volume);
    }
  });

  setPower(true);


})();