// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

// Simple frontend for 8x13 clickable grid
const gridEl = document.getElementById('grid');
const vectorEl = document.getElementById('vector');
const exportBtn = document.getElementById('export');
const playAnimationBtn = document.getElementById('play-animation');
const stopAnimationBtn = document.getElementById('stop-animation');
const clearBtn = document.getElementById('clear');
const invertBtn = document.getElementById('invert');
const rotate180Btn = document.getElementById('rotate180');
const flipHBtn = document.getElementById('flip-h');
const flipVBtn = document.getElementById('flip-v');
const frameTitle = document.getElementById('frame-title');
const frameBackBtn = document.getElementById('frame-back');
const frameForwardBtn = document.getElementById('frame-forward');

function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

function hideError() {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
  }
}

async function fetchWithHandling(url, options, responseType = 'json', context = 'performing operation') {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    hideError(); // Hide error on successful communication

    if (responseType === 'json') {
      return await response.json();
    } else if (responseType === 'blob') {
      return await response.blob();
    } else if (responseType === 'text') {
        return await response.text();
    }
    return response;
  } catch (error) {
    showError(`Failed to ${context}: ${error.message}`);
    throw error; // Re-throw to allow specific handlers to catch it if needed
  }
}

const codePanelToggle = document.getElementById('code-panel-toggle');
const codePanel = document.querySelector('.controls-section-right');
if (codePanelToggle && codePanel) {
  codePanelToggle.addEventListener('change', () => {
    codePanel.style.display = codePanelToggle.checked ? 'flex' : 'none';
  });
  // set initial state
  codePanel.style.display = codePanelToggle.checked ? 'flex' : 'none';
}

const ROWS = 8, COLS = 13;
let BRIGHTNESS_LEVELS = 8;
let cells = [];
let sessionFrames = [];
let loadedFrameId = null; // ID of the frame currently loaded in editor
let loadedFrame = null; // Full frame object currently loaded

// Auto-persist timer (unified: board + DB together)
let persistTimeout = null;
const AUTO_PERSIST_DELAY_MS = 150; // 150ms unified delay

async function loadConfig(brightnessSlider, brightnessValue){
  try{
    const data = await fetchWithHandling('/config', {}, 'json', 'load config');
    if(typeof data.brightness_levels === 'number' && data.brightness_levels >= 2){
      BRIGHTNESS_LEVELS = data.brightness_levels;
    }
  }catch(err){
    console.warn('[ui] unable to load config; using defaults', err);
  }
  const maxValue = Math.max(0, BRIGHTNESS_LEVELS - 1);
  if(brightnessSlider){
    brightnessSlider.max = String(maxValue);
    if(parseInt(brightnessSlider.value || '0') > maxValue){
      brightnessSlider.value = String(maxValue);
    }
  }
  if(brightnessValue){
    const current = brightnessSlider ? parseInt(brightnessSlider.value) : maxValue;
    brightnessValue.textContent = String(Math.min(current, maxValue));
  }
}

function clampBrightness(v){
  if(Number.isNaN(v) || v < 0) return 0;
  const maxValue = Math.max(0, BRIGHTNESS_LEVELS - 1);
  return Math.min(v, maxValue);
}

function collectGridBrightness(){
  const grid = [];
  for(let r=0;r<ROWS;r++){
    const row = [];
    for(let c=0;c<COLS;c++){
      const idx = r*COLS + c;
      const raw = cells[idx].dataset.b ? parseInt(cells[idx].dataset.b) : 0;
      row.push(clampBrightness(raw));
    }
    grid.push(row);
  }
  return grid;
}

function updateArrowButtonsState() {
    if (!frameBackBtn || !frameForwardBtn) return;
    if (!loadedFrameId) {
        frameBackBtn.disabled = true;
        frameForwardBtn.disabled = true;
        return;
    }

    const currentIndex = sessionFrames.findIndex(f => f.id === loadedFrameId);
    if (currentIndex === -1) {
        frameBackBtn.disabled = true;
        frameForwardBtn.disabled = true;
        return;
    }

    frameBackBtn.disabled = currentIndex === 0;
    frameForwardBtn.disabled = currentIndex === sessionFrames.length - 1;
}

function markLoaded(frame){
  const oldFrameId = loadedFrameId; // Store the old ID
  
  // Remove marker from the old frame
  if(oldFrameId !== null){
    const prev = document.querySelector(`#frames [data-id='${oldFrameId}']`);
    if(prev) {
      prev.classList.remove('loaded');
      prev.classList.remove('selected');
    }
  }
  
  // Update the global state
  loadedFrameId = frame ? frame.id : null;
  loadedFrame = frame;
  
  // Add marker to the new frame
  if(frame && frame.id){
    try{
      const el = document.querySelector(`#frames [data-id='${frame.id}']`);
      if(el) {
        el.classList.add('loaded');
        el.classList.add('selected');
      }
    }catch(e){/* ignore */}
  }
  updateArrowButtonsState();
}

function clearLoaded(){
  if(loadedFrameId === null) return;
  const prev = document.querySelector(`#frames [data-id='${loadedFrameId}']`);
  if(prev) {
    prev.classList.remove('loaded');
    prev.classList.remove('selected');
  }
  loadedFrameId = null;
  loadedFrame = null;
  updateArrowButtonsState();
}

function makeGrid(){
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r; el.dataset.c = c;
      gridEl.appendChild(el);
      cells.push(el);
    }
  }
}



// Unified persist: save to DB and update board together
function schedulePersist(){
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(()=> {
    persistFrame();
    persistTimeout = null;
  }, AUTO_PERSIST_DELAY_MS);
}

async function persistFrame(){
  const grid = collectGridBrightness();
  // Backend is responsible for naming - send empty if no value
  const frameName = (loadedFrame && loadedFrame.name) || '';
  const duration_ms = (loadedFrame && loadedFrame.duration_ms) || 1000;
  
  // Build payload with ID if we're updating an existing frame
  const payload = {
    rows: grid,
    name: frameName,
    duration_ms: duration_ms,
    brightness_levels: BRIGHTNESS_LEVELS
  };
  
  if (loadedFrame && loadedFrame.id) {
    payload.id = loadedFrame.id;
    payload.position = loadedFrame.position;
  }
  
  console.debug('[ui] persistFrame (save to DB + update board)', payload);

  try {
    const data = await fetchWithHandling('/persist_frame', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    }, 'json', 'persist frame');

    if (data && data.ok && data.frame) {
      // Update loaded frame reference
      loadedFrame = data.frame;
      loadedFrameId = data.frame.id;
      // Show vector text
      if (data.vector) showVectorText(data.vector);
      // Refresh frames list to show updated version
      refreshFrames();
      console.debug('[ui] frame persisted:', data.frame.id);
    }
  } catch (err) {
    console.warn('[ui] persistFrame failed', err);
  }
}

function sendUpdateFromGrid(){
  // Legacy function - now calls schedulePersist
  schedulePersist();
}

function getRows13(){
  const rows = [];
  for(let r=0;r<ROWS;r++){
    let s = '';
    for(let c=0;c<COLS;c++){
      const idx = r*COLS + c;
      s += cells[idx].classList.contains('on') ? '1' : '0';
    }
    rows.push(s);
  }
  return rows;
}

function showHeader(h){ showVectorText(h); }

function showVectorText(txt){
  if(!vectorEl) return;
  vectorEl.textContent = txt || '';
}

// Initialize editor: load last frame or create empty
async function initEditor(){
  try {
    const data = await fetchWithHandling('/load_frame', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({}) // no id = load last or create empty
    }, 'json', 'load initial frame');
    
    if (data && data.ok && data.frame) {
      const frame = data.frame;
      
      // Populate grid
      setGridFromRows(frame.rows || []);
      
      // Populate name input
      if (frameTitle) frameTitle.textContent = frame.name || `Frame ${frame.id}`;
      
      // Show C vector representation
      if (data.vector) {
        showVectorText(data.vector);
      }
      
      // Mark as loaded in sidebar
      markLoaded(frame);
      
      console.debug('[ui] initEditor loaded frame:', frame.id);
    }
  } catch (err) {
    console.warn('[ui] initEditor failed', err);
  }
}

async function exportH(){
  exportBtn.disabled = true;
  try {
    const animName = animNameInput && animNameInput.value && animNameInput.value.trim() ? animNameInput.value.trim() : 'Animation';
    const filename = (animName || 'Animation') + '.h';
    const frameIds = sessionFrames.map(f => f.id);
    const payload = { frames: frameIds, animations: [{name: animName, frames: frameIds}] };

    console.debug('[ui] exportH payload', payload);
    const data = await fetchWithHandling('/export_frames', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}, 'json', 'export animation');

    if (data && data.header) {
      const blob = new Blob([data.header], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    // Error is already shown by fetchWithHandling
    console.error('[ui] exportH failed', err);
  } finally {
    exportBtn.disabled = false;
  }
}

makeGrid();
if (exportBtn) exportBtn.addEventListener('click', exportH); else console.warn('[ui] export button not found');

let animationTimeout = null;

function displayFrame(frame) {
  if (!frame) return;

  // Populate grid
  setGridFromRows(frame.rows || []);
  
  // Populate name input
  if (frameTitle) frameTitle.textContent = frame.name || `Frame ${frame.id}`;

  // Mark as loaded in sidebar
  markLoaded(frame);
}

async function playAnimation() {
  if (!playAnimationBtn) return;
  
  // Stop any previous animation loop
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }

  try {
    playAnimationBtn.disabled = true;
    const frameIds = sessionFrames.map(f => f.id);
    if (frameIds.length === 0) {
      showError('No frames to play');
      playAnimationBtn.disabled = false; // re-enable button
      return;
    }
    
    console.debug(`[ui] playAnimation, frameIds=`, frameIds);
    
    const payload = {
      frames: frameIds,
      loop: false
    };
    
    const data = await fetchWithHandling('/play_animation', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }, 'json', 'play animation');
    
    if (data.error) {
      showError('Error: ' + data.error);
      playAnimationBtn.disabled = false;
    } else {
      console.debug('[ui] Animation played successfully, frames=', data.frames_played);
      showVectorText('Animation played: ' + data.frames_played + ' frames');

      // Start frontend animation simulation
      let currentFrameIndex = 0;
      const animateNextFrame = () => {
        if (currentFrameIndex >= sessionFrames.length) {
          // Animation finished
          playAnimationBtn.disabled = false;
          animationTimeout = null;
          return;
        }

        const frame = sessionFrames[currentFrameIndex];
        displayFrame(frame);
        
        const duration = frame.duration_ms || 1000;
        currentFrameIndex++;
        
        animationTimeout = setTimeout(animateNextFrame, duration);
      };
      animateNextFrame();
    }

  } catch (err) {
    console.error('[ui] playAnimation failed', err);
    playAnimationBtn.disabled = false; // re-enable on error
  }
}

if (playAnimationBtn) playAnimationBtn.addEventListener('click', playAnimation); else console.warn('[ui] play animation button not found');

if (stopAnimationBtn) {
  stopAnimationBtn.addEventListener('click', () => {
    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
      playAnimationBtn.disabled = false;
      showVectorText('Animation stopped');
    }
  });
}

if (frameForwardBtn) {
    frameForwardBtn.addEventListener('click', () => {
        if (!loadedFrameId) return;
        const currentIndex = sessionFrames.findIndex(f => f.id === loadedFrameId);
        if (currentIndex < sessionFrames.length - 1) {
            const nextFrame = sessionFrames[currentIndex + 1];
            loadFrameIntoEditor(nextFrame.id);
        }
    });
}

if (frameBackBtn) {
    frameBackBtn.addEventListener('click', () => {
        if (!loadedFrameId) return;
        const currentIndex = sessionFrames.findIndex(f => f.id === loadedFrameId);
        if (currentIndex > 0) {
            const prevFrame = sessionFrames[currentIndex - 1];
            loadFrameIntoEditor(prevFrame.id);
        }
    });
}

// Save frame button removed - auto-persist replaces it
const animControls = document.getElementById('anim-controls');
const animNameInput = document.getElementById('anim-name');
// set default placeholder and default value
if (animNameInput) {
  animNameInput.placeholder = 'Animation name (optional)';
  animNameInput.value = 'Animation';
}

// Enforce simple C-identifier rule on name inputs for exported symbols.
function normalizeSymbolInput(s){
  if(!s) return '';
  // Replace invalid chars with '_', and remove leading digits by prefixing 'f_'
  let cand = '';
  for(const ch of s){
    if(/[A-Za-z0-9_]/.test(ch)) cand += ch; else cand += '_';
  }
  if(/^[0-9]/.test(cand)) cand = 'f_' + cand;
  return cand;
}



if(animNameInput){
  animNameInput.addEventListener('blur', ()=>{
    animNameInput.value = normalizeSymbolInput(animNameInput.value.trim()) || '';
  });
}

// Save frame button removed - using auto-persist instead

async function refreshFrames(){
  try{
    const data = await fetchWithHandling('/list_frames', {}, 'json', 'refresh frames');
    sessionFrames = data.frames || [];
    renderFrames();
    
    // Re-apply loaded state after rendering
    if(loadedFrameId !== null && loadedFrame !== null){
        const el = document.querySelector(`#frames [data-id='${loadedFrameId}']`);
        if(el) {
            el.classList.add('loaded');
            el.classList.add('selected');
        }
    }
    updateArrowButtonsState();
  }catch(e){ console.warn(e) }
}

// Function to make a text element editable on double-click
function createEditableField(element, onSave) {
  element.addEventListener('dblclick', () => {
    const originalValue = element.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalValue.replace(/ ms$/, ''); // Remove ' ms' for duration
    
    // Replace element with input
    element.style.display = 'none';
    element.parentNode.insertBefore(input, element);
    input.focus();

    const saveAndRevert = () => {
      const newValue = input.value.trim();
      input.remove();
      element.style.display = '';
      // Only save if the value has changed
      if (newValue && newValue !== originalValue.replace(/ ms$/, '')) {
        onSave(newValue);
      } else {
        element.textContent = originalValue; // Revert to original if empty or unchanged
      }
    };

    input.addEventListener('blur', saveAndRevert);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur(); // Trigger blur to save
      } else if (e.key === 'Escape') {
        input.remove();
        element.style.display = ''; // Cancel editing
      }
    });
  });
}

function renderFrames(){
  const container = document.getElementById('frames');
  container.innerHTML = '';
  sessionFrames.forEach(f => {
    const item = document.createElement('div'); item.className = 'frame-item'; item.draggable = true; item.dataset.id = f.id;
    const thumb = document.createElement('div'); thumb.className = 'frame-thumb';
    // render a tiny grid by mapping the rows into colored blocks
    const rows = f.rows || [];
    for(let r=0;r<ROWS;r++){
      const row = rows[r];
      for(let c=0;c<COLS;c++){
        let isOn = false;
        if (Array.isArray(row)) {
          isOn = (row[c] || 0) > 0;
        } else if (typeof row === 'string') {
          isOn = row[c] === '1';
        }
        const dot = document.createElement('div'); dot.style.background = isOn ? '#3CE2FF' : 'transparent'; thumb.appendChild(dot);
      }
    }
    const name = document.createElement('div'); name.className = 'frame-name'; name.textContent = f.name || ('Frame ' + f.id);
    const duration = document.createElement('div'); duration.className = 'frame-duration'; duration.textContent = `${f.duration_ms || 1000} ms`;
    
    // Make name and duration editable
    createEditableField(name, (newName) => {
      const rows = (f.id === loadedFrameId) ? collectGridBrightness() : f.rows;
      fetchWithHandling('/persist_frame', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: f.id, name: newName, duration_ms: f.duration_ms, rows: rows })
      }).then(() => refreshFrames());
    });
    
    createEditableField(duration, (newDuration) => {
      const durationMs = parseInt(newDuration, 10);
      if (!isNaN(durationMs)) {
        const rows = (f.id === loadedFrameId) ? collectGridBrightness() : f.rows;
        fetchWithHandling('/persist_frame', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ id: f.id, name: f.name, duration_ms: durationMs, rows: rows })
        }).then(() => refreshFrames());
      }
    });

    // NEW CLICK LOGIC: Single-select and load
    item.addEventListener('click', (e)=>{
      // Don't do anything if clicking inside an input field during editing
      if (e.target.tagName === 'INPUT') return;
      
      // If it's already selected, do nothing
      if (loadedFrameId === f.id) return;

      loadFrameIntoEditor(f.id); // This function already handles setting loadedFrameId and adding the .loaded class
    });

    // drag/drop handlers
    item.addEventListener('dragstart', (ev)=>{ ev.dataTransfer.setData('text/plain', f.id); item.classList.add('dragging'); });
    item.addEventListener('dragend', ()=>{ item.classList.remove('dragging'); });
    item.addEventListener('dragover', (ev)=>{ ev.preventDefault(); item.classList.add('dragover'); });
    item.addEventListener('dragleave', ()=>{ item.classList.remove('dragover'); });
    item.addEventListener('drop', async (ev)=>{
      ev.preventDefault(); item.classList.remove('dragover');
      const draggedId = parseInt(ev.dataTransfer.getData('text/plain'));
      const draggedEl = container.querySelector(`[data-id='${draggedId}']`);
      if(draggedEl && draggedEl !== item){
        const rect = item.getBoundingClientRect();
        const mouseY = ev.clientY;
        const itemMiddle = rect.top + rect.height / 2;
        if (mouseY < itemMiddle) {
          container.insertBefore(draggedEl, item);
        } else {
          container.insertBefore(draggedEl, item.nextSibling);
        }
        const order = Array.from(container.children).map(ch => parseInt(ch.dataset.id)).filter(id => !isNaN(id));
        await fetchWithHandling('/reorder_frames', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({order})}, 'json', 'reorder frames');
        await refreshFrames();
      }
    });
    
    item.appendChild(thumb); item.appendChild(name); item.appendChild(duration);
    
    container.appendChild(item);
  });

  // Add the "Add Frame" button at the end of the list
  const newFrameBtn = document.createElement('button');
  newFrameBtn.className = 'add-frame-btn';
  newFrameBtn.title = 'Create new frame';
  newFrameBtn.innerHTML = '<img src="img/add.svg" alt="Add Frame">';
  newFrameBtn.addEventListener('click', handleNewFrameClick);
  container.appendChild(newFrameBtn);
}

// 'save-anim' button functionality has been removed as it is no longer part of the UI.

// Mode toggle handling removed

// Transform button handlers
async function transformFrame(op) {
  console.debug(`[ui] ${op} button clicked (delegating to server)`);
  const grid = collectGridBrightness();
  try {
    const data = await fetchWithHandling('/transform_frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op,
        rows: grid,
        brightness_levels: BRIGHTNESS_LEVELS
      })
    }, 'json', `transform frame (${op})`);

    if (data && data.ok && data.frame) {
      setGridFromRows(data.frame.rows);
      if (data.vector) showVectorText(data.vector);
      schedulePersist();
    }
  } catch (e) {
    console.warn(`[ui] ${op} failed`, e);
  }
}

if (rotate180Btn) {
  rotate180Btn.addEventListener('click', () => transformFrame('rotate180'));
}
if (flipHBtn) {
  flipHBtn.addEventListener('click', () => transformFrame('flip_h'));
}
if (flipVBtn) {
  flipVBtn.addEventListener('click', () => transformFrame('flip_v'));
}
if (invertBtn) {
  invertBtn.addEventListener('click', () => transformFrame('invert'));
}
const invertNotNullBtn = document.getElementById('invert-not-null');
if (invertNotNullBtn) {
  invertNotNullBtn.addEventListener('click', () => transformFrame('invert_not_null'));
}

async function loadFrameIntoEditor(id){
  try {
    const data = await fetchWithHandling('/load_frame', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id})
    }, 'json', `load frame ${id}`);
    
    if(data && data.ok && data.frame){
      const f = data.frame;
      
      // Populate grid
      setGridFromRows(f.rows || []);
      
      // Populate name input
      if(frameTitle) frameTitle.textContent = f.name || `Frame ${f.id}`;
      
      // Mark as loaded in sidebar
      markLoaded(f);
      
      // Show C vector representation (backend already sends it via load_frame)
      if (data.vector) {
        showVectorText(data.vector);
      }
      
      console.debug('[ui] loaded frame into editor:', id);
    }
  } catch(err) {
    console.warn('[ui] loadFrameIntoEditor failed', err);
  }
}

function setGridFromRows(rows){
  // rows: either list[list[int]] or list[str]
  for(let r=0;r<ROWS;r++){
    const row = rows[r];
    for(let c=0;c<COLS;c++){
      const idx = r*COLS + c;
      if (Array.isArray(row)) {
        const v = clampBrightness(row[c] ?? 0);
        if (v > 0) { cells[idx].classList.add('on'); cells[idx].dataset.b = String(v); } else { cells[idx].classList.remove('on'); delete cells[idx].dataset.b; }
      } else {
        const s = (row || '').padEnd(COLS,'0');
        if(s[c] === '1') { cells[idx].classList.add('on'); cells[idx].dataset.b = String(Math.max(0, BRIGHTNESS_LEVELS - 1)); } else { cells[idx].classList.remove('on'); delete cells[idx].dataset.b; }
      }
    }
  }
}



async function deleteFrame(id){
  await fetchWithHandling('/delete_frame', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id})}, 'json', `delete frame ${id}`);
}

async function handleNewFrameClick() {
  console.debug('[ui] new frame button clicked');
  
  // Clear editor
  cells.forEach(c => { c.classList.remove('on'); delete c.dataset.b; });
  showVectorText('');
  
  // Clear loaded frame reference (we're creating new)
  clearLoaded();
  
  // Create empty frame in DB (no name = backend assigns progressive name)
  const grid = collectGridBrightness(); // all zeros
  try {
    const data = await fetchWithHandling('/persist_frame', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        rows: grid,
        name: '', // empty name = backend will assign Frame {id}
        duration_ms: 1000,
        brightness_levels: BRIGHTNESS_LEVELS
      })
    }, 'json', 'create new frame');
    
    if (data && data.ok && data.frame) {
      // Set name to the backend-assigned name (Frame {id})
      if(frameTitle) frameTitle.textContent = data.frame.name || `Frame ${data.frame.id}`;
      
      // Show C vector representation
      if (data.vector) {
        showVectorText(data.vector);
      }
      
      // Refresh frames list
      await refreshFrames();
      
      // Mark as loaded
      markLoaded(data.frame);
      
      console.debug('[ui] new frame created:', data.frame.id);
    }
  } catch(err) {
    console.warn('[ui] failed to create new frame', err);
  }
}

// Initialize editor on page load
initEditor();
refreshFrames();

if (clearBtn) {
  clearBtn.addEventListener('click', ()=>{
    console.debug('[ui] clear button clicked');
    cells.forEach(c => { c.classList.remove('on'); delete c.dataset.b; });
    showVectorText('');
    schedulePersist();
  });
} else {
  console.warn('[ui] clear button not found');
}

// 'save-anim' button functionality has been removed as it is no longer part of the UI.

document.addEventListener('DOMContentLoaded', () => {
  let selectedTool = 'brush';
  gridEl.dataset.tool = selectedTool;

  const customSelect = document.querySelector('.custom-select');
  if (customSelect) {
    const trigger = customSelect.querySelector('.custom-select__trigger');
    const options = customSelect.querySelectorAll('.custom-option');
    const triggerSvg = trigger.querySelector('svg.tool-icon');
    
    trigger.addEventListener('click', () => {
      customSelect.classList.toggle('open');
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        const svg = option.querySelector('svg.tool-icon');
        
        triggerSvg.innerHTML = svg.innerHTML;
        customSelect.classList.remove('open');

        selectedTool = value;
        gridEl.dataset.tool = selectedTool;
        console.log('Selected tool:', value);
      });
    });

    window.addEventListener('click', (e) => {
      if (!customSelect.contains(e.target)) {
        customSelect.classList.remove('open');
      }
    });
  }

  /* Brightness Alpha Slider */
  const brightnessAlphaSlider = document.getElementById('brightness-alpha-slider');
  const brightnessAlphaValue = document.getElementById('brightness-alpha-value');

  if (brightnessAlphaSlider && brightnessAlphaValue) {
    brightnessAlphaSlider.addEventListener('input', () => {
      brightnessAlphaValue.textContent = brightnessAlphaSlider.value;
    });
  }

  loadConfig(brightnessAlphaSlider, brightnessAlphaValue);

  let isDrawing = false;

  function draw(e) {
    if (!e.target.classList.contains('cell')) return;

    const cell = e.target;
    if (selectedTool === 'brush') {
      const brightness = brightnessAlphaSlider.value;
      cell.dataset.b = brightness;
    } else if (selectedTool === 'eraser') {
      delete cell.dataset.b;
    }
  }

  gridEl.addEventListener('mousedown', (e) => {
    isDrawing = true;
    draw(e);
  });

  gridEl.addEventListener('mousemove', (e) => {
    if (isDrawing) {
      draw(e);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      schedulePersist();
    }
  });

  gridEl.addEventListener('mouseleave', () => {
    if (isDrawing) {
      isDrawing = false;
      schedulePersist();
    }
  });
});
// --- Option Buttons Functionality ---
const copyAnimBtn = document.getElementById('copy-anim');
const deleteAnimBtn = document.getElementById('delete-anim');
const durationAnimBtn = document.getElementById('duration-anim');
const durationModal = document.getElementById('duration-modal');
const closeModalBtn = document.querySelector('#duration-modal .close-button');
const applyDurationBtn = document.getElementById('apply-duration');
const allFramesDurationInput = document.getElementById('all-frames-duration');

if (copyAnimBtn) {
  copyAnimBtn.addEventListener('click', async () => {
    if (loadedFrameId === null) {
      showError('Please select a frame to copy.');
      setTimeout(hideError, 3000);
      return;
    }
    
    try {
      const frameToCopy = loadedFrame;
      const newFramePayload = {
        name: `${frameToCopy.name} (copy)`,
        rows: frameToCopy.rows,
        duration_ms: frameToCopy.duration_ms,
        brightness_levels: frameToCopy.brightness_levels
      };
      await fetchWithHandling('/persist_frame', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newFramePayload)
      }, 'json', 'create copied frame');
    } catch (err) {
      console.error(`[ui] Failed to copy frame ${loadedFrameId}`, err);
    }
    
    await refreshFrames();
  });
}

if (deleteAnimBtn) {
  deleteAnimBtn.addEventListener('click', async () => {
    if (loadedFrameId === null) {
      showError('Please select a frame to delete.');
      setTimeout(hideError, 3000);
      return;
    }
    
    const idToDelete = loadedFrameId;
    await deleteFrame(idToDelete);
    
    clearLoaded();
    await refreshFrames();
    
    const frameToLoad = sessionFrames.find(f => f.id !== idToDelete) || (sessionFrames.length > 0 ? sessionFrames[0] : null);

    if (frameToLoad) {
      await loadFrameIntoEditor(frameToLoad.id);
    } else {
      // If no frames are left, initEditor will create a new empty one
      await initEditor();
    }
  });
}

if (durationAnimBtn) {
  durationAnimBtn.addEventListener('click', () => {
    durationModal.style.display = 'block';
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    durationModal.style.display = 'none';
  });
}

// Close modal if user clicks outside of it
window.addEventListener('click', (event) => {
  if (event.target == durationModal) {
    durationModal.style.display = 'none';
  }
});

if (applyDurationBtn) {
  applyDurationBtn.addEventListener('click', async () => {
    const newDuration = parseInt(allFramesDurationInput.value, 10);
    if (isNaN(newDuration) || newDuration < 0) {
      showError('Please enter a valid, non-negative duration.');
      setTimeout(hideError, 3000);
      return;
    }

    durationModal.style.display = 'none';

    const updatePromises = sessionFrames.map(frame => {
      const fullFrame = sessionFrames.find(f => f.id === frame.id);
      if (fullFrame) {
        const payload = { ...fullFrame, duration_ms: newDuration };
        return fetchWithHandling('/persist_frame', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }, 'json', `update duration for frame ${frame.id}`).catch(err => {
          console.error(`[ui] Failed to update duration for frame ${frame.id}`, err);
          return Promise.resolve(); 
        });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);
    await refreshFrames();
  });
}