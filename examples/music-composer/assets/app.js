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
  const INITIAL_GRID_STEPS = 32; // Initial visible steps
  const NOTES = ['B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3'];
  const STEPS_PER_EXPAND = 32; // Add 32 steps when scrolling

  // State
  let grid = null; // {noteIndex: {stepIndex: true/false}} - null until server sends state
  let isPlaying = false;
  let isPaused = false;
  let currentStep = 0;
  let totalSteps = INITIAL_GRID_STEPS; // Dynamic grid size
  let sequenceLength = INITIAL_GRID_STEPS; // Actual sequence length from backend
  let bpm = 120;
  let playInterval = null;
  let effects = {
    bitcrusher: 0,
    chorus: 0,
    tremolo: 0,
    vibrato: 0,
    overdrive: 0
  };

  // DOM elements
  const playBtn = document.getElementById('play-btn');
  const pauseBtn = document.getElementById('pause-btn');
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
    if (data.current_step !== undefined) {
      currentStep = data.current_step;
      log.debug('Current step synced:', currentStep);
    }
    if (data.total_steps !== undefined) {
      sequenceLength = data.total_steps;
      log.info('Sequence length from backend:', sequenceLength);
    }
    renderGrid();
    updateEffectsKnobs();
  });

  socket.on('composer:step_playing', (data) => {
    // Backend callback - used only for synchronization check, not for UI updates
    log.debug('Backend step playing:', data.step, '(frontend is handling UI timing locally)');
  });

  socket.on('composer:playback_ended', () => {
    // Backend signals sequence generation complete (but audio still in queue)
    // Don't stop UI animation - it runs on its own timer until effectiveLength
    log.info('Backend sequence generation complete (audio still playing from queue)');
  });

  socket.on('composer:export_data', (data) => {
    log.info('Export data received');
    const blob = new Blob([data.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || 'composition.h';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Build grid with dynamic size
  function buildGrid() {
    sequencerGrid.innerHTML = '';

    // Top-left corner (empty)
    const corner = document.createElement('div');
    sequencerGrid.appendChild(corner);

    // Column labels (step numbers)
    for (let step = 0; step < totalSteps; step++) {
      const label = document.createElement('div');
      label.className = 'grid-col-label';
      if (step % 4 === 0) {
        label.textContent = step / 4 + 1;
      }
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
      for (let step = 0; step < totalSteps; step++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.note = noteIndex;
        cell.dataset.step = step;

        // Add beat separator every 4 steps
        if ((step + 1) % 4 === 0 && step < totalSteps - 1) {
          cell.classList.add('beat-separator');
        }

        cell.addEventListener('click', () => toggleCell(noteIndex, step));
        sequencerGrid.appendChild(cell);
      }
    });

    // Update grid CSS for dynamic columns
    sequencerGrid.style.gridTemplateColumns = `auto repeat(${totalSteps}, 40px)`;
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

    // Expand grid if clicking near the end
    if (newValue) {
      expandGridIfNeeded();
    }

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

    // Auto-scroll to keep current step visible
    if (step >= 0) {
      const container = document.getElementById('sequencer-grid');
      const cellWidth = 40; // Width of one grid cell
      const targetScroll = (step * cellWidth) - (container.clientWidth / 2);
      container.scrollLeft = Math.max(0, targetScroll);
    }
  }

  function findLastNoteStep() {
    // Find the highest step index that has at least one note
    let lastStep = -1;
    if (grid) {
      Object.keys(grid).forEach(noteKey => {
        Object.keys(grid[noteKey]).forEach(stepKey => {
          if (grid[noteKey][stepKey]) {
            const stepNum = parseInt(stepKey);
            console.log(`Note ${noteKey} at step ${stepNum}`);
            if (stepNum > lastStep) {
              lastStep = stepNum;
            }
          }
        });
      });
    }
    console.log(`findLastNoteStep returned: ${lastStep}`);
    return lastStep;
  }

  function expandGridIfNeeded() {
    const lastNote = findLastNoteStep();
    // Expand if we're within 8 steps of the edge
    if (lastNote >= totalSteps - 8) {
      totalSteps += STEPS_PER_EXPAND;
      buildGrid();
      renderGrid();
      log.info('Grid expanded to', totalSteps, 'steps');
    }
  }

  function startLocalPlayback() {
    // Calculate sequence length: find last note step, minimum 16
    const lastNoteStep = findLastNoteStep();
    const effectiveLength = lastNoteStep >= 0 ? Math.max(lastNoteStep + 1, 16) : 16;

    console.log('=== PLAYBACK START ===');
    console.log('Grid:', grid);
    console.log('Last note step:', lastNoteStep);
    console.log('Effective length:', effectiveLength);
    console.log('BPM:', bpm);

    // Calculate step duration in milliseconds
    const stepDurationMs = (60000 / bpm) / 2; // Eighth notes: 2 per beat

    currentStep = 0;
    highlightStep(currentStep);

    playInterval = setInterval(() => {
      currentStep++;
      console.log(`Step ${currentStep}/${effectiveLength}`);
      if (currentStep >= effectiveLength) {
        // Sequence ended
        console.log('Playback ended at step', currentStep);
        stopLocalPlayback();
        return;
      }
      highlightStep(currentStep);
      log.debug('Frontend step:', currentStep);
    }, stepDurationMs);

    log.info('Local playback started:', stepDurationMs, 'ms per step, will play', effectiveLength, 'steps');
  }

  function stopLocalPlayback() {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    isPlaying = false;
    isPaused = false;
    playBtn.style.display = 'flex';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    highlightStep(-1);
  }

  // Play button - starts from beginning or resumes from pause
  playBtn.addEventListener('click', () => {
    isPlaying = true;
    playBtn.style.display = 'none';
    pauseBtn.style.display = 'flex';
    stopBtn.style.display = 'flex';
    log.info(isPaused ? 'Resuming playback' : 'Starting playback at', bpm, 'BPM');

    // Start local UI animation immediately
    startLocalPlayback();

    // Trigger backend audio playback
    socket.emit('composer:play', { grid, bpm });
  });

  // Pause button - for infinite loop we only have stop (pause not supported with loop=True)
  pauseBtn.addEventListener('click', () => {
    stopLocalPlayback();
    log.info('Stopping playback (pause not supported in infinite loop mode)');
    socket.emit('composer:stop', {});
  });

  // Stop button - resets to beginning, clears highlight
  stopBtn.addEventListener('click', () => {
    stopLocalPlayback();
    log.info('Stopping playback');
    socket.emit('composer:stop', {});
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
  const updateVolumeSliderBackground = () => {
    const volume = parseInt(volumeSlider.value);
    const percentage = volume;
    volumeSlider.style.background = `linear-gradient(to top, #25C2C7 ${percentage}%, #090F11 ${percentage}%)`;
  };

  updateVolumeSliderBackground();

  volumeSlider.addEventListener('input', () => {
    const volume = parseInt(volumeSlider.value);
    updateVolumeSliderBackground();
    socket.emit('composer:set_volume', { volume });
  });

  // Knobs
  const knobActions = document.querySelectorAll('.knob-action');
  knobActions.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const knob = btn.closest('.knob');
      if (!knob) return;

      let currentValue = parseFloat(knob.dataset.value) || 0;
      const step = 5; // Increment/decrement by 5

      if (action === 'plus') {
        currentValue += step;
      } else if (action === 'minus') {
        currentValue -= step;
      }

      currentValue = Math.max(0, Math.min(100, currentValue)); // Clamp between 0 and 100
      knob.dataset.value = currentValue;

      // Update the single knob's rotation
      const rotation = (currentValue / 100) * 270 - 135;
      const indicator = knob.querySelector('.knob-indicator');
      if (indicator) {
        indicator.style.transform = `rotate(${rotation}deg)`;
      }

      // Update the global state and emit
      const effectName = knob.id.replace('-knob', '');
      effects[effectName] = currentValue;
      socket.emit('composer:set_effects', { effects });
    });
  });

  function updateEffectsKnobs() {
    Object.keys(effects).forEach(key => {
      const knob = document.getElementById(`${key}-knob`);
      if (knob) {
        const value = effects[key] || 0;
        knob.dataset.value = value;
        const rotation = (value / 100) * 270 - 135;
        const indicator = knob.querySelector('.knob-indicator');
        if (indicator) {
          indicator.style.transform = `rotate(${rotation}deg)`;
        }
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
