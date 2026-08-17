// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ui = new WebUI();
const qrEl = document.getElementById('qr');

const $ = id => document.getElementById(id);
const setText = (id, v) => {
  const e = $(id);
  if (e) e.textContent = v;
};
const fmt = (v, d = 2) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '—');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 12-key piano: build once
const pianoKeys = $('piano-keys');
for (let i = 0; i < 12; i++) pianoKeys.appendChild(document.createElement('span'));
const brightBar = $('bright-bar');
for (let i = 0; i < 10; i++) brightBar.appendChild(document.createElement('span'));

// -------- Pairing / connection state --------
// The remote_sensor peripheral itself reports lifecycle transitions
// ("disconnected"/"connected"/"streaming"/"paused") via the sensor_status
// event, so the UI reflects that directly instead of guessing from the
// dashboard's own websocket connection (which is always "connected" as
// soon as this page loads, regardless of whether a phone is paired).
const pairingEl = $('pairing');
const clientStatusEl = $('clientStatus');
function setPaired(paired, label) {
  pairingEl.classList.toggle('paired', !!paired);
  document.body.classList.toggle('paired', !!paired);
  if (clientStatusEl) clientStatusEl.textContent = label || (paired ? 'Device connected' : 'No device connected');
}

// -------- Pairing --------
function showPairing(welcome) {
  setText('info-otp', welcome.secret || '—');
  // Collapse the pairing card if the server already reports a paired client
  // at the moment the page is loaded.
  setPaired(welcome.status && welcome.status !== 'disconnected');
  const host = welcome.ip && welcome.ip !== '0.0.0.0' ? welcome.ip : window.location.hostname;
  const proto = welcome.protocol || 'remote-sensor';
  const payload = `https://cloud.arduino.cc/installmobileapp?otp=${encodeURIComponent(welcome.secret)}&protocol=${encodeURIComponent(proto)}&ip=${encodeURIComponent(host)}&port=${encodeURIComponent(welcome.port)}`;
  qrEl.innerHTML = '';
  new QRCode(qrEl, {
    text: payload,
    width: 184,
    height: 184,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });
}

// -------- Compass --------
function updateCompass(deg) {
  if (typeof deg !== 'number') return;
  $('compass-rose').style.transform = `rotate(${deg}deg)`;
  setText('compass-deg', `${deg.toFixed(0)}°`);
}

// -------- Accelerometer (bubble level + linear bar) --------
// Values are in g. At rest the gravity vector has magnitude ~1g.
// Bubble position: project (-X, -Y) of gravity onto the level circle.
// (Phone tilt: when phone leans right, gravity X grows positive, bubble
//  goes left on a real bubble level — we mirror to feel natural.)
function updateAccel(d) {
  const x = d.accelerometerX,
    y = d.accelerometerY,
    z = d.accelerometerZ;
  document.querySelectorAll('b[data-k="accelerometerX"]').forEach(b => (b.textContent = fmt(x)));
  document.querySelectorAll('b[data-k="accelerometerY"]').forEach(b => (b.textContent = fmt(y)));
  document.querySelectorAll('b[data-k="accelerometerZ"]').forEach(b => (b.textContent = fmt(z)));
  if (typeof x === 'number' && typeof y === 'number') {
    // 1g → bubble at edge (~55 units). Clamp at 1.2g to leave headroom.
    const cx = (clamp(-x, -1.2, 1.2) / 1.2) * 50;
    const cy = (clamp(y, -1.2, 1.2) / 1.2) * 50;
    const b = $('accel-bubble');
    b.setAttribute('cx', cx);
    b.setAttribute('cy', cy);
  }
  if (typeof z === 'number') {
    // Z bar: -1.2..+1.2 g
    const t = clamp((z + 1.2) / 2.4, 0, 1);
    $('accel-z-fill').style.height = t * 100 + '%';
  }
  const lin = d.accelerometerLinear;
  if (typeof lin === 'number') {
    setText('accel-lin', fmt(lin));
    // Linear acceleration: 0..2g maps to 0..100%
    $('accel-lin-fill').style.width = clamp((Math.abs(lin) / 2) * 100, 0, 100) + '%';
  }
}

// -------- Gyroscope cube --------
let gyroRX = 0,
  gyroRY = 0,
  gyroRZ = 0,
  gyroLastT = null;
function updateGyro(d) {
  ['gyroscopeX', 'gyroscopeY', 'gyroscopeZ'].forEach(k => {
    const el = document.querySelector(`b[data-k="${k}"]`);
    if (el) el.textContent = fmt(d[k]);
  });
  const now = performance.now() / 1000;
  if (gyroLastT == null) gyroLastT = now;
  const dt = Math.min(0.25, now - gyroLastT);
  gyroLastT = now;
  const RAD2DEG = 180 / Math.PI;
  if (typeof d.gyroscopeX === 'number') gyroRX += d.gyroscopeX * dt * RAD2DEG;
  if (typeof d.gyroscopeY === 'number') gyroRY += d.gyroscopeY * dt * RAD2DEG;
  if (typeof d.gyroscopeZ === 'number') gyroRZ += d.gyroscopeZ * dt * RAD2DEG;
  $('gyro-cube').style.transform = `rotateX(${gyroRX}deg) rotateY(${gyroRY}deg) rotateZ(${gyroRZ}deg)`;
}

// -------- Magnetometer (heading needle + Z bar) --------
function updateMag(d) {
  const x = d.magnetometerX,
    y = d.magnetometerY,
    z = d.magnetometerZ;
  ['magnetometerX', 'magnetometerY', 'magnetometerZ'].forEach(k => {
    document.querySelectorAll(`b[data-k="${k}"]`).forEach(b => (b.textContent = fmt(d[k])));
  });
  if (typeof x === 'number' && typeof y === 'number') {
    // Heading (deg) from horizontal magnetic field (XY plane).
    // atan2(x, -y): screen "up" = -y → 0°/N; clockwise positive.
    const heading = (Math.atan2(x, -y) * 180) / Math.PI;
    $('mag-arrow').style.transform = `rotate(${heading}deg)`;
  }
  if (typeof z === 'number') {
    // Signed Z bar: anchor at the centre, grow up for +z, down for -z.
    // Clamp at ±100 µT.
    const z2 = clamp(z, -100, 100);
    const f = $('mag-z-fill');
    const halfPct = (Math.abs(z2) / 100) * 50; // 0..50% of bar
    if (z2 >= 0) {
      f.style.top = 50 - halfPct + '%';
      f.style.height = halfPct + '%';
    } else {
      f.style.top = '50%';
      f.style.height = halfPct + '%';
    }
  }
  const lin = d.magnetometerLinear;
  if (typeof lin === 'number') {
    setText('mag-lin', fmt(lin));
    // 0..200 µT range typical
    $('mag-lin-fill').style.width = clamp((lin / 200) * 100, 0, 100) + '%';
  }
}

// -------- Sound --------
function updateSound(d) {
  if (typeof d.soundLevel === 'number') {
    const lvl = clamp(d.soundLevel, 0, 100);
    $('sound-level-fill').style.width = lvl + '%';
    setText('sound-level', lvl.toFixed(0));
  }
  if (typeof d.soundPitch === 'number' && d.soundPitch > 0) {
    setText('sound-pitch', d.soundPitch.toFixed(0));
    const f = clamp(d.soundPitch, 50, 3000);
    const key = Math.min(11, Math.floor(((Math.log2(f) - Math.log2(50)) / (Math.log2(3000) - Math.log2(50))) * 12));
    Array.from(pianoKeys.children).forEach((s, i) => s.classList.toggle('on', i === key));
  }
}

// -------- Battery --------
let lastBattery = null;
function updateBattery(d) {
  if (typeof d.battery !== 'number') return;
  const pct = clamp(d.battery, 0, 100);
  if (pct === lastBattery) return;
  lastBattery = pct;
  $('battery-fill').style.width = pct + '%';
  $('battery-fill').style.background = pct > 50 ? 'var(--good)' : pct > 20 ? 'var(--warn)' : 'var(--danger)';
  setText('battery-pct', pct.toFixed(0));
}

// -------- Barometer --------
function updateBarometer(d) {
  if (typeof d.barometer !== 'number') return;
  const v = d.barometer;
  setText('bar-val', v.toFixed(1));
  const t = clamp((v - 950) / 100, 0, 1);
  $('bar-arc').setAttribute('stroke-dashoffset', 157 * (1 - t));
  const angle = -90 + t * 180;
  $('bar-needle').setAttribute('transform', `rotate(${angle})`);
}

// -------- Brightness --------
let lastBright = null;
function updateBrightness(d) {
  if (typeof d.brightness !== 'number') return;
  const v = clamp(Math.round(d.brightness), 1, 10);
  if (v === lastBright) return;
  lastBright = v;
  setText('bright-val', v);
  Array.from(brightBar.children).forEach((s, i) => s.classList.toggle('on', i < v));
  const sun = $('sun').firstElementChild;
  const scale = 0.6 + (v / 10) * 0.8;
  const glow = 10 + v * 4;
  sun.style.transform = `scale(${scale})`;
  sun.style.boxShadow = `0 0 ${glow}px ${glow / 4}px rgba(255,209,102,0.45)`;
  sun.style.opacity = 0.3 + v / 12;
}

// -------- GPS (lat/lng, with lon fallback) --------
function updateGPS(d) {
  if (!d.gps || typeof d.gps !== 'object') return;
  const { lat } = d.gps;
  const lng = d.gps.lng != null ? d.gps.lng : d.gps.lon;
  if (typeof lat === 'number') setText('gps-lat', lat.toFixed(5));
  if (typeof lng === 'number') setText('gps-lng', lng.toFixed(5));
  if (typeof lat === 'number' && typeof lng === 'number') {
    const cx = (lng / 180) * 55;
    const cy = -(lat / 90) * 55;
    const dot = $('globe-dot');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
  }
}

// -------- Touch (touchX/Y in [0..1] or -1 when not touched) --------
function updateTouch(d) {
  const tx = d.touchX,
    ty = d.touchY;
  const overlay = $('touch-overlay');
  const dot = $('touch-dot');
  const touched = d.isTouched === true || (typeof tx === 'number' && tx >= 0 && typeof ty === 'number' && ty >= 0);
  if (!touched) {
    overlay.style.opacity = '1';
    dot.style.opacity = '0';
    setText('touch-x', '—');
    setText('touch-y', '—');
    return;
  }
  overlay.style.opacity = '0';
  dot.style.opacity = '1';
  const x = clamp(tx, 0, 1);
  const y = clamp(ty, 0, 1);
  dot.style.left = x * 100 + '%';
  dot.style.top = y * 100 + '%';
  setText('touch-x', x.toFixed(3));
  setText('touch-y', y.toFixed(3));
}

// -------- Dispatch --------
function applyDatapoint(d) {
  updateAccel(d);
  updateGyro(d);
  updateMag(d);
  updateSound(d);
  updateBattery(d);
  updateBarometer(d);
  updateBrightness(d);
  if (typeof d.compass === 'number') updateCompass(d.compass);
  updateGPS(d);
  updateTouch(d);
}

ui.on_message('welcome', showPairing);
ui.on_message('history', rows => (rows || []).forEach(applyDatapoint));
ui.on_message('datapoint', applyDatapoint);
// sensor_status drives pairing-card collapse:
//   disconnected → expanded (show QR + OTP)
//   connected/streaming/paused → collapsed (show the connected client)
ui.on_message('sensor_status', m => {
  if (!m || typeof m.status !== 'string') return;
  const paired = m.status !== 'disconnected';
  const name = m.info && (m.info.client_name || m.info.client_address);
  setPaired(paired, paired ? (name ? `Connected to ${name}` : 'Device connected') : 'No device connected');
});
