// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

// Simple frontend for 8x13 clickable grid
const gridEl = document.getElementById('grid');
const vectorEl = document.getElementById('vector');
const exportBtn = document.getElementById('export');
const playAnimationBtn = document.getElementById('play-animation');
const nameInput = document.getElementById('name');
const clearBtn = document.getElementById('clear');
const invertBtn = document.getElementById('invert');
const rotate180Btn = document.getElementById('rotate180');
const flipHBtn = document.getElementById('flip-h');
const flipVBtn = document.getElementById('flip-v');
const frameTitle = document.getElementById('frame-title');

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
let selectedFrameId = null;
let loadedFrameId = null; // ID of the frame currently loaded in editor
let loadedFrame = null; // Full frame object currently loaded
let selectedIds = new Set(); // persistent selection of frame ids (survives refreshFrames)

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

function markLoaded(frame){
  // Remove existing loaded marker
  if(loadedFrameId !== null){
    const prev = document.querySelector(`#frames [data-id='${loadedFrameId}']`);
    if(prev) prev.classList.remove('loaded');
  }
  loadedFrameId = frame ? frame.id : null;
  loadedFrame = frame;
  
  if(frame && frame.id){
    try{
      const el = document.querySelector(`#frames [data-id='${frame.id}']`);
      if(el) el.classList.add('loaded');
    }catch(e){/* ignore */}
  }
}

function clearLoaded(){
  if(loadedFrameId === null) return;
  const prev = document.querySelector(`#frames [data-id='${loadedFrameId}']`);
  if(prev) prev.classList.remove('loaded');
  loadedFrameId = null;
  loadedFrame = null;
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
  const frameName = nameInput.value.trim() || (loadedFrame && loadedFrame.name) || '';
  const duration_ms = durationInput && durationInput.value ? parseInt(durationInput.value) : 1000;
  
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
      loadedFrame = frame;
      loadedFrameId = frame.id;
      
      // Populate grid
      setGridFromRows(frame.rows || []);
      
      // Populate name input
      if (nameInput) nameInput.value = frame.name || '';
      if (frameTitle) frameTitle.textContent = frame.name || `Frame ${frame.id}`;
      
      // Populate duration
      if (durationInput) durationInput.value = frame.duration_ms || 1000;
      
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

function getMode() {
  const checked = Array.from(modeInputs).find(i => i.checked);
  return checked ? checked.value : 'frames';
}

async function exportH(){
  exportBtn.disabled = true;
  try {
    const mode = getMode();
    let data;
    let filename = 'frames.h';

    if(mode === 'frames'){
      data = await fetchWithHandling('/export_frames', {method:'POST'}, 'json', 'export frames');
    } else {
      // Animations mode
      const container = document.getElementById('frames');
      let selected = Array.from(container.children).filter(ch => ch.dataset.selected === '1').map(ch => parseInt(ch.dataset.id));
      if(selected.length === 0){
        selected = sessionFrames.map(f => f.id);
      }
      const animName = animNameInput && animNameInput.value && animNameInput.value.trim() ? animNameInput.value.trim() : 'Animation';
      filename = (animName || 'Animation') + '.h';
      const payload = { frames: selected, animations: [{name: animName, frames: selected}] };
      console.debug('[ui] exportH animation payload', payload, 'sessionFrames=', sessionFrames.map(f=>f.id));
      data = await fetchWithHandling('/export_frames', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}, 'json', 'export animation');
    }

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

async function playAnimation() {
  if (!playAnimationBtn) return;
  
  try {
    playAnimationBtn.disabled = true;
    const mode = getMode();
    let frameIds;

    if (mode === 'frames') {
      frameIds = sessionFrames.map(f => f.id);
      if (frameIds.length === 0) {
        showError('No frames to play');
        return;
      }
    } else {
      if (selectedIds.size === 0) {
        showError('No frames selected for animation');
        return;
      }
      frameIds = Array.from(selectedIds);
    }
    
    console.debug(`[ui] playAnimation ${mode} mode, frameIds=`, frameIds);
    
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
    } else {
      console.debug('[ui] Animation played successfully, frames=', data.frames_played);
      showVectorText('Animation played: ' + data.frames_played + ' frames');
    }

  } catch (err) {
    console.error('[ui] playAnimation failed', err);
  } finally {
    playAnimationBtn.disabled = false;
  }
}

if (playAnimationBtn) playAnimationBtn.addEventListener('click', playAnimation); else console.warn('[ui] play animation button not found');

// Save frame button removed - auto-persist replaces it
const modeInputs = document.getElementsByName('mode');
const animControls = document.getElementById('anim-controls');
const animNameInput = document.getElementById('anim-name');
const durationInput = document.getElementById('duration');
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

if(nameInput){
  nameInput.addEventListener('input', ()=>{
    // Schedule persist when name changes
    schedulePersist();
    if(frameTitle) frameTitle.textContent = nameInput.value.trim() || '(unsaved)';
  });
  nameInput.addEventListener('blur', ()=>{
    nameInput.value = normalizeSymbolInput(nameInput.value.trim()) || '';
    // Trigger immediate persist on blur
    if (persistTimeout) clearTimeout(persistTimeout);
    persistFrame();
  });
}

if(durationInput){
  durationInput.addEventListener('input', ()=>{
    // Schedule persist when duration changes
    schedulePersist();
  });
  durationInput.addEventListener('blur', ()=>{
    // Trigger immediate persist on blur
    if (persistTimeout) clearTimeout(persistTimeout);
    persistFrame();
  });
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
      if(el) el.classList.add('loaded');
    }
  }catch(e){ console.warn(e) }
}

function renderFrames(){
  const container = document.getElementById('frames');
  container.innerHTML = '';
  sessionFrames.forEach(f => {
    const item = document.createElement('div'); item.className = 'frame-item'; item.draggable = true; item.dataset.id = f.id;
    const thumb = document.createElement('div'); thumb.className = 'frame-thumb';
    // render a tiny grid by mapping the rows into colored blocks
    const rows = f.rows || [];
    // create 8*13 small cells but the CSS makes them tiny
    for(let r=0;r<ROWS;r++){
      const row = rows[r];
      for(let c=0;c<COLS;c++){
        let isOn = false;
        if (Array.isArray(row)) {
          isOn = (row[c] || 0) > 0;
        } else if (typeof row === 'string') {
          isOn = row[c] === '1';
        }
        const dot = document.createElement('div'); dot.style.background = isOn ? '#0b76ff' : '#fff'; thumb.appendChild(dot);
      }
    }
    const name = document.createElement('div'); name.className = 'frame-name'; name.textContent = f.name || ('Frame'+f.id);
    const actions = document.createElement('div'); actions.className = 'frame-actions';
    const loadBtn = document.createElement('button'); loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', ()=> loadFrameIntoEditor(f.id));
    const delBtn = document.createElement('button'); delBtn.textContent = 'Del';
    delBtn.addEventListener('click', async ()=>{ 
      const deletingLoadedFrame = (loadedFrameId === f.id);
      await deleteFrame(f.id); 
      
      // If we deleted the currently loaded frame, clear editor and load another frame
      if (deletingLoadedFrame) {
        clearLoaded();
        cells.forEach(c => { c.classList.remove('on'); delete c.dataset.b; });
        if(nameInput) nameInput.value = '';
        if(durationInput) durationInput.value = '1000';
        showVectorText('');
        
        // Load the first available frame or let backend create empty one
        await refreshFrames(); // Update list after deletion
        
        if (sessionFrames.length > 0) {
          // Find a frame that's not the one we just deleted
          const nextFrame = sessionFrames.find(fr => fr.id !== f.id);
          if (nextFrame) {
            await loadFrameIntoEditor(nextFrame.id);
          }
        } else {
          // No frames left, let backend create one with proper naming
          await loadFrameIntoEditor(); // no ID = backend creates empty frame with Frame{id} name
          // Refresh again to show the newly created frame
          await refreshFrames();
        }
      } else {
        // Not deleting loaded frame, just refresh the list
        await refreshFrames();
      }
    });
    // toggle selection for animations when clicking the thumb
    item.addEventListener('click', (e)=>{
      // avoid toggling when clicking the load/del buttons
      if(e.target === loadBtn || e.target === delBtn) return;
      
      // Only allow selection toggle in animations mode
      const mode = getMode();
      if (mode !== 'anim') return;
      
      const id = parseInt(item.dataset.id);
      if(selectedIds.has(id)){
        selectedIds.delete(id);
        item.classList.remove('selected');
        item.dataset.selected = '0';
      } else {
        selectedIds.add(id);
        item.classList.add('selected');
        item.dataset.selected = '1';
      }
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
        // Determine if we should insert before or after based on mouse position
        const rect = item.getBoundingClientRect();
        const mouseY = ev.clientY;
        const itemMiddle = rect.top + rect.height / 2;
        
        if (mouseY < itemMiddle) {
          // Drop in upper half: insert before
          container.insertBefore(draggedEl, item);
        } else {
          // Drop in lower half: insert after
          container.insertBefore(draggedEl, item.nextSibling);
        }
        
        // compute new order and send to backend
        const order = Array.from(container.children).map(ch => parseInt(ch.dataset.id));
        await fetchWithHandling('/reorder_frames', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({order})}, 'json', 'reorder frames');
        await refreshFrames();
      }
    });
    actions.appendChild(loadBtn); actions.appendChild(delBtn);
    item.appendChild(thumb); item.appendChild(name); item.appendChild(actions);
    
    // Set selection state from selectedIds (for animations)
    if(selectedIds.has(f.id)){
      item.classList.add('selected');
      item.dataset.selected = '1';
    } else {
      item.dataset.selected = '0';
    }
    
    // Set loaded state (frame currently in editor)
    if(loadedFrameId === f.id){
      item.classList.add('loaded');
    }
    
    container.appendChild(item);
  });
}

// Save animation: collect selected frames and POST to backend
const saveAnimBtn = document.getElementById('save-anim');
// list-anims button removed from UI
// const listAnimsBtn = document.getElementById('list-anims');
if (saveAnimBtn) {
  saveAnimBtn.addEventListener('click', async ()=>{
  const container = document.getElementById('frames');
  const selected = Array.from(container.children).filter(ch => ch.dataset.selected === '1').map(ch => parseInt(ch.dataset.id));
  if(selected.length === 0) { alert('Select some frames first'); return; }
  const animName = animNameInput.value && animNameInput.value.trim() ? animNameInput.value.trim() : undefined;
  const resp = await fetch('/save_animation', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name: animName, frames: selected})});
  const data = await resp.json();
  if(data && data.anim){
    // clear selection
    Array.from(container.children).forEach(ch => { ch.classList.remove('selected'); ch.dataset.selected = '0'; });
    animNameInput.value = '';
    alert('Animation saved');
  }
  });
} else {
  console.warn('[ui] save-anim button not found (animation save disabled)');
}

// Mode toggle handling
Array.from(modeInputs).forEach(i=> i.addEventListener('change', async ()=>{
  const mode = Array.from(modeInputs).find(x=>x.checked).value;
  if(mode === 'anim'){
    animControls.style.display = 'flex';
    // ensure we have the latest frames when switching to Animations mode
    await refreshFrames();
    // Auto-select all frames by default when entering Animations mode so
    // exporting immediately will include existing frames the user created
    // in Frames mode.
    selectedIds = new Set((sessionFrames || []).map(f => f.id));
    // reflect selection in the DOM
    const container = document.getElementById('frames');
    if(container){
      Array.from(container.children).forEach(ch => {
        const id = parseInt(ch.dataset.id);
        if(selectedIds.has(id)){
          ch.classList.add('selected'); ch.dataset.selected = '1';
        } else {
          ch.classList.remove('selected'); ch.dataset.selected = '0';
        }
      });
    }
  } else {
    animControls.style.display = 'none';
    // clear any animation selections when leaving animations mode
    selectedIds = new Set();
    const container = document.getElementById('frames');
    if(container){ Array.from(container.children).forEach(ch => { ch.classList.remove('selected'); ch.dataset.selected = '0'; }); }
  }
}));

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
      loadedFrame = f;
      loadedFrameId = f.id;
      
      // Populate grid
      setGridFromRows(f.rows || []);
      
      // Populate name input
      if(nameInput) nameInput.value = f.name || '';
      if(frameTitle) frameTitle.textContent = f.name || `Frame ${f.id}`;
      
      // Populate duration
      if(durationInput) durationInput.value = (f.duration_ms !== undefined && f.duration_ms !== null) ? String(f.duration_ms) : '1000';
      
      // Mark as loaded in sidebar
      markLoaded(f);
      
      // Show C vector representation (backend already sends it via load_frame)
      if (data.vector) {
        showVectorText(data.vector);
      }
      
      selectedFrameId = id;
      
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

function selectFrame(id, add=false){
  selectedFrameId = id;
  const container = document.getElementById('frames');
  Array.from(container.children).forEach(ch => {
    const isMatch = parseInt(ch.dataset.id) === id;
    if(add){
      // keep existing selections, only set this one to selected
      if(isMatch){ ch.classList.add('selected'); ch.dataset.selected = '1'; }
    } else {
      // exclusive selection
      ch.classList.toggle('selected', isMatch);
      ch.dataset.selected = isMatch ? '1' : '0';
    }
  });
}

async function deleteFrame(id){
  await fetchWithHandling('/delete_frame', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id})}, 'json', `delete frame ${id}`);
}

// Initialize editor on page load
initEditor();
refreshFrames();

// New frame button: creates a new empty frame
const newFrameBtn = document.getElementById('new-frame');
if (newFrameBtn) {
  newFrameBtn.addEventListener('click', async ()=>{
    console.debug('[ui] new frame button clicked');
    
    // Clear editor
    cells.forEach(c => { c.classList.remove('on'); delete c.dataset.b; });
    if(nameInput) nameInput.value = '';
    if(durationInput) durationInput.value = '1000';
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
          name: '', // empty name = backend will assign Frame{id}
          duration_ms: 1000,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      }, 'json', 'create new frame');
      
      if (data && data.ok && data.frame) {
        loadedFrame = data.frame;
        loadedFrameId = data.frame.id;
        // Set name to the backend-assigned name (Frame{id})
        if(nameInput) nameInput.value = data.frame.name || `Frame${data.frame.id}`;
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
  });
} else {
  console.warn('[ui] new-frame button not found');
}

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

if (saveAnimBtn) {
  saveAnimBtn.addEventListener('click', async ()=>{
    const container = document.getElementById('frames');
    const selected = Array.from(container.children).filter(ch => ch.dataset.selected === '1').map(ch => parseInt(ch.dataset.id));
    if(selected.length === 0) { alert('Select some frames first'); return; }
    const animName = animNameInput.value && animNameInput.value.trim() ? animNameInput.value.trim() : undefined;
    try {
      const data = await fetchWithHandling('/save_animation', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name: animName, frames: selected})}, 'json', 'save animation');
      if(data && data.anim){
        // clear selection
        Array.from(container.children).forEach(ch => { ch.classList.remove('selected'); ch.dataset.selected = '0'; });
        animNameInput.value = '';
        alert('Animation saved');
      }
    } catch(e) {
      console.warn('[ui] save animation failed', e);
    }
  });
} else {
  console.warn('[ui] save-anim button not found (animation save disabled)');
}

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
