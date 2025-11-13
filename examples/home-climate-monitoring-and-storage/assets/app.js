// SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
//
// SPDX-License-Identifier: MPL-2.0

const socket = io(`http://${window.location.host}`);

// Temperature and Humidity chart objects
const temperatureLive = { canvas: null, chart: null, data: newChartData('orange', 'rgba(255,165,0,0.1)'), unit: '°C' };
const humidityLive = { canvas: null, chart: null, data: newChartData('teal', 'rgba(0,128,128,0.08)'), unit: '%' };

const temperature1h = { canvas: null, chart: null, data: newChartData('orange', 'rgba(255,165,0,0.1)'), unit: '°C' };
const humidity1h = { canvas: null, chart: null, data: newChartData('teal', 'rgba(0,128,128,0.08)'), unit: '%' };

const temperature1d = { canvas: null, chart: null, data: newChartData('orange', 'rgba(255,165,0,0.1)'), unit: '°C' };
const humidity1d = { canvas: null, chart: null, data: newChartData('teal', 'rgba(0,128,128,0.08)'), unit: '%' };

// Derived metrics objects
const dewPointLive = { canvas: null, chart: null, data: newChartData('blue', 'rgba(0,0,255,0.08)'), unit: '°C' };
const heatIndexLive = { canvas: null, chart: null, data: newChartData('red', 'rgba(255,0,0,0.08)'), unit: '°C' };
const absHumidityLive = { canvas: null, chart: null, data: newChartData('purple', 'rgba(128,0,128,0.06)'), unit: 'g/m³' };

const dewPoint1h = { canvas: null, chart: null, data: newChartData('blue', 'rgba(0,0,255,0.08)'), unit: '°C' };
const heatIndex1h = { canvas: null, chart: null, data: newChartData('red', 'rgba(255,0,0,0.08)'), unit: '°C' };
const absHumidity1h = { canvas: null, chart: null, data: newChartData('purple', 'rgba(128,0,128,0.06)'), unit: 'g/m³' };

const dewPoint1d = { canvas: null, chart: null, data: newChartData('blue', 'rgba(0,0,255,0.08)'), unit: '°C' };
const heatIndex1d = { canvas: null, chart: null, data: newChartData('red', 'rgba(255,0,0,0.08)'), unit: '°C' };
const absHumidity1d = { canvas: null, chart: null, data: newChartData('purple', 'rgba(128,0,128,0.06)'), unit: 'g/m³' };

let liveCircleTimeout = null;
const noDataTimeout = 10000; // 10 seconds

let errorContainer;


document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvases
    temperatureLive.canvas = document.getElementById('temperature-live-chart');
    humidityLive.canvas = document.getElementById('humidity-live-chart');
    temperature1h.canvas = document.getElementById('temperature-1h-chart');
    humidity1h.canvas = document.getElementById('humidity-1h-chart');
    temperature1d.canvas = document.getElementById('temperature-1d-chart');
    humidity1d.canvas = document.getElementById('humidity-1d-chart');
    // Derived metrics canvases
    dewPointLive.canvas = document.getElementById('dew_point-live-chart');
    heatIndexLive.canvas = document.getElementById('heat_index-live-chart');
    absHumidityLive.canvas = document.getElementById('absolute_humidity-live-chart');
    dewPoint1h.canvas = document.getElementById('dew_point-1h-chart');
    heatIndex1h.canvas = document.getElementById('heat_index-1h-chart');
    absHumidity1h.canvas = document.getElementById('absolute_humidity-1h-chart');
    dewPoint1d.canvas = document.getElementById('dew_point-1d-chart');
    heatIndex1d.canvas = document.getElementById('heat_index-1d-chart');
    absHumidity1d.canvas = document.getElementById('absolute_humidity-1d-chart');

    // The live circle is hidden initially until data come
    const liveCircle = document.getElementById('live-circle');
    if (liveCircle) liveCircle.style.display = 'none';

    errorContainer = document.getElementById('error-container');

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
        const temperature_samples = await listSamples("temperature", "-1h", "5m");
        renderChartData(temperature1h, temperature_samples, 12, true, false);
        const humidity_samples = await listSamples("humidity", "-1h", "5m");
        renderChartData(humidity1h, humidity_samples, 12, true, false);
        const dew_samples = await listSamples("dew_point", "-1h", "5m");
        renderChartData(dewPoint1h, dew_samples, 12, true, false);
        const heat_samples = await listSamples("heat_index", "-1h", "5m");
        renderChartData(heatIndex1h, heat_samples, 12, true, false);
        const abs_samples = await listSamples("absolute_humidity", "-1h", "5m");
        renderChartData(absHumidity1h, abs_samples, 12, true, false);
    });
    document.querySelector('.tab[data-tab="historical-1d"]').addEventListener('click', async () => {
        const temperature_samples = await listSamples("temperature", "-1d", "1h");
        renderChartData(temperature1d, temperature_samples, 24, false, false);
        const humidity_samples = await listSamples("humidity", "-1d", "1h");
        renderChartData(humidity1d, humidity_samples, 24, false, false);
        const dew_samples = await listSamples("dew_point", "-1d", "1h");
        renderChartData(dewPoint1d, dew_samples, 24, false, false);
        const heat_samples = await listSamples("heat_index", "-1d", "1h");
        renderChartData(heatIndex1d, heat_samples, 24, false, false);
        const abs_samples = await listSamples("absolute_humidity", "-1d", "1h");
        renderChartData(absHumidity1d, abs_samples, 24, false, false);
    });

    // Popover logic for Temperature and Humidity info buttons
    const tempPopoverText = "Shows temperature readings in °C. Data is average per 1h (1D view) or per 1 minute (1h view)";
    const humidityPopoverText = "Shows relative humidity percentage. Data is average per 1h (1D view) or per 1 minute (1h view)";
    const dewPointPopoverText = "Dew Point is the temperature at which air becomes saturated with moisture. It indicates the absolute humidity level.";
    const heatIndexPopoverText = "Heat Index combines air temperature and relative humidity to determine the perceived temperature.";
    const absHumidityPopoverText = "Absolute Humidity is the total amount of water vapor present in the air, expressed in grams per cubic meter (g/m³).";
    document.querySelectorAll('.info-btn.temp').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = tempPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });
    document.querySelectorAll('.info-btn.humidity').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = humidityPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });
    document.querySelectorAll('.info-btn.dew').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = dewPointPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });
    document.querySelectorAll('.info-btn.heat').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = heatIndexPopoverText;
            popover.style.display = 'block';
        });
        img.addEventListener('mouseleave', () => {
            popover.style.display = 'none';
        });
    });
    document.querySelectorAll('.info-btn.abs').forEach(img => {
        img.style.position = 'relative';
        const popover = img.nextElementSibling;
        img.addEventListener('mouseenter', () => {
            popover.textContent = absHumidityPopoverText;
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

    // Temperature and Humidity live updates
    socket.on('temperature', (message) => {
        renderChartData(temperatureLive, [message]);
    });

    socket.on('humidity', (message) => {
        renderChartData(humidityLive, [message]);
    });
    socket.on('dew_point', (message) => {
        renderChartData(dewPointLive, [message]);
    });
    socket.on('heat_index', (message) => {
        renderChartData(heatIndexLive, [message]);
    });
    socket.on('absolute_humidity', (message) => {
        renderChartData(absHumidityLive, [message]);
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

    const noDataDiv = document.getElementById((obj.canvas && obj.canvas.id) + '-nodata');
    const liveCircle = document.getElementById('live-circle');
    const isLiveChart = obj.canvas && obj.canvas.id && obj.canvas.id.endsWith('-live-chart');

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
            if (obj.canvas) obj.canvas.style.display = 'none';
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
            if (obj.canvas) obj.canvas.style.display = 'block';
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
                obj.chart = newChart(obj.canvas.getContext('2d'), obj);
            } else {
                obj.chart.update();
            }
        }
    }
}

function newChart(ctx, obj) {
    return new Chart(ctx, {
        type: 'line',
        data: obj.data,
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: obj.unit === '%' ? { min: 0, max: 100 } : {},
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        title: function() { return ''; },
                        label: function(context) {
                            const unit = context.chart && context.chart.options && context.chart.options._unit ? context.chart.options._unit : (obj.unit || '');
                            // store unit in chart options for future reference
                            if (!context.chart.options._unit) context.chart.options._unit = obj.unit;
                            return `${context.label} - ${context.parsed.y.toFixed(1)} ${unit}`;
                        }
                    }
                },
                noDataMessage: true
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
