// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

/*
 * Socket initialization. We need it to communicate with the server
 */
const socket = io(`http://${window.location.host}`); // Initialize socket.io connection

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
    setupButtonListeners();
});

function initSocketIO() {
    socket.on('connect', () => {
        console.log('Connected to the server via websocket');
    });


    socket.on('disconnect', () => {
        console.log('Disconnected from the server');
    });
}

function setupButtonListeners() {
    const websocketButton = document.getElementById('websocket-button');
    const httpButton = document.getElementById('http-button');

    if (websocketButton) {
        websocketButton.addEventListener('click', () => {
            socket.emit('print_message', {});
            console.log('WebSocket message sent with event id: print_message');
        });
    }

    if (httpButton) {
        httpButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/print_message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                if (response.ok) {
                    console.log('HTTP POST request sent successfully');
                } else {
                    console.error('HTTP POST request failed:', response.status);
                }
            } catch (error) {
                console.error('Error sending HTTP POST request:', error);
            }
        });
    }
}