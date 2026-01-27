// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

const OFF_COLOR = '#DAE3E3';
const ledState = {
  1: { color: '#FFFFFF', isOn: true },
  2: { color: '#FFFFFF', isOn: true },
  3: { color: '#FFFFFF', isOn: true },
  4: { color: '#FFFFFF', isOn: true },
};

document.addEventListener('DOMContentLoaded', () => {
  initSocketIO();
  setupPaletteLED(1);
  setupPaletteLED(2);
  setupColorPickerLED(3);
  setupPaletteLED(4);
});

function setupPaletteLED(ledNumber) {
  const switchEl = document.getElementById(`led${ledNumber}-switch`);
  const palette = document.getElementById(`led${ledNumber}-palette`);
  const circle = document.getElementById(`led${ledNumber}-circle`);

  switchEl.addEventListener('change', (e) => {
    ledState[ledNumber].isOn = e.target.checked;
    if (ledState[ledNumber].isOn) {
      updateColor(ledNumber, ledState[ledNumber].color);
    } else {
      const rgb = hexToRgb(OFF_COLOR);
      socket.emit('set_color', { led: ledNumber, color: {r: 0, g: 0, b: 0}});
      circle.style.backgroundColor = OFF_COLOR;
    }
  });

  palette.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-square')) {
      if (ledState[ledNumber].isOn) {
        const newColor = e.target.dataset.color;
        updateColor(ledNumber, newColor);
      }
    }
  });

  // Set initial color
  updateColor(ledNumber, ledState[ledNumber].color);
}

function setupColorPickerLED(ledNumber) {
  const switchEl = document.getElementById(`led${ledNumber}-switch`);
  const trigger = document.getElementById(`led${ledNumber}-color-trigger`);
  const picker = document.getElementById(`led${ledNumber}-color`);
  const hexInput = document.getElementById(`led${ledNumber}-hex`);
  const circle = document.getElementById(`led${ledNumber}-circle`);

  switchEl.addEventListener('change', (e) => {
    ledState[ledNumber].isOn = e.target.checked;
    if (ledState[ledNumber].isOn) {
      updateColor(ledNumber, ledState[ledNumber].color);
    } else {
      socket.emit('set_color', { led: ledNumber, color: {r: 0, g: 0, b: 0} });
      circle.style.backgroundColor = OFF_COLOR;
    }
  });

  trigger.addEventListener('click', () => {
    if (ledState[ledNumber].isOn) {
      picker.click()
    }
  });

  picker.addEventListener('input', (e) => {
    if (ledState[ledNumber].isOn) {
      updateColor(ledNumber, e.target.value);
    }
  });

  hexInput.addEventListener('change', (e) => {
    const newColor = e.target.value;
    if (ledState[ledNumber].isOn) {
      if (/^#[0-9A-F]{6}$/i.test(newColor)) {
        updateColor(ledNumber, newColor);
      }
    }
  });
  // Set initial color
  updateColor(ledNumber, ledState[ledNumber].color);
}

function updateColor(ledNumber, newColor, updateStateColor = true) {
  if (updateStateColor) {
    ledState[ledNumber].color = newColor;
  }

  const circle = document.getElementById(`led${ledNumber}-circle`);
  circle.style.backgroundColor = newColor;

  if (ledNumber === 3) {
    const hexInput = document.getElementById(`led3-hex`);
    const trigger = document.getElementById(`led3-color-trigger`);
    hexInput.value = newColor;
    trigger.style.backgroundColor = newColor;
  }

  if (ledState[ledNumber].isOn) {
    const rgb = hexToRgb(newColor);
    socket.emit('set_color', { led: ledNumber, color: rgb });
    console.log(`LED ${ledNumber} - R: ${rgb.r}, G: ${rgb.g}, B: ${rgb.b}`);
  } else if (newColor === '#000000') {
    // Specifically for turning off
    const rgb = hexToRgb(newColor);
    socket.emit('set_color', { led: ledNumber, color: rgb });
    console.log(`LED ${ledNumber} turned OFF`);
  }
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return { r, g, b };
}

function initSocketIO() {
    socket.on('disconnect', () => {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });
}
