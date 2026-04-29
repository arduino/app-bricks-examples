// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const ledButton = document.getElementById('led-button');
const ledText = document.getElementById('led-text');
let errorContainer;

/*
 * Socket initialization. We need it to communicate with the server
 */
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
});

function initSocketIO() {
    socket.on('connect', () => {
        console.log('Connected to the server');
    });

    socket.on('message', (message) => {
        printMessage(message);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from the server');
    });
}

function printMessage(message) {
    const messageList = document.getElementById('message-list');
    const listItem = document.createElement('li');
    listItem.textContent = message.content;
    messageList.appendChild(listItem);
}