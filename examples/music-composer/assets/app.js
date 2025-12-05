/*
 * SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
 *
 * SPDX-License-Identifier: MPL-2.0
 */

(function(){
  const socket = io({ transports: ['websocket'] });
  
  // Logger utility
  const log = {
    info: (msg, ...args) => console.log(`[MusicComposer] ${msg}`, ...args),
    debug: (msg, ...args) => console.debug(`[MusicComposer] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[MusicComposer] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[MusicComposer] ${msg}`, ...args)
  };
  
  // Configuration
  const GRID_STEPS = 16;
  const NOTES = ['B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4'];
  
  // State
  let grid = null; // {noteIndex: {stepIndex: true/false}} - null until server sends state
  let isPlaying = false;
  let currentStep = 0;
  let bpm = 120;
  let playInterval = null;
  let effects = {
    reverb: 0,
    chorus: 0,
    tremolo: 0,
    vibrato: 0,
    overdrive: 0
  };
  
  // DOM elements
  const playBtn = document.getElementById('play-btn');
  const stopBtn = document.getElementById('stop-btn');
  const bpmInput = document.getElementById('bpm-input');
  const resetBpmBtn = document.getElementById('reset-bpm');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  const clearBtn = document.getElementById('clear-btn');
  const exportBtn = document.getElementById('export-btn');
  const sequencerGrid = document.getElementById('sequencer-grid');
  const volumeSlider = document.getElementById('volume-slider');
  const waveButtons = document.querySelectorAll('.wave-btn');
  const knobs = document.querySelectorAll('.knob');
  
  // Initialize
  socket.on('connect', () => {
    log.info('Connected to server');
    socket.emit('composer:get_state', {});
  });
  
  // Socket events
  socket.on('composer:state', (data) => {
    log.info('Received state from server:', JSON.stringify(data));
    if (data.grid) {
      const oldGrid = JSON.stringify(grid);
      grid = data.grid;
      const newGrid = JSON.stringify(grid);
      if (oldGrid !== newGrid) {
        log.info('Grid changed from', oldGrid, 'to', newGrid);
      }
    } else {
      // Initialize empty grid if server sends nothing
      grid = {};
      log.info('Grid initialized as empty');
    }
    if (data.bpm) {
      bpm = data.bpm;
      bpmInput.value = bpm;
      log.info('BPM updated:', bpm);
    }
    if (data.effects) {
      effects = data.effects;
      log.info('Effects updated:', effects);
    }
    renderGrid();
    updateEffectsKnobs();
  });
  
  socket.on('composer:step_playing', (data) => {
    log.debug('Step playing:', data.step);
    highlightStep(data.step);
  });
  
  // Build grid
  function buildGrid() {
    sequencerGrid.innerHTML = '';
    
    // Top-left corner (empty)
    const corner = document.createElement('div');
    sequencerGrid.appendChild(corner);
    
    // Column labels (step numbers)
    for (let step = 0; step < GRID_STEPS; step++) {
      const label = document.createElement('div');
      label.className = 'grid-col-label';
      label.textContent = step + 1;
      sequencerGrid.appendChild(label);
    }
    
    // Grid rows
    NOTES.forEach((note, noteIndex) => {
      // Row label (note name)
      const rowLabel = document.createElement('div');
      rowLabel.className = 'grid-row-label';
      rowLabel.textContent = note;
      sequencerGrid.appendChild(rowLabel);
      
      // Grid cells
      for (let step = 0; step < GRID_STEPS; step++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.note = noteIndex;
        cell.dataset.step = step;
        
        // Add beat separator every 4 steps
        if ((step + 1) % 4 === 0 && step < GRID_STEPS - 1) {
          cell.classList.add('beat-separator');
        }
        
        cell.addEventListener('click', () => toggleCell(noteIndex, step));
        sequencerGrid.appendChild(cell);
      }
    });
    
  }
  
  function toggleCell(noteIndex, step) {
    if (grid === null) grid = {}; // Initialize if still null
    const noteKey = String(noteIndex);
    const stepKey = String(step);
    if (!grid[noteKey]) grid[noteKey] = {};
    
    // Explicit toggle: if undefined or false, set to true; if true, set to false
    const currentValue = grid[noteKey][stepKey] === true;
    const newValue = !currentValue;
    grid[noteKey][stepKey] = newValue;
    
    log.info(`Toggle cell [${NOTES[noteIndex]}][step ${step}]: ${currentValue} -> ${newValue}`);
    log.info('Grid before emit:', JSON.stringify(grid));
    renderGrid();
    socket.emit('composer:update_grid', { grid });
  }
  
  function renderGrid() {
    if (grid === null) {
      log.info('Grid is null, skipping render');
      return; // Don't render until we have state from server
    }
    log.info('Rendering grid:', JSON.stringify(grid));
    const cells = document.querySelectorAll('.grid-cell');
    let activeCount = 0;
    let activeCells = [];
    cells.forEach(cell => {
      const noteKey = String(cell.dataset.note);
      const stepKey = String(cell.dataset.step);
      const isActive = grid[noteKey] && grid[noteKey][stepKey] === true;
      
      // Force remove class first, then add if needed
      cell.classList.remove('active');
      if (isActive) {
        cell.classList.add('active');
        activeCount++;
        activeCells.push(`[${NOTES[noteKey]}][step ${stepKey}]`);
      }
    });
    log.info(`Rendered ${activeCount} active cells: ${activeCells.join(', ')}`);
  }
  
  function highlightStep(step) {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      const cellStep = parseInt(cell.dataset.step);
      cell.classList.toggle('playing', cellStep === step);
    });
  }
  
  // Play button
  playBtn.addEventListener('click', () => {
    if (!isPlaying) {
      isPlaying = true;
      playBtn.style.display = 'none';
      stopBtn.style.display = 'flex';
      log.info('Starting playback at', bpm, 'BPM');
      socket.emit('composer:play', { grid, bpm });
    }
  });

  // Stop button
  stopBtn.addEventListener('click', () => {
    if (isPlaying) {
      isPlaying = false;
      stopBtn.style.display = 'none';
      playBtn.style.display = 'flex';
      log.info('Stopping playback');
      socket.emit('composer:stop', {});
      highlightStep(-1);
    }
  });
  
  // BPM controls
  bpmInput.addEventListener('change', () => {
    bpm = parseInt(bpmInput.value);
    log.info('BPM changed to:', bpm);
    socket.emit('composer:set_bpm', { bpm });
  });
  
  resetBpmBtn.addEventListener('click', () => {
    bpm = 120;
    bpmInput.value = bpm;
    log.info('BPM reset to 120');
    socket.emit('composer:set_bpm', { bpm });
  });
  
  // Clear button
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all notes?')) {
      grid = {};
      NOTES.forEach((note, noteIndex) => {
        const noteKey = String(noteIndex);
        grid[noteKey] = {};
      });
      renderGrid();
      socket.emit('composer:update_grid', { grid });
    }
  });
  
  // Export button
  exportBtn.addEventListener('click', () => {
    socket.emit('composer:export', { grid });
  });
  
  socket.on('composer:export_data', (data) => {
    const blob = new Blob([data.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || 'composition.h';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  // Wave buttons
  waveButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      waveButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const wave = btn.dataset.wave;
      socket.emit('composer:set_waveform', { waveform: wave });
    });
  });
  
  // Volume slider
  volumeSlider.addEventListener('input', () => {
    const volume = parseInt(volumeSlider.value);
    socket.emit('composer:set_volume', { volume });
  });
  
  // Knobs
  knobs.forEach(knob => {
    let isDragging = false;
    let startY = 0;
    let startValue = 0;
    
    knob.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startValue = parseFloat(knob.dataset.value) || 0;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const delta = (startY - e.clientY) * 0.5;
      let newValue = startValue + delta;
      newValue = Math.max(0, Math.min(100, newValue));
      
      knob.dataset.value = newValue;
      const rotation = (newValue / 100) * 270 - 135;
      knob.querySelector('.knob-indicator').style.transform = 
        `translateX(-50%) rotate(${rotation}deg)`;
      
      const effectName = knob.id.replace('-knob', '');
      effects[effectName] = newValue;
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        socket.emit('composer:set_effects', { effects });
      }
    });
  });
  
  function updateEffectsKnobs() {
    Object.keys(effects).forEach(key => {
      const knob = document.getElementById(`${key}-knob`);
      if (knob) {
        const value = effects[key] || 0;
        knob.dataset.value = value;
        const rotation = (value / 100) * 270 - 135;
        knob.querySelector('.knob-indicator').style.transform = 
          `translateX(-50%) rotate(${rotation}deg)`;
      }
    });
  }
  
  // Initialize grid
  buildGrid();
  
  // Ensure play button is visible and stop button is hidden on load
  playBtn.style.display = 'flex';
  stopBtn.style.display = 'none';
  log.info('Grid UI built, waiting for server state...');
  
})();
