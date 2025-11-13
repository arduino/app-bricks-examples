// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

const cpuUsageLive = {
    canvas: null,
    chart: null,
    data: newChartData('blue', 'rgba(0,0,255,0.1)')
};

const memoryUsageLive = {
    canvas: null,
    chart: null,
    data: newChartData('green', 'rgba(0,255,0,0.1)')
};

const cpuUsage1h = {
    canvas: null,
    chart: null,
    data: newChartData('blue', 'rgba(0,0,255,0.1)')
};

const memoryUsage1h = {
    canvas: null,
    chart: null,
    data: newChartData('green', 'rgba(0,255,0,0.1)')
};

const cpuUsage1d = {
    canvas: null,
    chart: null,
    data: newChartData('blue', 'rgba(0,0,255,0.1)')
};

const memoryUsage1d = {
    canvas: null,
    chart: null,
    data: newChartData('green', 'rgba(0,255,0,0.1)')
};

let liveCircleTimeout = null;
const noDataTimeout = 10000; // 10 seconds
let errorContainer;


document.addEventListener('DOMContentLoaded', () => {
    // Initialize charts
    cpuUsageLive.canvas = document.getElementById('cpu-usage-live-chart');
    memoryUsageLive.canvas = document.getElementById('memory-usage-live-chart');
    cpuUsage1h.canvas = document.getElementById('cpu-usage-1h-chart');
    memoryUsage1h.canvas = document.getElementById('memory-usage-1h-chart');
    cpuUsage1d.canvas = document.getElementById('cpu-usage-1d-chart');
    memoryUsage1d.canvas = document.getElementById('memory-usage-1d-chart');
    errorContainer = document.getElementById('error-container');

    // The live circle is hidden initially until data come
    const liveCircle = document.getElementById('live-circle');
    liveCircle.style.display = 'none';

    // Tab switching logic
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });
    document.querySelector('.tab[data-tab="historical-1h"]').addEventListener('click', async () => {
        const cpu_samples = await listSamples("cpu", "-1h", "5m");
        renderChartData(cpuUsage1h, cpu_samples, 12, true, false);
        const memory_samples = await listSamples("mem", "-1h", "5m");
        renderChartData(memoryUsage1h, memory_samples, 12, true, false);
    });
    document.querySelector('.tab[data-tab="historical-1d"]').addEventListener('click', async () => {
        const cpu_samples = await listSamples("cpu", "-1d", "1h");
        renderChartData(cpuUsage1d, cpu_samples, 24, false, false);
        const memory_samples = await listSamples("mem", "-1d", "1h");
        renderChartData(memoryUsage1d, memory_samples, 24, false, false);
    });

    // Popover logic for CPU and Memory info buttons
    const cpuPopoverText = "Shows the percentage of CPU used. Data is average per 1h (1D view) or per 1 minute (1h view)";
    const memoryPopoverText = "Displays the percentage of memory used. Data is average per 1h (1D view) or per 1 minute (1h view)";
    document.querySelectorAll('.info-btn.cpu').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = cpuPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });

    document.querySelectorAll('.info-btn.memory').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = memoryPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });

    initSocketIO();
});

function initSocketIO() {
    socket.on('connect', () => {
        if (errorContainer) {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }
    });

    socket.on('disconnect', (reason) => {
        if (errorContainer) {
            errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
            errorContainer.style.display = 'block';
        }
    });

    socket.on('cpu_usage', (message) => {
        renderChartData(cpuUsageLive, [message]);
    });

    socket.on('memory_usage', (message) => {
        renderChartData(memoryUsageLive, [message]);
    });
}

async function listSamples(resource, start, aggr_window) {
    try {
        const response = await fetch(`http://${window.location.host}/get_samples/${resource}/${start}/${aggr_window}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) {
            console.log(`Failed to get samples: ${data.error}`);
            return;
        }
        return data;
    } catch (error) {
        console.log(`Error fetching samples: ${error.message}`);
    }
}

function renderChartData(obj, messages, maxPoints = 20, showMinutes = true, showSeconds = true) {
    if (!messages || messages.length === 0) {
        return;
    }

    const noDataDiv = document.getElementById(obj.canvas.id + '-nodata');
    const liveCircle = document.getElementById('live-circle');
    const isLiveChart = obj.canvas && (obj.canvas.id === 'cpu-usage-live-chart' || obj.canvas.id === 'memory-usage-live-chart');

    // Only clear data for non-live charts
    if (!isLiveChart) {
        obj.data.labels = [];
        obj.data.datasets[0].data = [];
    }

    for (const message of messages) {
        if (!message.ts) {
            console.warn('Invalid message format:', message);
            continue;
        }
        if (showSeconds && !showMinutes) {
            console.warn('Cannot show seconds without minutes');
            continue;
        }

        let date = new Date(message.ts);
        if (showMinutes && showSeconds) {
            date = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
        } else if (showMinutes) {
            date = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } else {
            date = date.toLocaleTimeString([], {hour: '2-digit'});
        }

        obj.data.labels.push(date);
        obj.data.datasets[0].data.push(message.value);

        // Keep only the n points
        if (obj.data.labels.length > maxPoints) {
            obj.data.labels.shift();
            obj.data.datasets[0].data.shift();
        }

        if (obj.data.labels.length === 0 || obj.data.datasets[0].data.length === 0) {
            obj.canvas.style.display = 'none';
            if (noDataDiv) noDataDiv.style.display = 'flex';
            if (isLiveChart && liveCircle) {
                liveCircle.style.display = 'none';
                liveCircle.classList.remove('flash');
                if (liveCircleTimeout) {
                    clearTimeout(liveCircleTimeout);
                    liveCircleTimeout = null;
                }
            }
            if (obj.chart) {
                obj.chart.destroy();
                obj.chart = null;
            }
        } else {
            obj.canvas.style.display = 'block';
            if (noDataDiv) noDataDiv.style.display = 'none';
            if (isLiveChart && liveCircle) {
                liveCircle.style.display = 'flex';
                liveCircle.classList.add('flash');
                if (liveCircleTimeout) clearTimeout(liveCircleTimeout);
                liveCircleTimeout = setTimeout(() => {
                    liveCircle.classList.remove('flash');
                    liveCircle.style.display = 'none';
                }, noDataTimeout);
            }
            if (!obj.chart) {
                obj.chart = newChart(obj.canvas.getContext('2d'), obj.data);
            } else {
                obj.chart.update();
            }
        }
    }
}

function newChart(ctx, chartData) {
    return new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: { min: 0, max: 100 },
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            // This allows showing tooltip when hovering over the chart
            // even if the mouse is not over a point
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        title: function() { return ''; },
                        label: function(context) {
                            return `${context.label} - ${context.parsed.y.toFixed(1)} %`;
                        }
                    }
                },
                noDataMessage: true // Enable the plugin
            }
        }
    });
}

function newChartData(borderColor, backgroundColor) {
    return {
        labels: [],
        datasets: [{
            data: [],
            borderColor: borderColor,
            backgroundColor: backgroundColor,
            fill: true,
        }]
    };
}
