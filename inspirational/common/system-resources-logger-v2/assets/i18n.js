// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

// UI strings. English is the default; French is used when the browser prefers it,
// or when chosen with the EN / FR switch (remembered in localStorage).

const STRINGS = {
  en: {
    unknown_board: 'Unknown board',
    data_origin: 'Where the data comes from',
    live_data: 'Live data',
    tab_live: 'Live',
    tab_1h: '1 h',
    tab_24h: '24 h',
    tab_7d: '7 d',
    tab_system: 'System & firmware',
    waiting: 'waiting…',
    updated_at: 'updated {time}',
    no_recent_data: 'no recent data',
    connection_lost: 'Connection to the board lost. Please check the connection.',

    card_cores: 'CPU cores',
    card_memory: 'Memory',
    card_temps: 'Temperatures',
    card_accel: 'Accelerators (GPU / NPU)',
    card_storage: 'Storage',
    card_network: 'Network',
    card_procs: 'Processes',
    card_board: 'Board',
    card_kernel: 'Linux kernel',
    card_firmware: 'Firmware',
    card_os: 'Operating system',
    card_diag: 'Diagnostics',

    col_name: 'Name',
    col_pid: 'PID',
    col_cpu: 'CPU',
    col_memory: 'Memory',
    col_component: 'Component',
    col_version: 'Version / file',
    col_detail: 'Detail',
    col_source: 'Source',
    col_disk: 'Disk',
    col_read: 'Read',
    col_write: 'Write',
    col_total_rw: 'Total R / W',
    col_iface: 'Interface',
    col_total_net: 'Total ↓ / ↑',

    kpi_cpu: 'CPU',
    kpi_mem: 'Memory',
    kpi_temp: 'Max temperature',
    kpi_gpu: 'GPU',
    kpi_npu: 'NPU',
    kpi_net: 'Network',
    kpi_disk: 'Disk',
    kpi_load: 'Load average',
    kpi_uptime: 'Uptime',
    cores_n: '{n} cores',
    no_sensor: 'no sensor visible',
    not_detected: 'not detected',
    active_unknown: 'active?',
    present: 'present',
    n_procs: '{n} processes',
    procs_threads: '{p} processes · {t} threads',
    read_short: 'R',
    write_short: 'W',

    core_n: 'core {n}',
    governor: '{g} governor',
    no_core_data: 'No per-core data.',
    used: 'Used',
    available: 'Available',
    cache_buffers: 'Cache / buffers',
    shared: 'Shared',
    total: 'Total',
    swap: 'Swap',
    none: 'none',
    cache: 'cache',
    no_thermal: 'No thermal zone visible.',
    tg_cpu: 'CPU',
    tg_cpu_cluster: 'CPU cluster {n}',
    tg_npu: 'NPU / DSP',
    tg_gpu: 'GPU',
    tg_memory: 'Memory (RAM)',
    tg_media: 'Video / camera / audio',
    tg_connect: 'Connectivity (Wi-Fi, PCIe, modem)',
    tg_soc: 'Chip (always-on, center)',
    tg_power: 'Power & board',
    tg_other: 'Other',
    temp_group_sub: '{n} sensors ? avg {avg} ?C',
    temp_group_one: '1 sensor',
    temp_show_all: 'Show all {n} sensors',
    temp_hottest: 'hottest: {name}',
    accel_missing: 'Not detected on this board / kernel.',
    accel_name: 'Name',
    accel_busy: 'Utilization',
    accel_busy_na: 'not exposed by the kernel',
    accel_freq: 'Frequency',
    accel_state: 'Firmware state',
    accel_users: 'Used by',
    accel_no_users: 'no visible process',
    utilization: 'utilization',
    no_usage: 'No usage information.',
    no_iface: 'No interface visible.',
    container_view_limited: 'view limited to the App Lab container',

    src_fallback: 'fallback mode (psutil)',
    src_fallback_tip: 'The Rust collector is not running: only basic metrics are available.',
    src_host: 'host view (agent)',
    src_host_tip: 'Metrics read by the agent installed on the board: every process, Wi-Fi and the board OS.',
    src_container: 'container view',
    src_container_tip:
      'Metrics read from the App Lab container: processes and network are limited to the app. Install the host agent (README) for the full view.',

    err_collector_missing: 'sysmon-collector not found in python/bin (see README: build).',
    err_collector_start: 'Cannot start the collector: {detail}',
    err_collector_stopped: 'The collector stopped (code {detail}).',
    err_no_psutil: 'psutil is missing: no metrics available.',

    b_model: 'Model',
    b_family: 'Family',
    b_soc: 'SoC',
    b_rev: 'rev. {r}',
    b_soc_family: 'SoC family',
    b_soc_id: 'SoC ID',
    b_soc_vendor: 'SoC vendor',
    b_serial: 'Serial number',
    b_compatible: 'DT compatible',
    b_hostname: 'Hostname',
    b_cpu: 'CPU',
    b_max_freq: 'Max frequency',
    k_version: 'Version',
    k_build: 'Build',
    k_arch: 'Architecture',
    k_preempt: 'Preemption',
    k_compiler: 'Compiler',
    k_modules: 'Loaded modules',
    k_taint: 'Taint',
    k_taint_clean: '0 (clean)',
    k_boot: 'Boot parameters',
    k_cmdline: 'Command line',
    os_system: 'System',
    os_version: 'Version',
    os_build: 'Build',
    os_note: 'Note',
    os_container_note: 'Python image of the App Lab container (not the board OS)',
    os_collector: 'Collector',
    os_fallback: 'psutil (fallback)',
    os_view: 'View',
    os_view_container: 'App Lab container',
    os_view_host: 'host',

    fw_uefi: 'UEFI / BIOS',
    fw_ec: 'Embedded controller (EC)',
    fw_boot: 'Boot ({name})',
    fw_soc_image: 'SoC image (build id)',
    fw_coprocessor: 'Coprocessor {name}',
    fw_wifi: 'Wi-Fi {name}',
    fw_ethernet: 'Network {name}',
    fw_storage: 'Storage {name}',
    fw_gpu: 'GPU',
    fw_state: 'state: {s}',
    fw_driver: 'driver {d}',
    fw_none: 'No firmware version exposed.',
    fw_container_note:
      'From the container, the Wi-Fi (ethtool) and UEFI versions may be missing: the host agent reads them directly on the board.',

    diag_text: 'Lists the GPU / NPU / thermal sources found on the board (useful to set the',
    diag_vars: 'variables).',
    diag_run: 'Run diagnostics',
    diag_running: 'running diagnostics…',
    error_prefix: 'Error: {msg}',

    h_cpu: 'CPU (%)',
    h_mem: 'Memory (%)',
    h_temp: 'Max temperature (°C)',
    h_gpu: 'GPU (%)',
    h_npu: 'NPU (%)',
    h_load: 'Load average (1 min)',
    h_freq: 'Frequencies (MHz)',
    h_net: 'Network (KB/s)',
    h_disk: 'Disk (KB/s)',
    s_temp: 'Temp.',
    s_load: 'Load',
    s_rx: '↓ received',
    s_tx: '↑ sent',
    s_read: 'Read',
    s_write: 'Write',
    history_caption: '{range} · mean per {window} window',
    no_data: 'No data',
    invalid_response: 'invalid response',

    units_bytes: ['B', 'KB', 'MB', 'GB', 'TB'],
    dur_days: '{d} d {h} h {m} min',
  },
  fr: {
    unknown_board: 'Carte inconnue',
    data_origin: 'Origine des mesures',
    live_data: 'Données en direct',
    tab_live: 'Direct',
    tab_1h: '1 h',
    tab_24h: '24 h',
    tab_7d: '7 j',
    tab_system: 'Système & firmware',
    waiting: 'en attente…',
    updated_at: 'mis à jour {time}',
    no_recent_data: 'aucune donnée récente',
    connection_lost: 'Connexion à la carte perdue. Vérifiez la connexion.',

    card_cores: 'Cœurs CPU',
    card_memory: 'Mémoire',
    card_temps: 'Températures',
    card_accel: 'Accélérateurs (GPU / NPU)',
    card_storage: 'Stockage',
    card_network: 'Réseau',
    card_procs: 'Processus',
    card_board: 'Carte',
    card_kernel: 'Noyau Linux',
    card_firmware: 'Firmwares',
    card_os: "Système d'exploitation",
    card_diag: 'Diagnostic',

    col_name: 'Nom',
    col_pid: 'PID',
    col_cpu: 'CPU',
    col_memory: 'Mémoire',
    col_component: 'Composant',
    col_version: 'Version / fichier',
    col_detail: 'Détail',
    col_source: 'Source',
    col_disk: 'Disque',
    col_read: 'Lecture',
    col_write: 'Écriture',
    col_total_rw: 'Total L / É',
    col_iface: 'Interface',
    col_total_net: 'Total ↓ / ↑',

    kpi_cpu: 'CPU',
    kpi_mem: 'Mémoire',
    kpi_temp: 'Température max',
    kpi_gpu: 'GPU',
    kpi_npu: 'NPU',
    kpi_net: 'Réseau',
    kpi_disk: 'Disque',
    kpi_load: 'Charge moyenne',
    kpi_uptime: 'Allumée depuis',
    cores_n: '{n} cœurs',
    no_sensor: 'aucun capteur visible',
    not_detected: 'non détecté',
    active_unknown: 'actif ?',
    present: 'présent',
    n_procs: '{n} processus',
    procs_threads: '{p} processus · {t} threads',
    read_short: 'L',
    write_short: 'É',

    core_n: 'cœur {n}',
    governor: 'gouverneur {g}',
    no_core_data: 'Aucune donnée par cœur.',
    used: 'Utilisée',
    available: 'Disponible',
    cache_buffers: 'Cache / tampons',
    shared: 'Partagée',
    total: 'Total',
    swap: 'Swap',
    none: 'aucun',
    cache: 'cache',
    no_thermal: 'Aucune zone thermique visible.',
    tg_cpu: 'CPU',
    tg_cpu_cluster: 'CPU groupe {n}',
    tg_npu: 'NPU / DSP',
    tg_gpu: 'GPU',
    tg_memory: 'Mémoire (RAM)',
    tg_media: 'Vidéo / caméra / audio',
    tg_connect: 'Connectivité (Wi-Fi, PCIe, modem)',
    tg_soc: 'Puce (zone permanente, centre)',
    tg_power: 'Alimentation & carte',
    tg_other: 'Autres',
    temp_group_sub: '{n} capteurs ? moy. {avg} ?C',
    temp_group_one: '1 capteur',
    temp_show_all: 'Afficher les {n} capteurs',
    temp_hottest: 'le plus chaud : {name}',
    accel_missing: 'Non détecté sur cette carte / ce noyau.',
    accel_name: 'Nom',
    accel_busy: 'Occupation',
    accel_busy_na: 'non exposée par le noyau',
    accel_freq: 'Fréquence',
    accel_state: 'État firmware',
    accel_users: 'Utilisé par',
    accel_no_users: 'aucun processus visible',
    utilization: 'occupation',
    no_usage: "Pas d'information d'occupation.",
    no_iface: 'Aucune interface visible.',
    container_view_limited: 'vue limitée au conteneur App Lab',

    src_fallback: 'mode secours (psutil)',
    src_fallback_tip: 'Le collecteur Rust ne tourne pas : seules les mesures de base sont disponibles.',
    src_host: 'vue hôte (agent)',
    src_host_tip: "Mesures lues par l'agent installé sur la carte : tous les processus, le Wi-Fi et l'OS de la carte.",
    src_container: 'vue conteneur',
    src_container_tip:
      "Mesures lues depuis le conteneur App Lab : processus et réseau limités à l'app. Installez l'agent hôte (README) pour la vue complète.",

    err_collector_missing: 'sysmon-collector introuvable dans python/bin (voir README : compilation).',
    err_collector_start: 'Impossible de lancer le collecteur : {detail}',
    err_collector_stopped: 'Le collecteur s’est arrêté (code {detail}).',
    err_no_psutil: 'psutil absent : aucune mesure disponible.',

    b_model: 'Modèle',
    b_family: 'Famille',
    b_soc: 'SoC',
    b_rev: 'rév. {r}',
    b_soc_family: 'Famille SoC',
    b_soc_id: 'ID SoC',
    b_soc_vendor: 'Fabricant SoC',
    b_serial: 'N° de série',
    b_compatible: 'Compatible DT',
    b_hostname: 'Nom d’hôte',
    b_cpu: 'CPU',
    b_max_freq: 'Fréquence max',
    k_version: 'Version',
    k_build: 'Build',
    k_arch: 'Architecture',
    k_preempt: 'Préemption',
    k_compiler: 'Compilateur',
    k_modules: 'Modules chargés',
    k_taint: 'Taint',
    k_taint_clean: '0 (propre)',
    k_boot: 'Paramètres de boot',
    k_cmdline: 'Ligne de commande',
    os_system: 'Système',
    os_version: 'Version',
    os_build: 'Build',
    os_note: 'Remarque',
    os_container_note: 'image Python du conteneur App Lab (pas l’OS de la carte)',
    os_collector: 'Collecteur',
    os_fallback: 'psutil (secours)',
    os_view: 'Vue',
    os_view_container: 'conteneur App Lab',
    os_view_host: 'hôte',

    fw_uefi: 'UEFI / BIOS',
    fw_ec: 'Contrôleur embarqué (EC)',
    fw_boot: 'Boot ({name})',
    fw_soc_image: 'Image SoC (build id)',
    fw_coprocessor: 'Coprocesseur {name}',
    fw_wifi: 'Wi-Fi {name}',
    fw_ethernet: 'Réseau {name}',
    fw_storage: 'Stockage {name}',
    fw_gpu: 'GPU',
    fw_state: 'état : {s}',
    fw_driver: 'pilote {d}',
    fw_none: 'Aucune version de firmware exposée.',
    fw_container_note:
      "Depuis le conteneur, les versions Wi-Fi (ethtool) et UEFI peuvent manquer : l'agent hôte les lit directement sur la carte.",

    diag_text: 'Liste les sources GPU / NPU / thermiques trouvées sur la carte (utile pour régler les variables',
    diag_vars: ').',
    diag_run: 'Lancer le diagnostic',
    diag_running: 'diagnostic en cours…',
    error_prefix: 'Erreur : {msg}',

    h_cpu: 'CPU (%)',
    h_mem: 'Mémoire (%)',
    h_temp: 'Température max (°C)',
    h_gpu: 'GPU (%)',
    h_npu: 'NPU (%)',
    h_load: 'Charge moyenne (1 min)',
    h_freq: 'Fréquences (MHz)',
    h_net: 'Réseau (Ko/s)',
    h_disk: 'Disque (Ko/s)',
    s_temp: 'Temp.',
    s_load: 'Charge',
    s_rx: '↓ reçu',
    s_tx: '↑ envoyé',
    s_read: 'Lecture',
    s_write: 'Écriture',
    history_caption: '{range} · moyenne par fenêtre de {window}',
    no_data: 'Pas de données',
    invalid_response: 'réponse invalide',

    units_bytes: ['o', 'Ko', 'Mo', 'Go', 'To'],
    dur_days: '{d} j {h} h {m} min',
  },
};

const LANG_KEY = 'sysmon-lang';
// Optional language packs, installed separately as assets/lang/<code>.js (see README).
const OPTIONAL_PACKS = ['es', 'it', 'de', 'pt', 'fi', 'uk', 'ru', 'ja', 'zh'];

/** Called by a language pack file: adds its strings (missing keys fall back to English). */
function registerLanguage(code, strings) {
  STRINGS[code] = strings;
}

function loadScript(src) {
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => {
      s.remove();
      resolve(false);
    };
    document.head.append(s);
  });
}

/** Loads the packs present on the board, then picks the language. */
async function loadLanguagePacks() {
  await Promise.all(OPTIONAL_PACKS.map(code => loadScript(`lang/${code}.js`)));
  LANG = detectLang();
}

function detectLang() {
  const saved = window.localStorage?.getItem(LANG_KEY);
  if (saved && STRINGS[saved]) return saved;
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language ?? 'en'];
  for (const pref of prefs) {
    const code = String(pref).toLowerCase().slice(0, 2);
    if (STRINGS[code]) return code;
  }
  return 'en';
}

let LANG = detectLang();

function t(key, vars = {}) {
  const s = STRINGS[LANG][key] ?? STRINGS.en[key] ?? key;
  if (typeof s !== 'string') return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString());
}

/** Fills the static text of the page: data-i18n (text) and data-i18n-title (tooltip). */
function applyStaticStrings() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(n => {
    n.textContent = t(n.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(n => {
    n.title = t(n.dataset.i18nTitle);
  });
}

function setLang(lang) {
  window.localStorage?.setItem(LANG_KEY, lang);
  window.location.reload();
}

// Shared with app.js and the language packs, which are loaded as classic scripts.
Object.assign(window, { t, registerLanguage, loadLanguagePacks, applyStaticStrings, setLang });
