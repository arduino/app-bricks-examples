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
// ("disconnected"/"connected") via the sensor_status
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
// The phone reports angular rates in its own frame (X right, Y up, Z out of
// the screen, rad/s, right-handed). They are integrated into an orientation
// quaternion, so rotations compose in the order they happen.
//
// The cube is drawn as a technical drawing: its 8 corners are projected with
// a perspective camera, the faces turned towards the viewer are found, and
// each edge is drawn solid when it borders a visible face, dashed otherwise.
// Lines are drawn in screen space, so they keep their width at any angle.
const SVG_NS = 'http://www.w3.org/2000/svg';
const DEG = Math.PI / 180;
const CUBE_HALF = 45; // px
const CUBE_PERSPECTIVE = 420; // px, distance of the eye from the cube centre
const mat3Mul = (a, b) =>
  [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
    const r = Math.floor(i / 3) * 3,
      c = i % 3;
    return a[r] * b[c] + a[r + 1] * b[c + 3] + a[r + 2] * b[c + 6];
  });
const rotX = t => [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)];
const rotY = t => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
// Seen slightly from above and from the right, so its depth shows at rest.
const GYRO_CAMERA = mat3Mul(rotX(-18 * DEG), rotY(-24 * DEG));

// Screen space: X right, Y down, Z towards the viewer. Corner i has the
// signs of bits 0 (X), 1 (Y) and 2 (Z).
const CUBE_CORNERS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
const CUBE_FACES = [
  { normal: [0, 0, 1], corners: [4, 5, 7, 6] },
  { normal: [0, 0, -1], corners: [0, 1, 3, 2] },
  { normal: [1, 0, 0], corners: [1, 5, 7, 3] },
  { normal: [-1, 0, 0], corners: [0, 4, 6, 2] },
  { normal: [0, -1, 0], corners: [0, 1, 5, 4] },
  { normal: [0, 1, 0], corners: [2, 3, 7, 6] },
];
// The 12 edges join corners that differ on one axis; each borders two faces.
const CUBE_EDGES = [];
for (let a = 0; a < 8; a++) {
  for (const bit of [1, 2, 4]) {
    const b = a | bit;
    if (b === a) continue;
    const faces = CUBE_FACES.map((f, i) => i).filter(i => {
      const c = CUBE_FACES[i].corners;
      return c.includes(a) && c.includes(b);
    });
    CUBE_EDGES.push({ a, b, faces });
  }
}

const svgEl = (tag, cls) => {
  const el = document.createElementNS(SVG_NS, tag);
  if (cls) el.setAttribute('class', cls);
  return el;
};
// Hidden edges go under the faces' light fill, visible edges over it.
const cubeHiddenLines = CUBE_EDGES.map(() => $('gyro-hidden-edges').appendChild(svgEl('line', 'hidden-edge')));
const cubePolygons = CUBE_FACES.map(() => $('gyro-faces').appendChild(svgEl('polygon')));
const cubeLines = CUBE_EDGES.map(() => $('gyro-edges').appendChild(svgEl('line', 'edge')));

// Rotation matrix of a quaternion, converted from the phone frame (Y up) to
// screen space (Y down): the terms that mix Y with X or Z change sign.
function quatToScreen([w, x, y, z]) {
  return [
    1 - 2 * (y * y + z * z),
    -2 * (x * y - w * z),
    2 * (x * z + w * y),
    -2 * (x * y + w * z),
    1 - 2 * (x * x + z * z),
    -2 * (y * z - w * x),
    2 * (x * z - w * y),
    -2 * (y * z + w * x),
    1 - 2 * (x * x + y * y),
  ];
}

const apply = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

function drawCube(q) {
  const m = mat3Mul(GYRO_CAMERA, quatToScreen(q));
  const corners = CUBE_CORNERS.map(c => apply(m, c).map(v => v * CUBE_HALF));
  const flat = corners.map(([x, y, z]) => {
    const k = CUBE_PERSPECTIVE / (CUBE_PERSPECTIVE - z);
    return [x * k, y * k];
  });
  // A face is visible when its outer side faces the eye, at (0, 0, P).
  const visible = CUBE_FACES.map(f => {
    const n = apply(m, f.normal);
    const c = [0, 1, 2].map(k => f.corners.reduce((s, i) => s + corners[i][k], 0) / 4);
    return n[0] * -c[0] + n[1] * -c[1] + n[2] * (CUBE_PERSPECTIVE - c[2]) > 0;
  });
  CUBE_FACES.forEach((f, i) => {
    const p = cubePolygons[i];
    p.style.display = visible[i] ? '' : 'none';
    if (visible[i]) p.setAttribute('points', f.corners.map(c => flat[c].map(v => v.toFixed(2)).join(',')).join(' '));
  });
  CUBE_EDGES.forEach((e, i) => {
    const shown = e.faces.some(f => visible[f]);
    const line = shown ? cubeLines[i] : cubeHiddenLines[i];
    cubeLines[i].style.display = shown ? '' : 'none';
    cubeHiddenLines[i].style.display = shown ? 'none' : '';
    line.setAttribute('x1', flat[e.a][0].toFixed(2));
    line.setAttribute('y1', flat[e.a][1].toFixed(2));
    line.setAttribute('x2', flat[e.b][0].toFixed(2));
    line.setAttribute('y2', flat[e.b][1].toFixed(2));
  });
}

let gyroQ = [1, 0, 0, 0],
  gyroLastT = null;

function integrateGyro(wx, wy, wz, dt) {
  const rate = Math.hypot(wx, wy, wz);
  if (!(rate > 0) || !(dt > 0)) return;
  const half = (rate * dt) / 2;
  const k = Math.sin(half) / rate;
  const [aw, ax, ay, az] = gyroQ;
  const bw = Math.cos(half),
    bx = wx * k,
    by = wy * k,
    bz = wz * k;
  // q ⊗ Δq: the rates are measured in the phone's own frame.
  const q = [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
  const n = Math.hypot(...q);
  gyroQ = q.map(v => v / n);
}

// The drawn orientation eases towards the integrated one on every animation
// frame, so the cube moves smoothly between datapoints.
const GYRO_SMOOTHING_S = 0.08;
let shownQ = [1, 0, 0, 0],
  gyroFrame = null,
  gyroFrameT = 0;

function stepGyro(now) {
  const dt = Math.max(0, now - gyroFrameT) / 1000;
  gyroFrameT = now;
  const dot = shownQ.reduce((s, v, i) => s + v * gyroQ[i], 0);
  const target = dot < 0 ? gyroQ.map(v => -v) : gyroQ;
  if (1 - Math.abs(dot) < 1e-7) {
    shownQ = target;
    gyroFrame = null;
  } else {
    const k = 1 - Math.exp(-dt / GYRO_SMOOTHING_S);
    const q = shownQ.map((v, i) => v + (target[i] - v) * k);
    const n = Math.hypot(...q);
    shownQ = q.map(v => v / n);
    gyroFrame = requestAnimationFrame(stepGyro);
  }
  drawCube(shownQ);
}

function animateGyro() {
  if (gyroFrame != null) return;
  gyroFrameT = performance.now();
  gyroFrame = requestAnimationFrame(stepGyro);
}

function updateGyro(d) {
  ['gyroscopeX', 'gyroscopeY', 'gyroscopeZ'].forEach(k => {
    const el = document.querySelector(`b[data-k="${k}"]`);
    if (el) el.textContent = fmt(d[k]);
  });
  const now = performance.now() / 1000;
  if (gyroLastT == null) gyroLastT = now;
  const dt = Math.min(0.25, now - gyroLastT);
  gyroLastT = now;
  const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  integrateGyro(num(d.gyroscopeX), num(d.gyroscopeY), num(d.gyroscopeZ), dt);
  animateGyro();
}

// Click the cube to re-center it (the integrated orientation drifts).
$('gyro-view').addEventListener('click', () => {
  gyroQ = [1, 0, 0, 0];
  animateGyro();
});

drawCube(shownQ);

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
//   connected → collapsed (show the connected client)
ui.on_message('sensor_status', m => {
  if (!m || typeof m.status !== 'string') return;
  const paired = m.status !== 'disconnected';
  const name = m.info && (m.info.client_name || m.info.client_address);
  setPaired(paired, paired ? (name ? `Connected to ${name}` : 'Device connected') : 'No device connected');
});
