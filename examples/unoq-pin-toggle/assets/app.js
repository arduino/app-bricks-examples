// SPDX-FileCopyrightText: Copyright (C) 2025
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

// Column anchors
const RIGHT_LEFT = 88.92;             // right CONTROL column (D21..D0)
const LEFT_LEFT  = 100 - RIGHT_LEFT;  // mirrored left column (~11.08)

// Vertical spacing reused from your D21->D20 (23.0 -> 25.5)
const BASE_TOP1 = 23.0;
const BASE_TOP2 = 52.6;
const BASE_TOP3 = 47.87;
const STEP     = 2.358;

const LED_LEFT = 73; 
const LED_TOPS = 77.52;

// ---- Layout ----
const PIN_LAYOUT = [
  // Right column: D21..D0
  { name: "D21", top: BASE_TOP1 + STEP * 0, left: RIGHT_LEFT },
  { name: "D20", top: BASE_TOP1 + STEP * 1, left: RIGHT_LEFT },
  { name: "D13", top: BASE_TOP1 + STEP * 4, left: RIGHT_LEFT },
  { name: "D12", top: BASE_TOP1 + STEP * 5, left: RIGHT_LEFT },
  { name: "D11", top: BASE_TOP1 + STEP * 6, left: RIGHT_LEFT },
  { name: "D10", top: BASE_TOP1 + STEP * 7, left: RIGHT_LEFT },
  { name: "D9",  top: BASE_TOP1 + STEP * 8, left: RIGHT_LEFT },
  { name: "D8",  top: BASE_TOP1 + STEP * 9, left: RIGHT_LEFT },
  { name: "D7",  top: BASE_TOP3 + STEP * 0, left: RIGHT_LEFT },
  { name: "D6",  top: BASE_TOP3 + STEP * 1, left: RIGHT_LEFT },
  { name: "D5",  top: BASE_TOP3 + STEP * 2, left: RIGHT_LEFT },
  { name: "D4",  top: BASE_TOP3 + STEP * 3, left: RIGHT_LEFT },
  { name: "D3",  top: BASE_TOP3 + STEP * 4, left: RIGHT_LEFT },
  { name: "D2",  top: BASE_TOP3 + STEP * 5, left: RIGHT_LEFT },
  { name: "D1",  top: BASE_TOP3 + STEP * 6, left: RIGHT_LEFT },
  { name: "D0",  top: BASE_TOP3 + STEP * 7, left: RIGHT_LEFT },

  // Left column: A0..A5 (top→bottom).
  { name: "A0", top: BASE_TOP2 + STEP * 0, left: LEFT_LEFT },
  { name: "A1", top: BASE_TOP2 + STEP * 1, left: LEFT_LEFT },
  { name: "A2", top: BASE_TOP2 + STEP * 2, left: LEFT_LEFT },
  { name: "A3", top: BASE_TOP2 + STEP * 3, left: LEFT_LEFT },
  { name: "A4", top: BASE_TOP2 + STEP * 4, left: LEFT_LEFT },
  { name: "A5", top: BASE_TOP2 + STEP * 5, left: LEFT_LEFT },

  // LED slots 
  { name: "LED3_R", top: LED_TOPS + STEP * 0, left: LED_LEFT },
  { name: "LED3_G", top: LED_TOPS + STEP * 1, left: LED_LEFT },
  { name: "LED3_B", top: LED_TOPS + STEP * 2, left: LED_LEFT },
  { name: "LED4_R", top: LED_TOPS + STEP * 4, left: LED_LEFT },
  { name: "LED4_G", top: LED_TOPS + STEP * 5, left: LED_LEFT },
  { name: "LED4_B", top: LED_TOPS + STEP * 6, left: LED_LEFT },
];


// --------------- Scale chip with image --------------------------------
const boardEl = document.querySelector(".board");
const imgEl   = document.getElementById("boardImage");

function updateImgScale() {
  if (!imgEl || !imgEl.naturalWidth) return;
  const scale = imgEl.clientWidth / imgEl.naturalWidth;
  boardEl?.style.setProperty("--img-scale", scale);
}
imgEl?.addEventListener("load", updateImgScale);
if (imgEl) new ResizeObserver(updateImgScale).observe(imgEl);
window.addEventListener("resize", updateImgScale);
updateImgScale();

// --------------- DOM helpers -----------------------------------------
function makeSwitch({ name, top, left }) {
  const wrap = document.createElement("label");
  wrap.className = "toggle-wrap";
  wrap.title = name;
  wrap.style.top  = `${top}%`;
  wrap.style.left = `${left}%`;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = `pin-${name}`;
  input.className = "switch-input";
  input.setAttribute("role", "switch");

  const face = document.createElement("span");
  face.className = "switch-ios";

  wrap.appendChild(input);
  wrap.appendChild(face);
  return wrap;
}

function setChecked(name, value) {
  const el = document.getElementById(`pin-${name}`);
  if (el) el.checked = value ? true : false;
}

// --------------- Wire everything -------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // create switches
  const frag = document.createDocumentFragment();
  PIN_LAYOUT.forEach(cfg => frag.appendChild(makeSwitch(cfg)));
  document.querySelector(".board").appendChild(frag);

  // local change -> emit to backend
  PIN_LAYOUT.forEach(({ name }) => {
    const el = document.getElementById(`pin-${name}`);
    el?.addEventListener("change", () => {
      const stateBool = !!el.checked;
      socket.emit("pin_toggle", { name, state: stateBool ? "on" : "off" });
      console.log(`${name} -> ${stateBool ? "ON" : "OFF"}`);
    });
  });

  // bootstrap from backend
  fetch(`http://${window.location.host}/states`, { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(data => {
      const states = data?.states || {};
      Object.entries(states).forEach(([name, v]) => setChecked(name, v === true || v === 1 || v === "on" || v === "1"));
    })
    .catch(() => {});

  // keep in sync
  socket.on("pin_state_update", (msg) => {
    if (!msg?.name) return;
    setChecked(msg.name, msg.state === true || msg.state === 1 || msg.state === "on" || msg.state === "1");
  });

  socket.on("error", (m) => console.error("Server error:", m));
});
