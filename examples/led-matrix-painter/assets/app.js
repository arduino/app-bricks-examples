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

async function loadConfig(){
  try{
    const resp = await fetch('/config');
    if(!resp.ok) return;
    const data = await resp.json();
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
      // click opens a brightness slider for that cell
        el.addEventListener('click', (ev)=>{ ev.stopPropagation(); cellClicked(ev, el); });
      gridEl.appendChild(el);
      cells.push(el);
    }
  }
}

const sliderWrap = document.getElementById('cell-slider');
const brightnessSlider = document.getElementById('brightness-slider');
const brightnessValue = document.getElementById('brightness-value');
let activeCell = null;

function cellClicked(ev, el){
  activeCell = el;
  // position slider near cursor if present; otherwise just keep selection
  if (sliderWrap && brightnessSlider) {
    try {
      sliderWrap.style.left = (ev.clientX + 8) + 'px';
      sliderWrap.style.top = (ev.clientY + 8) + 'px';
  const current = clampBrightness(el.dataset.b ? parseInt(el.dataset.b) : 0);
  brightnessSlider.value = String(current);
  if (brightnessValue) brightnessValue.textContent = String(current);
  if (sliderWrap) { sliderWrap.style.display = 'flex'; }
    } catch (err) {
      console.warn('[ui] failed to position slider', err);
    }
  } else {
    // fallback: ensure visual state reflects dataset.b
    const current = clampBrightness(el.dataset.b ? parseInt(el.dataset.b) : 0);
    if (current > 0) el.classList.add('on'); else el.classList.remove('on');
    // user has toggled a cell visually without using the slider -> this counts as an edit
    clearLoaded();
  }
}

if (brightnessSlider) {
  brightnessSlider.addEventListener('input', ()=>{
    if(!activeCell) return;
    const v = clampBrightness(parseInt(brightnessSlider.value));
    brightnessSlider.value = String(v);
    activeCell.dataset.b = String(v);
    // visually mark as 'on' if v>0
    if(v>0) activeCell.classList.add('on'); else activeCell.classList.remove('on');
    // update numeric display next to slider
    if (brightnessValue) brightnessValue.textContent = String(v);
  });

  brightnessSlider.addEventListener('change', ()=>{
    // commit change: send full 2D array rows of ints to backend
    const committed = clampBrightness(parseInt(brightnessSlider.value));
    brightnessSlider.value = String(committed);
    console.debug('[ui] brightness change commit for active cell, value=', committed);
    
    // Trigger unified persist (board + DB)
    schedulePersist();
    
    // hide slider
    if (sliderWrap) sliderWrap.style.display = 'none';
    activeCell = null;
  });
} else {
  console.warn('[ui] brightness-slider element not found; per-cell slider disabled');
}

loadConfig();

// Hide the slider when clicking anywhere outside the slider or the grid
document.addEventListener('click', (e) => {
  if (!sliderWrap) return;
  if (sliderWrap.contains(e.target)) return;
  if (gridEl && gridEl.contains(e.target)) return;
  sliderWrap.style.display = 'none';
});

// Unified persist: save to DB and update board together
function schedulePersist(){
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(()=> {
    persistFrame();
    persistTimeout = null;
  }, AUTO_PERSIST_DELAY_MS);
}

function persistFrame(){
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
  
  fetch('/persist_frame', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  }).then(r => r.json())
    .then(data => {
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
    })
    .catch(err => console.warn('[ui] persistFrame failed', err));
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
    const resp = await fetch('/load_frame', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({}) // no id = load last or create empty
    });
    const data = await resp.json();
    
    if (data && data.ok && data.frame) {
      const frame = data.frame;
      loadedFrame = frame;
      loadedFrameId = frame.id;
      
      // Populate grid
      setGridFromRows(frame.rows || []);
      
      // Populate name input
      if (nameInput) nameInput.value = frame.name || '';
      
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
    if(mode === 'frames'){
      // Export all frames (session)
      const resp = await fetch('/export_frames', {method:'POST'});
      if(!resp.ok){ 
        showVectorText('Server error'); 
        return; 
      }
      const data = await resp.json();
      // Download file without updating the vector display
      const blob = new Blob([data.header], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = 'frames.h'; 
      document.body.appendChild(a); 
      a.click(); 
      a.remove(); 
      URL.revokeObjectURL(url);
    } else {
      // Animations mode: use the Animation name field as file name and animation name
      const container = document.getElementById('frames');
      let selected = Array.from(container.children).filter(ch => ch.dataset.selected === '1').map(ch => parseInt(ch.dataset.id));
      if(selected.length === 0){
        // default to all frames if none selected
        selected = sessionFrames.map(f => f.id);
      }
      const animName = animNameInput && animNameInput.value && animNameInput.value.trim() ? animNameInput.value.trim() : 'Animation';
      const payload = { frames: selected, animations: [{name: animName, frames: selected}] };
      console.debug('[ui] exportH animation payload', payload, 'sessionFrames=', sessionFrames.map(f=>f.id));
      const resp = await fetch('/export_frames', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      if(!resp.ok){ 
        showVectorText('Server error'); 
        return; 
      }
      const data = await resp.json();
      // Download file without updating the vector display
      const blob = new Blob([data.header], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = (animName || 'Animation') + '.h'; 
      document.body.appendChild(a); 
      a.click(); 
      a.remove(); 
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    showVectorText('Error: ' + (err.message || err));
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
    
    if (mode === 'frames') {
      // Frames mode: play all frames in order
      const frameIds = sessionFrames.map(f => f.id);
      
      if (frameIds.length === 0) {
        showVectorText('No frames to play');
        return;
      }
      
      console.debug('[ui] playAnimation frames mode, frameIds=', frameIds);
      
      const payload = {
        frames: frameIds,
        loop: false
      };
      
      const resp = await fetch('/play_animation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        showVectorText('Error playing animation');
        return;
      }
      
      const data = await resp.json();
      if (data.error) {
        showVectorText('Error: ' + data.error);
      } else {
        console.debug('[ui] Animation played successfully, frames=', data.frames_played);
        showVectorText('Animation played: ' + data.frames_played + ' frames');
      }
    } else {
      // Animation mode: play selected frames
      if (selectedIds.size === 0) {
        showVectorText('No frames selected for animation');
        return;
      }
      
      const frameIds = Array.from(selectedIds);
      
      console.debug('[ui] playAnimation animation mode, selected frameIds=', frameIds);
      
      const payload = {
        frames: frameIds,
        loop: false
      };
      
      const resp = await fetch('/play_animation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        showVectorText('Error playing animation');
        return;
      }
      
      const data = await resp.json();
      if (data.error) {
        showVectorText('Error: ' + data.error);
      } else {
        console.debug('[ui] Animation played successfully, frames=', data.frames_played);
        showVectorText('Animation played: ' + data.frames_played + ' frames');
      }
    }
  } catch (err) {
    showVectorText('Error: ' + (err.message || err));
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
    const resp = await fetch('/list_frames');
    const data = await resp.json();
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
        await fetch('/reorder_frames', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({order})});
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
if (rotate180Btn) {
  rotate180Btn.addEventListener('click', async ()=>{
    const grid = collectGridBrightness();
    try{
      const resp = await fetch('/transform_frame', {
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          op:'rotate180', 
          rows: grid,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      });
      const data = await resp.json();
      if(data && data.ok && data.frame) {
        setGridFromRows(data.frame.rows);
        if(data.vector) showVectorText(data.vector);
        schedulePersist();
      }
    }catch(e){ console.warn('[ui] rotate180 failed', e); }
  });
}
if (flipHBtn) {
  flipHBtn.addEventListener('click', async ()=>{
    const grid = collectGridBrightness();
    try{
      const resp = await fetch('/transform_frame', {
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          op:'flip_h', 
          rows: grid,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      });
      const data = await resp.json();
      if(data && data.ok && data.frame) {
        setGridFromRows(data.frame.rows);
        if(data.vector) showVectorText(data.vector);
        schedulePersist();
      }
    }catch(e){ console.warn('[ui] flip-h failed', e); }
  });
}
if (flipVBtn) {
  flipVBtn.addEventListener('click', async ()=>{
    const grid = collectGridBrightness();
    try{
      const resp = await fetch('/transform_frame', {
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          op:'flip_v', 
          rows: grid,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      });
      const data = await resp.json();
      if(data && data.ok && data.frame) {
        setGridFromRows(data.frame.rows);
        if(data.vector) showVectorText(data.vector);
        schedulePersist();
      }
    }catch(e){ console.warn('[ui] flip-v failed', e); }
  });
}

async function loadFrameIntoEditor(id){
  try {
    const resp = await fetch('/load_frame', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id})
    });
    const data = await resp.json();
    
    if(data && data.ok && data.frame){
      const f = data.frame;
      loadedFrame = f;
      loadedFrameId = f.id;
      
      // Populate grid
      setGridFromRows(f.rows || []);
      
      // Populate name input
      if(nameInput) nameInput.value = f.name || '';
      
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
  await fetch('/delete_frame', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id})});
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
      const resp = await fetch('/persist_frame', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          rows: grid,
          name: '', // empty name = backend will assign Frame{id}
          duration_ms: 1000,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      });
      const data = await resp.json();
      
      if (data && data.ok && data.frame) {
        loadedFrame = data.frame;
        loadedFrameId = data.frame.id;
        // Set name to the backend-assigned name (Frame{id})
        if(nameInput) nameInput.value = data.frame.name || `Frame${data.frame.id}`;
        
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

if (invertBtn) {
  invertBtn.addEventListener('click', async ()=>{
    console.debug('[ui] invert button clicked (delegating to server)');
    const grid = collectGridBrightness();
    try{
      const resp = await fetch('/transform_frame', {
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          op:'invert', 
          rows: grid,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      });
      const data = await resp.json();
      if(data && data.ok && data.frame){
        setGridFromRows(data.frame.rows);
        if(data.vector) showVectorText(data.vector);
        schedulePersist();
      }
    }catch(e){ console.warn('[ui] transform request failed', e); }
  });
} else {
  console.warn('[ui] invert button not found');
}

const invertNotNullBtn = document.getElementById('invert-not-null');
if (invertNotNullBtn) {
  invertNotNullBtn.addEventListener('click', async ()=>{
    console.debug('[ui] invert-not-null clicked (delegating to server)');
    const grid = collectGridBrightness();
    try{
      const resp = await fetch('/transform_frame', {
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          op:'invert_not_null', 
          rows: grid,
          brightness_levels: BRIGHTNESS_LEVELS
        })
      });
      const data = await resp.json();
      if(data && data.ok && data.frame) {
        setGridFromRows(data.frame.rows);
        if(data.vector) showVectorText(data.vector);
        schedulePersist();
      }
    }catch(e){ console.warn('[ui] invert-not-null failed', e); }
  });
} else {
  console.warn('[ui] invert-not-null button not found');
}
