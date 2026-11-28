// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

/* global t, LANG, STRINGS, setLang, loadLanguagePacks, applyStaticStrings -- defined in i18n.js */

const SPARK_POINTS = 60;
const STALE_MS = 15000;

const $ = id => document.getElementById(id);
const isSet = v => v !== null && v !== undefined;

// ---------- formatting ----------

function num(v, digits = 1) {
  return !isSet(v) || Number.isNaN(v) ? null : Number(v).toFixed(digits);
}

function fmtPct(v) {
  const n = num(v);
  return n === null ? '—' : `${n} %`;
}

function fmtBytes(b) {
  if (!isSet(b)) return '—';
  const units = t('units_bytes');
  let i = 0;
  let v = Number(b);
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtRate(bps) {
  return isSet(bps) ? `${fmtBytes(bps)}/s` : '—';
}

function fmtMHz(v) {
  if (!isSet(v)) return '—';
  return v >= 1000 ? `${(v / 1000).toFixed(2)} GHz` : `${Math.round(v)} MHz`;
}

function fmtDuration(s) {
  if (!isSet(s)) return '—';
  s = Math.floor(s);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return t('dur_days', { d, h, m });
  return h > 0 ? `${h} h ${m} min` : `${m} min ${s % 60} s`;
}

function levelClass(pct, warn = 70, danger = 90) {
  return pct >= danger ? 'danger' : pct >= warn ? 'warn' : '';
}

function errorText(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return t(`err_${err.code}`, { detail: err.detail ?? '' });
}

// ---------- DOM helpers ----------

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (!isSet(v)) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (!isSet(c)) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function barRow(label, pct, valueText, cls) {
  const width = Math.max(0, Math.min(100, pct ?? 0));
  return el(
    'div',
    { class: 'bar-row' },
    el('span', { class: 'label', title: label, text: label }),
    el('div', { class: 'bar' }, el('span', { class: cls ?? levelClass(width), style: `width:${width}%` })),
    el('span', { class: 'value', text: valueText })
  );
}

function stackedBar(parts) {
  return el(
    'div',
    { class: 'bar' },
    parts.map(p =>
      el('span', { class: p.cls ?? '', style: `width:${Math.max(0, Math.min(100, p.pct))}%`, title: p.title })
    )
  );
}

function kvList(target, rows) {
  target.replaceChildren(
    ...rows
      .filter(([, v]) => isSet(v) && v !== '')
      .flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: String(v) })])
  );
}

function emptyMsg(text) {
  return el('p', { class: 'muted small', text });
}

function table(headers, rows, style) {
  return el(
    'table',
    { class: 'table', style },
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        headers.map(([text, cls]) => el('th', { class: cls, text }))
      )
    ),
    el('tbody', {}, rows)
  );
}

// ---------- KPI tiles with sparklines ----------

function sumDisk(m, key) {
  return (m.disk?.io ?? []).reduce((a, d) => a + (d[key] ?? 0), 0);
}

const KPIS = [
  {
    id: 'cpu',
    label: 'kpi_cpu',
    value: m => fmtPct(m.cpu?.usage),
    spark: m => m.cpu?.usage,
    sub: m =>
      [
        t('cores_n', { n: m.cpu?.count ?? '?' }),
        fmtMHz(m.cpu?.freq_avg_mhz),
        m.cpu?.iowait ? `iowait ${num(m.cpu.iowait)} %` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    max: 100,
  },
  {
    id: 'mem',
    label: 'kpi_mem',
    value: m => fmtPct(m.mem?.percent),
    spark: m => m.mem?.percent,
    sub: m => `${fmtBytes(m.mem?.used)} / ${fmtBytes(m.mem?.total)}`,
    max: 100,
  },
  {
    id: 'temp',
    label: 'kpi_temp',
    value: m => (isSet(m.temps?.max) ? `${num(m.temps.max)} °C` : '—'),
    spark: m => m.temps?.max,
    sub: m => {
      const zones = m.temps?.zones ?? [];
      if (!zones.length) return t('no_sensor');
      const hot = zones.reduce((a, z) => (z.c > a.c ? z : a));
      return `${tempGroup(hot.name).label} · ${t('temp_group_sub', { n: zones.length, avg: num(zones.reduce((s, z) => s + z.c, 0) / zones.length) })}`;
    },
    available: m => isSet(m.temps?.max),
  },
  {
    id: 'gpu',
    label: 'kpi_gpu',
    value: m => (isSet(m.gpu?.busy) ? fmtPct(m.gpu.busy) : m.gpu?.present ? t('active_unknown') : '—'),
    spark: m => m.gpu?.busy,
    sub: m => (m.gpu?.present ? `${m.gpu.name ?? 'GPU'} · ${fmtMHz(m.gpu.freq_mhz)}` : t('not_detected')),
    available: m => m.gpu?.present,
    max: 100,
  },
  {
    id: 'npu',
    label: 'kpi_npu',
    value: m => (isSet(m.npu?.busy) ? fmtPct(m.npu.busy) : m.npu?.present ? (m.npu.state ?? t('present')) : '—'),
    spark: m => m.npu?.busy,
    sub: m =>
      m.npu?.present
        ? [t('n_procs', { n: (m.npu.users ?? []).length }), m.npu.freq_mhz ? fmtMHz(m.npu.freq_mhz) : null]
            .filter(Boolean)
            .join(' · ')
        : t('not_detected'),
    available: m => m.npu?.present,
    max: 100,
  },
  {
    id: 'net',
    label: 'kpi_net',
    value: m => `↓ ${fmtRate(m.net?.rx_bps)}`,
    spark: m => (m.net?.rx_bps ?? 0) + (m.net?.tx_bps ?? 0),
    sub: m => `↑ ${fmtRate(m.net?.tx_bps)}`,
  },
  {
    id: 'disk',
    label: 'kpi_disk',
    value: m => `${t('read_short')} ${fmtRate(sumDisk(m, 'read_bps'))}`,
    spark: m => sumDisk(m, 'read_bps') + sumDisk(m, 'write_bps'),
    sub: m => `${t('write_short')} ${fmtRate(sumDisk(m, 'write_bps'))}`,
  },
  {
    id: 'load',
    label: 'kpi_load',
    value: m => (m.load ? num(m.load[0], 2) : '—'),
    spark: m => m.load?.[0],
    sub: m => (m.load ? `5 min ${num(m.load[1], 2)} · 15 min ${num(m.load[2], 2)}` : ''),
  },
  {
    id: 'uptime',
    label: 'kpi_uptime',
    value: m => fmtDuration(m.uptime_s),
    sub: m => t('procs_threads', { p: m.procs?.count ?? '?', t: m.procs?.threads ?? '?' }),
  },
];

const kpiNodes = {};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function sparkline(canvas, max) {
  return new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: cssVar('--teal'),
          backgroundColor: cssVar('--teal-soft'),
          fill: true,
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: { x: { display: false }, y: { display: false, min: 0, suggestedMax: max } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

function buildKpis() {
  const root = $('kpis');
  for (const k of KPIS) {
    const value = el('div', { class: 'kpi-value', text: '—' });
    const sub = el('div', { class: 'kpi-sub' });
    const card = el('div', { class: 'kpi' }, el('div', { class: 'kpi-label', text: t(k.label) }), value, sub);
    let chart = null;
    if (k.spark) {
      const canvas = el('canvas');
      card.append(canvas);
      chart = sparkline(canvas, k.max);
    }
    root.append(card);
    kpiNodes[k.id] = { card, value, sub, chart };
  }
}

function pushSpark(chart, label, value) {
  const d = chart.data;
  d.labels.push(label);
  d.datasets[0].data.push(value ?? null);
  while (d.labels.length > SPARK_POINTS) {
    d.labels.shift();
    d.datasets[0].data.shift();
  }
  chart.update('none');
}

// ---------- live rendering ----------

function renderKpis(m) {
  const label = new Date(m.ts).toLocaleTimeString(LANG);
  for (const k of KPIS) {
    const n = kpiNodes[k.id];
    n.value.textContent = k.value(m);
    n.sub.textContent = k.sub ? k.sub(m) : '';
    n.card.classList.toggle('na', k.available ? !k.available(m) : false);
    if (n.chart) pushSpark(n.chart, label, k.spark(m));
  }
}

function renderCores(m) {
  const cores = m.cpu?.cores ?? [];
  const types = (lastInfo?.cpu?.types ?? []).map(c => `${c.count}× ${c.name}`).join(' + ');
  $('cpu-meta').textContent = [types, lastInfo?.cpu?.governor ? t('governor', { g: lastInfo.cpu.governor }) : null]
    .filter(Boolean)
    .join(' · ');
  $('cores').replaceChildren(
    ...(cores.length
      ? cores.map(c => barRow(t('core_n', { n: c.id }), c.usage, `${fmtPct(c.usage)} · ${fmtMHz(c.mhz)}`))
      : [emptyMsg(t('no_core_data'))])
  );
}

function renderMemory(m) {
  const mem = m.mem ?? {};
  const pct = v => (mem.total ? (v / mem.total) * 100 : 0);
  const used = mem.used ?? 0;
  const cache = Math.min(mem.cached ?? 0, Math.max(0, (mem.total ?? 0) - used));
  const dl = el('dl', { class: 'kv', style: 'margin-top:8px' });
  kvList(dl, [
    [t('used'), `${fmtBytes(mem.used)} (${fmtPct(mem.percent)})`],
    [t('available'), fmtBytes(mem.available)],
    [t('cache_buffers'), `${fmtBytes(mem.cached)} / ${fmtBytes(mem.buffers)}`],
    [t('shared'), mem.shared ? fmtBytes(mem.shared) : null],
    [t('total'), fmtBytes(mem.total)],
    [
      t('swap'),
      mem.swap_total
        ? `${fmtBytes(mem.swap_used)} / ${fmtBytes(mem.swap_total)} (${fmtPct(mem.swap_percent)})${mem.zram ? ' · zram' : ''}`
        : t('none'),
    ],
  ]);
  $('memory').replaceChildren(
    stackedBar([
      { pct: pct(used), cls: levelClass(pct(used), 80, 95), title: t('used') },
      { pct: pct(cache), cls: 'soft', title: t('cache') },
    ]),
    dl
  );
}

// Thermal zone names differ per SoC (cpu-1-0-0-thermal, nsp-0-1-0-thermal, pmm8650au_1_sdram,
// cpuss0-thermal…): each zone is put in a group shown as one bar with its hottest value.
const TEMP_GROUPS = [
  { key: 'tg_cpu', test: /^(cpu|cpuss|mapss|apc|cluster)/ },
  { key: 'tg_npu', test: /^(nsp|npu|cdsp|q6|hexagon)/ },
  { key: 'tg_gpu', test: /^(gpu|gpuss)/ },
  { key: 'tg_memory', test: /(ddr|sdram|dram|lpddr)/ },
  { key: 'tg_media', test: /^(video|cam|camera|camss|audio|lpass|mdp|display)/ },
  { key: 'tg_connect', test: /^(wlan|wifi|pcie|mdm|modem|usb|ethernet)/ },
  { key: 'tg_soc', test: /^(aoss|hm-|soc|center|tsens)/ },
  { key: 'tg_power', test: /^(pm|xo|batt|bms|charger|ufs|sdhc|emmc|board|skin|therm)|_xo|mbg|-therm$/ },
];

function tempGroup(zoneName) {
  const name = zoneName.toLowerCase();
  // cpu-1-0-0 / cpuss-1-0: the first number is the CPU cluster.
  const cluster = name.match(/^cpu(?:ss)?-(\d+)-/);
  if (cluster) return { id: `cpu${cluster[1]}`, label: t('tg_cpu_cluster', { n: cluster[1] }), order: 0 };
  const i = TEMP_GROUPS.findIndex(g => g.test.test(name));
  const g = i >= 0 ? TEMP_GROUPS[i] : { key: 'tg_other' };
  return { id: g.key, label: t(g.key), order: i >= 0 ? i : TEMP_GROUPS.length };
}

function groupTemps(zones) {
  const groups = new Map();
  for (const z of zones) {
    const g = tempGroup(z.name);
    if (!groups.has(g.id)) groups.set(g.id, { ...g, zones: [] });
    groups.get(g.id).zones.push(z);
  }
  return [...groups.values()]
    .map(g => {
      const hot = g.zones.reduce((a, z) => (z.c > a.c ? z : a));
      const avg = g.zones.reduce((s, z) => s + z.c, 0) / g.zones.length;
      return { ...g, max: hot.c, hottest: hot.name, avg };
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

let tempDetailsOpen = false;

function renderTemps(m) {
  const zones = m.temps?.zones ?? [];
  if (!zones.length) {
    $('temps').replaceChildren(emptyMsg(t('no_thermal')));
    return;
  }
  const rows = groupTemps(zones).map(g => {
    const row = barRow(g.label, g.max, `${num(g.max)} °C`, levelClass(g.max, 70, 85));
    row.title = t('temp_hottest', { name: g.hottest });
    const sub = g.zones.length > 1 ? t('temp_group_sub', { n: g.zones.length, avg: num(g.avg) }) : t('temp_group_one');
    return el('div', { class: 'temp-group' }, row, el('div', { class: 'muted small temp-sub', text: sub }));
  });
  const details = el(
    'details',
    { class: 'temp-details' },
    el('summary', { class: 'small', text: t('temp_show_all', { n: zones.length }) }),
    el(
      'div',
      { class: 'bars' },
      [...zones].sort((a, b) => b.c - a.c).map(z => barRow(z.name, z.c, `${num(z.c)} °C`, levelClass(z.c, 70, 85)))
    )
  );
  details.open = tempDetailsOpen;
  details.addEventListener('toggle', () => {
    tempDetailsOpen = details.open;
  });
  $('temps').replaceChildren(...rows, details);
}

function accelBlock(title, a) {
  const head = el('div', { class: 'accel-title', text: title });
  if (!a?.present) return el('div', { class: 'accel-block' }, head, emptyMsg(t('accel_missing')));
  const users = (a.users ?? []).map(u => `${u.name} (${u.pid})`).join(', ');
  const dl = el('dl', { class: 'kv' });
  kvList(dl, [
    [t('accel_name'), a.name],
    [t('accel_busy'), isSet(a.busy) ? `${fmtPct(a.busy)} (${a.busy_source})` : t('accel_busy_na')],
    [
      t('accel_freq'),
      a.freq_mhz ? `${fmtMHz(a.freq_mhz)}${a.freq_max_mhz ? ` / ${fmtMHz(a.freq_max_mhz)}` : ''}` : null,
    ],
    [t('accel_state'), a.state],
    [t('accel_users'), users || t('accel_no_users')],
  ]);
  return el(
    'div',
    { class: 'accel-block' },
    head,
    isSet(a.busy) ? barRow(t('utilization'), a.busy, fmtPct(a.busy)) : null,
    dl
  );
}

function renderAccel(m) {
  $('accel').replaceChildren(accelBlock('GPU', m.gpu), accelBlock('NPU / DSP', m.npu));
}

function renderStorage(m) {
  const usage = m.disk?.usage ?? [];
  const io = m.disk?.io ?? [];
  $('storage').replaceChildren(
    el(
      'div',
      { class: 'bars' },
      usage.length
        ? usage.map(u =>
            barRow(u.mount, u.percent, `${fmtBytes(u.used)} / ${fmtBytes(u.total)}`, levelClass(u.percent, 80, 95))
          )
        : emptyMsg(t('no_usage'))
    ),
    io.length
      ? table(
          [[t('col_disk')], [t('col_read'), 'num'], [t('col_write'), 'num'], [t('col_total_rw'), 'num']],
          io.map(d =>
            el(
              'tr',
              {},
              el('td', { text: d.dev }),
              el('td', { class: 'num', text: fmtRate(d.read_bps) }),
              el('td', { class: 'num', text: fmtRate(d.write_bps) }),
              el('td', { class: 'num', text: `${fmtBytes(d.read_total)} / ${fmtBytes(d.write_total)}` })
            )
          ),
          'margin-top:10px'
        )
      : null
  );
}

function renderNetwork(m) {
  const ifaces = m.net?.ifaces ?? [];
  const wifi = Object.fromEntries((m.wifi ?? []).map(w => [w.iface, w]));
  const addrs = lastInfo?.network?.addresses ?? {};
  $('network').replaceChildren(
    ifaces.length
      ? table(
          [[t('col_iface')], ['↓', 'num'], ['↑', 'num'], [t('col_total_net'), 'num']],
          ifaces.map(i => {
            const w = wifi[i.iface];
            const extra = [i.state, w ? `${w.signal_dbm} dBm` : null, ...(addrs[i.iface] ?? [])]
              .filter(Boolean)
              .join(' · ');
            return el(
              'tr',
              {},
              el('td', {}, el('div', { text: i.iface }), el('div', { class: 'muted small', text: extra })),
              el('td', { class: 'num', text: fmtRate(i.rx_bps) }),
              el('td', { class: 'num', text: fmtRate(i.tx_bps) }),
              el('td', { class: 'num', text: `${fmtBytes(i.rx_total)} / ${fmtBytes(i.tx_total)}` })
            );
          })
        )
      : emptyMsg(t('no_iface'))
  );
}

function renderProcs(m) {
  const top = m.procs?.top ?? [];
  $('proc-meta').textContent = [
    t('n_procs', { n: m.procs?.count ?? '?' }),
    m.scope === 'container' ? t('container_view_limited') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  $('procs').replaceChildren(
    ...top.map(p =>
      el(
        'tr',
        {},
        el('td', { text: p.name }),
        el('td', { text: p.pid }),
        el('td', { class: 'num', text: fmtPct(p.cpu) }),
        el('td', { class: 'num', text: fmtBytes(p.rss) })
      )
    )
  );
}

function setSource(source, fallback) {
  const badge = $('source-badge');
  const key = fallback ? 'src_fallback' : source === 'host-agent' ? 'src_host' : 'src_container';
  badge.textContent = t(key);
  badge.title = t(`${key}_tip`);
}

function showWarning(err) {
  const warn = $('warning-container');
  warn.textContent = errorText(err);
  warn.hidden = !err;
}

let lastMetricsAt = 0;
let liveDotTimer = null;

function onMetrics(m) {
  lastMetricsAt = Date.now();
  renderKpis(m);
  renderCores(m);
  renderMemory(m);
  renderTemps(m);
  renderAccel(m);
  renderStorage(m);
  renderNetwork(m);
  renderProcs(m);
  setSource(m.source, m.fallback);
  showWarning(m.error);

  const dot = $('live-dot');
  dot.classList.add('on');
  clearTimeout(liveDotTimer);
  liveDotTimer = setTimeout(() => dot.classList.remove('on'), STALE_MS);
  $('last-update').textContent = t('updated_at', { time: new Date(m.ts).toLocaleTimeString(LANG) });
}

// ---------- system / firmware tab ----------

let lastInfo = null;

function firmwareRow(f) {
  const component = t(`fw_${f.kind}`, { name: f.name ?? '' }).trim();
  const detail = [
    f.detail,
    f.state ? t('fw_state', { s: f.state }) : null,
    f.driver ? t('fw_driver', { d: f.driver }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return el(
    'tr',
    {},
    el('td', { text: component }),
    el('td', { text: f.version ?? '—' }),
    el('td', { class: 'muted', text: detail }),
    el('td', { class: 'muted small', text: f.source })
  );
}

function onInfo(payload) {
  showWarning(payload?.error);
  const info = payload?.info;
  if (!info) return;
  lastInfo = info;
  const b = info.board ?? {};
  $('board-name').textContent = b.model ?? b.hostname ?? t('unknown_board');
  const fam = $('board-family');
  fam.hidden = !b.family;
  fam.textContent = b.family ?? '';
  if (payload.source) setSource(payload.source);

  kvList($('sys-board'), [
    [t('b_model'), b.model],
    [t('b_family'), b.family],
    [t('b_soc'), [b.soc, b.soc_revision ? t('b_rev', { r: b.soc_revision }) : null].filter(Boolean).join(' ')],
    [t('b_soc_family'), b.soc_family],
    [t('b_soc_id'), b.soc_id],
    [t('b_soc_vendor'), b.soc_vendor],
    [t('b_serial'), b.serial],
    [t('b_compatible'), b.compatible],
    [t('b_hostname'), b.hostname],
    [
      t('b_cpu'),
      (info.cpu?.types ?? []).map(c => `${c.count}× ${c.name}`).join(' + ') ||
        (info.cpu?.count ? t('cores_n', { n: info.cpu.count }) : null),
    ],
    [t('b_max_freq'), info.cpu?.max_mhz ? fmtMHz(info.cpu.max_mhz) : null],
  ]);

  const k = info.kernel ?? {};
  kvList($('sys-kernel'), [
    [t('k_version'), k.release],
    [t('k_build'), k.version],
    [t('k_arch'), k.arch],
    [t('k_preempt'), k.preempt],
    [t('k_compiler'), k.compiler],
    [t('k_modules'), k.modules],
    [t('k_taint'), k.tainted === 0 ? t('k_taint_clean') : k.tainted],
    [
      t('k_boot'),
      Object.entries(k.boot_params ?? {})
        .map(([a, v]) => `${a}=${v}`)
        .join(' '),
    ],
    [t('k_cmdline'), k.cmdline],
  ]);

  const os = info.os ?? {};
  kvList($('sys-os'), [
    [t('os_system'), os.name],
    [t('os_version'), os.version],
    [t('os_build'), os.build],
    [t('os_note'), os.is_container_image ? t('os_container_note') : null],
    [t('os_collector'), info.collector ? `sysmon-collector ${info.collector} (Rust)` : t('os_fallback')],
    [t('os_view'), info.scope === 'container' ? t('os_view_container') : t('os_view_host')],
  ]);

  const net = info.network ?? {};
  kvList(
    $('sys-net'),
    Object.keys({ ...(net.mac ?? {}), ...(net.addresses ?? {}) }).map(i => [
      i,
      [...(net.addresses?.[i] ?? []), net.mac?.[i] ? `MAC ${net.mac[i]}` : null].filter(Boolean).join(' · '),
    ])
  );

  const fw = info.firmware ?? [];
  $('sys-firmware').replaceChildren(
    ...(fw.length ? fw.map(firmwareRow) : [el('tr', {}, el('td', { colspan: 4, class: 'muted', text: t('fw_none') }))])
  );
  $('firmware-note').textContent = info.scope === 'container' ? t('fw_container_note') : '';
}

async function runProbe() {
  const out = $('probe-out');
  out.hidden = false;
  out.textContent = t('diag_running');
  try {
    const r = await fetch(`http://${window.location.host}/probe`);
    out.textContent = JSON.stringify(await r.json(), null, 2);
  } catch (e) {
    out.textContent = t('error_prefix', { msg: e.message });
  }
}

// ---------- history ----------

const HISTORY = [
  { title: 'h_cpu', max: 100, series: [{ m: 'cpu', label: 'CPU' }] },
  {
    title: 'h_mem',
    max: 100,
    series: [
      { m: 'mem', label: 'RAM' },
      { m: 'swap', label: 'Swap' },
    ],
  },
  { title: 'h_temp', series: [{ m: 'temp', label: 's_temp' }] },
  { title: 'h_gpu', max: 100, series: [{ m: 'gpu', label: 'GPU' }] },
  { title: 'h_npu', max: 100, series: [{ m: 'npu', label: 'NPU' }] },
  { title: 'h_load', series: [{ m: 'load1', label: 's_load' }] },
  {
    title: 'h_freq',
    series: [
      { m: 'cpu_freq', label: 'CPU' },
      { m: 'gpu_freq', label: 'GPU' },
    ],
  },
  {
    title: 'h_net',
    series: [
      { m: 'net_rx', label: 's_rx' },
      { m: 'net_tx', label: 's_tx' },
    ],
  },
  {
    title: 'h_disk',
    series: [
      { m: 'disk_r', label: 's_read' },
      { m: 'disk_w', label: 's_write' },
    ],
  },
];
const PALETTE = ['#008184', '#e47128', '#2c353a', '#aa4335'];
const historyCharts = [];

async function fetchSamples(measure, range, windowSize) {
  try {
    const r = await fetch(`http://${window.location.host}/get_samples/${measure}/${range}/${windowSize}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error(data?.error ?? t('invalid_response'));
    return data;
  } catch (e) {
    console.log(`get_samples ${measure}: ${e.message}`);
    return [];
  }
}

function timeLabel(ts, range) {
  const d = new Date(ts);
  if (range === '-7d') return d.toLocaleString(LANG, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' });
}

async function loadHistory(range, windowSize, caption) {
  $('history-caption').textContent = t('history_caption', { range: caption, window: windowSize });
  historyCharts.splice(0).forEach(c => c.destroy());
  const root = $('history-charts');
  root.replaceChildren();
  const results = await Promise.all(
    HISTORY.map(h => Promise.all(h.series.map(s => fetchSamples(s.m, range, windowSize))))
  );
  HISTORY.forEach((h, i) => {
    const card = el('div', { class: 'card' }, el('h2', { text: t(h.title) }));
    root.append(card);
    const sets = results[i];
    const times = [...new Set(sets.flat().map(p => new Date(p.ts).getTime()))].sort((a, b) => a - b);
    if (times.length === 0) {
      card.append(el('div', { class: 'nodata muted' }, el('img', { src: './img/nodata.svg', alt: '' }), t('no_data')));
      return;
    }
    const canvas = el('canvas');
    card.append(canvas);
    const datasets = h.series.map((s, j) => {
      const byTs = new Map(sets[j].map(p => [new Date(p.ts).getTime(), p.value]));
      return {
        label: t(s.label),
        data: times.map(ts => byTs.get(ts) ?? null),
        borderColor: PALETTE[j],
        backgroundColor: j === 0 ? cssVar('--teal-soft') : 'transparent',
        fill: j === 0,
        pointRadius: 0,
        borderWidth: 1.8,
        tension: 0.25,
        spanGaps: true,
      };
    });
    historyCharts.push(
      new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: times.map(ts => timeLabel(ts, range)), datasets },
        options: {
          responsive: true,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { min: 0, suggestedMax: h.max },
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          },
          plugins: {
            legend: { display: h.series.length > 1 },
            tooltip: {
              callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y === null ? '—' : c.parsed.y.toFixed(1)}` },
            },
          },
        },
      })
    );
  });
}

// ---------- start ----------

function buildLangSwitch() {
  const root = $('lang-switch');
  root.replaceChildren(
    ...Object.keys(STRINGS).map(code => {
      const b = el('button', { class: `lang-btn${code === LANG ? ' active' : ''}`, text: code.toUpperCase() });
      b.addEventListener('click', () => setLang(code));
      return b;
    })
  );
}

async function start() {
  await loadLanguagePacks();
  applyStaticStrings();
  buildLangSwitch();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'history') loadHistory(tab.dataset.range, tab.dataset.window, tab.textContent.trim());
    });
  });
  $('probe-btn').addEventListener('click', runProbe);

  Chart.defaults.font.family = "'Open Sans', sans-serif";
  Chart.defaults.color = '#2c353a';
  Chart.defaults.borderColor = '#c9d2d2';
  buildKpis();

  const ui = new WebUI();
  ui.on_connect(() => {
    $('error-container').hidden = true;
  });
  ui.on_disconnect(() => {
    const e = $('error-container');
    e.textContent = t('connection_lost');
    e.hidden = false;
  });
  ui.on_message('metrics', onMetrics);
  ui.on_message('info', onInfo);

  fetch(`http://${window.location.host}/info`)
    .then(r => r.json())
    .then(onInfo)
    .catch(() => {});

  setInterval(() => {
    if (lastMetricsAt && Date.now() - lastMetricsAt > STALE_MS) $('last-update').textContent = t('no_recent_data');
  }, 5000);
}

start();
