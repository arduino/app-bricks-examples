// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

(function () {
  const ui = new WebUI({ transports: ['websocket'] });
  ui.on_connect(onUIConnected);
  ui.on_message('composer:state', onComposerState);
  ui.on_message('composer:step_playing', onComposerStepPlaying);
  ui.on_message('composer:playback_ended', onComposerPlaybackEnded);
  ui.on_message('composer:export_data', onComposerExportData);

  // Logger utility
  const log = {
    info: (msg, ...args) => console.log(`[MusicComposer] ${msg}`, ...args),
    debug: (msg, ...args) => console.debug(`[MusicComposer] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[MusicComposer] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[MusicComposer] ${msg}`, ...args),
  };

  // Configuration
  const INITIAL_GRID_STEPS = 32; // Initial visible steps
  const STEPS_PER_EXPAND = 32; // Add 32 steps when scrolling
  const DEFAULT_VISIBLE_TOP_NOTE = 'B4';

  // State
  let grid = {};
  let notes = [];
  let isPaused = false;
  let isAppInitialized = false;
  let currentStep = 0;
  let totalSteps = INITIAL_GRID_STEPS; // Dynamic grid size
  let sequenceLength = 16; // Actual sequence length from backend
  let bpm = 120;
  let playInterval = null;
  let effects = {
    bitcrusher: 0,
    chorus: 0,
    tremolo: 0,
    vibrato: 0,
    overdrive: 0,
  };

  // History for Undo/Redo
  const MAX_HISTORY_STATES = 50;
  let history = [{}]; // Start with an initial empty state
  let historyIndex = 0;

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
  const sequencerViewport = document.getElementById('sequencer-grid-viewport');
  const sequencerGrid = document.getElementById('sequencer-grid');
  const volumeSlider = document.getElementById('volume-slider');
  const waveButtons = document.querySelectorAll('.wave-btn');

  // UI callback functions
  function onUIConnected() {
    log.info('Connected to server');
    ui.send_message('composer:get_state', {});
  }

  function onComposerState(data) {
    log.info('Received state from server:', JSON.stringify(data));

    const nextNotes = Array.isArray(data.notes) ? data.notes : [];
    const hadRenderedGrid = sequencerViewport.dataset.ready === 'true';
    const notesChanged =
      nextNotes.length > 0 &&
      (nextNotes.length !== notes.length || nextNotes.some((note, index) => note !== notes[index]));

    if (notesChanged) {
      notes = nextNotes.slice();
    }

    if (data.grid) {
      grid = data.grid;
    }

    // On first state, reset history to this state as the source of truth
    if (!isAppInitialized) {
      log.info('First state received, resetting history.');
      history = [JSON.parse(JSON.stringify(grid))];
      historyIndex = 0;
      updateUndoRedoButtons();
      isAppInitialized = true;
    }

    if (data.bpm !== undefined) {
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

    if ((notes.length > 0 && notesChanged) || (notes.length > 0 && !hadRenderedGrid)) {
      buildGrid({ preserveScroll: hadRenderedGrid, scrollToDefault: !hadRenderedGrid });
    }

    renderGrid();
    updateEffectsKnobs();
  }

  function onComposerStepPlaying(data) {
    // Backend callback - used only for synchronization check, not for UI updates
    log.debug('Backend step playing:', data.step, '(frontend is handling UI timing locally)');
  }

  function onComposerPlaybackEnded() {
    // Backend signals sequence generation complete (but audio still in queue)
    // Don't stop UI animation - it runs on its own timer until effectiveLength
    log.info('Backend sequence generation complete (audio still playing from queue)');
  }

  function onComposerExportData(data) {
    log.info('Export data received');
    const blob = new Blob([data.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || 'composition.h';
    a.click();
    URL.revokeObjectURL(url);
  }

  // History management
  function saveStateToHistory() {
    // If we have undone, and now we make a new change,
    // we need to discard the 'redo' history.
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }

    // Add new state
    history.push(JSON.parse(JSON.stringify(grid)));

    // Limit history size
    if (history.length > MAX_HISTORY_STATES) {
      history.shift();
    }

    historyIndex = history.length - 1;
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      grid = JSON.parse(JSON.stringify(history[historyIndex]));
      renderGrid();
      ui.send_message('composer:update_grid', { grid });
      updateUndoRedoButtons();
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      grid = JSON.parse(JSON.stringify(history[historyIndex]));
      renderGrid();
      ui.send_message('composer:update_grid', { grid });
      updateUndoRedoButtons();
    }
  }

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  function getEffectiveSequenceLength() {
    return Math.max(sequenceLength || 0, findLastNoteStep() + 1, 16);
  }

  function scrollToDefaultNote() {
    const defaultNoteIndex = notes.indexOf(DEFAULT_VISIBLE_TOP_NOTE);
    if (defaultNoteIndex < 0) {
      return;
    }

    const referenceCell = sequencerGrid.querySelector(
      `.grid-cell[data-note="${defaultNoteIndex}"][data-step="0"]`
    );
    if (!referenceCell) {
      return;
    }

    sequencerViewport.scrollTop = Math.max(0, referenceCell.offsetTop - 8);
  }

  function scrollStepIntoView(step) {
    const referenceCell =
      sequencerGrid.querySelector(`.grid-cell[data-note="0"][data-step="${step}"]`) ||
      sequencerGrid.querySelector(`.grid-cell[data-step="${step}"]`);

    if (!referenceCell) {
      return;
    }

    const targetScroll =
      referenceCell.offsetLeft - (sequencerViewport.clientWidth - referenceCell.offsetWidth) / 2;
    sequencerViewport.scrollLeft = Math.max(0, targetScroll);
  }

  // Build grid with dynamic size
  function buildGrid({ preserveScroll = true, scrollToDefault = false } = {}) {
    if (!notes.length) {
      return;
    }

    const previousScrollLeft = preserveScroll ? sequencerViewport.scrollLeft : 0;
    const previousScrollTop = preserveScroll ? sequencerViewport.scrollTop : 0;

    sequencerGrid.innerHTML = '';

    // Top-left corner (empty)
    const corner = document.createElement('div');
    corner.className = 'grid-corner';
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
    notes.forEach((note, noteIndex) => {
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
    sequencerGrid.style.gridTemplateColumns = `var(--note-label-width) repeat(${totalSteps}, var(--grid-track-size))`;
    sequencerViewport.dataset.ready = 'true';

    requestAnimationFrame(() => {
      if (preserveScroll) {
        sequencerViewport.scrollLeft = previousScrollLeft;
        sequencerViewport.scrollTop = previousScrollTop;
        return;
      }

      if (scrollToDefault) {
        scrollToDefaultNote();
      }
    });
  }

  function toggleCell(noteIndex, step) {
    const noteKey = String(noteIndex);
    const stepKey = String(step);
    if (!grid[noteKey]) grid[noteKey] = {};

    // Explicit toggle: if undefined or false, set to true; if true, set to false
    const currentValue = grid[noteKey][stepKey] === true;
    const newValue = !currentValue;
    grid[noteKey][stepKey] = newValue;

    log.info(`Toggle cell [${notes[noteIndex]}][step ${step}]: ${currentValue} -> ${newValue}`);

    saveStateToHistory();

    // Expand grid if clicking near the end
    if (newValue) {
      expandGridIfNeeded();
    }

    renderGrid();
    ui.send_message('composer:update_grid', { grid });
  }

  function renderGrid() {
    if (grid === null) {
      return;
    }
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      const noteKey = String(cell.dataset.note);
      const stepKey = String(cell.dataset.step);
      const isActive = grid[noteKey] && grid[noteKey][stepKey] === true;

      cell.classList.remove('active');
      if (isActive) {
        cell.classList.add('active');
      }
    });
  }

  function highlightStep(step) {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      const cellStep = parseInt(cell.dataset.step);
      cell.classList.toggle('playing', cellStep === step);
    });

    // Auto-scroll to keep current step visible
    if (step >= 0) {
      scrollStepIntoView(step);
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
            if (stepNum > lastStep) {
              lastStep = stepNum;
            }
          }
        });
      });
    }
    return lastStep;
  }

  function expandGridIfNeeded() {
    const lastNote = findLastNoteStep();
    // Expand if we're within 8 steps of the edge
    if (lastNote >= totalSteps - 8) {
      totalSteps += STEPS_PER_EXPAND;
      buildGrid({ preserveScroll: true });
      renderGrid();
      log.info('Grid expanded to', totalSteps, 'steps');
    }
  }

  function startLocalPlayback() {
    // Keep UI playback aligned with the actual generated sequence length.
    const effectiveLength = getEffectiveSequenceLength();

    // Calculate step duration in milliseconds for 16th notes (4 per beat)
    const stepDurationMs = 60000 / bpm / 4;

    currentStep = 0;
    highlightStep(currentStep);

    playInterval = setInterval(() => {
      currentStep++;
      if (currentStep >= effectiveLength) {
        stopLocalPlayback();
        return;
      }
      highlightStep(currentStep);
    }, stepDurationMs);
  }

  function stopLocalPlayback() {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    isPaused = false;
    playBtn.style.display = 'flex';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    highlightStep(-1);
  }

  // Play button - starts from beginning or resumes from pause
  playBtn.addEventListener('click', () => {
    playBtn.style.display = 'none';
    pauseBtn.style.display = 'flex';
    stopBtn.style.display = 'flex';
    log.info(isPaused ? 'Resuming playback' : 'Starting playback at', bpm, 'BPM');

    // Start local UI animation immediately
    startLocalPlayback();

    // Trigger backend audio playback
    ui.send_message('composer:play', { grid, bpm });
  });

  // Pause button - for infinite loop we only have stop (pause not supported with loop=True)
  pauseBtn.addEventListener('click', () => {
    stopLocalPlayback();
    log.info('Stopping playback (pause not supported in infinite loop mode)');
    ui.send_message('composer:stop', {});
  });

  // Stop button - resets to beginning, clears highlight
  stopBtn.addEventListener('click', () => {
    stopLocalPlayback();
    log.info('Stopping playback');
    ui.send_message('composer:stop', {});
  });

  // BPM controls
  bpmInput.addEventListener('change', () => {
    bpm = parseInt(bpmInput.value);
    log.info('BPM changed to:', bpm);
    ui.send_message('composer:set_bpm', { bpm });
  });

  resetBpmBtn.addEventListener('click', () => {
    bpm = 120;
    bpmInput.value = bpm;
    log.info('BPM reset to 120');
    ui.send_message('composer:set_bpm', { bpm });
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all notes?')) {
      grid = {};
      notes.forEach((note, noteIndex) => {
        const noteKey = String(noteIndex);
        grid[noteKey] = {};
      });
      saveStateToHistory();
      renderGrid();
      ui.send_message('composer:update_grid', { grid });
    }
  });

  // Export button
  exportBtn.addEventListener('click', () => {
    ui.send_message('composer:export', { grid });
  });

  // Wave buttons
  waveButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      waveButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const wave = btn.dataset.wave;
      ui.send_message('composer:set_waveform', { waveform: wave });
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
    ui.send_message('composer:set_volume', { volume });
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
      ui.send_message('composer:set_effects', { effects });
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
  updateEffectsKnobs();
  updateUndoRedoButtons();

  // Ensure play button is visible and stop button is hidden on load
  playBtn.style.display = 'flex';
  stopBtn.style.display = 'none';
  log.info('Sequencer UI ready, waiting for server state...');
})();
