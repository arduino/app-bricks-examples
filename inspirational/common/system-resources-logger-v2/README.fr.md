# System Resources Logger v2

**[English version](README.md)**

Le **System Resources Logger v2** est un tableau de bord complet pour l'**Arduino UNO Q** et
l'**Arduino VENTUNO Q**. L'exemple d'origine n'affiche que le % CPU et le % mémoire. La v2
montre tout ce que la carte expose, l'enregistre dans une base time series et en trace
l'historique sur 1 heure, 24 heures et 7 jours.

## Ce qu'il affiche

| Catégorie | Mesures |
|---|---|
| **CPU** | % global, iowait, % et fréquence **par cœur**, types de cœurs (Cortex-A53, Kryo…), gouverneur, charge 1/5/15 min |
| **Mémoire** | utilisée / disponible / cache / tampons / partagée, swap (et zram) |
| **Températures** | toutes les zones thermiques, **regroupées par zone** (groupes CPU, NPU, GPU, RAM, multimédia, connectivité, alimentation…) avec la valeur la plus chaude de chaque groupe ; la liste complète est à un clic |
| **GPU** | modèle (Adreno), % d'occupation, fréquence actuelle / max, processus qui l'utilisent |
| **NPU / DSP** | Hexagon cDSP / NSP (remoteproc), état du firmware, % d'occupation quand le noyau l'expose, processus qui l'utilisent |
| **Réseau** | débit ↓ / ↑ par interface, totaux, adresses IP et MAC, signal Wi-Fi |
| **Stockage** | occupation par point de montage, lecture / écriture par disque |
| **Processus** | nombre de processus et de threads, top 8 par CPU avec la mémoire |
| **Système** | modèle de carte, SoC et révision, n° de série, uptime, OS |
| **Noyau** | version, build, architecture, préemption (PREEMPT / RT), compilateur, modules chargés, taint, ligne de commande |
| **Firmwares** | UEFI / BIOS, paramètres du bootloader, firmwares des coprocesseurs (DSP, modem…) et leur état, firmware Wi-Fi / Ethernet (ethtool), firmware eMMC / NVMe / UFS, modèle GPU |

L'historique (1 h, 24 h, 7 jours) est conservé pour CPU, RAM, swap, température, GPU, NPU,
charge, fréquences CPU / GPU, réseau et disque.

La VENTUNO Q expose 48 zones thermiques (40 dans la puce, 8 sur les puces d'alimentation) et
l'UNO Q environ 12 : le tableau de bord les présente en 6 à 9 groupes lisibles.

## Bricks utilisées

- `dbstorage_tsstore` : enregistre les mesures dans une base time series (7 jours) et les
  agrège pour les graphiques d'historique.
- `web_ui` : sert le tableau de bord et diffuse les mesures en direct par WebSocket.

## Matériel

- Arduino UNO Q (x1) ou Arduino VENTUNO Q (x1)
- Câble USB-C® (x1) _(UNO Q seulement)_

## Utilisation

1. Lancez l'app depuis Arduino App Lab.
2. Le tableau de bord s'ouvre dans le navigateur, sinon allez sur `<nom-de-la-carte>.local:7000`.
3. Onglets : **Direct**, **1 h**, **24 h**, **7 j** et **Système & firmware**.

Pour l'installer depuis un ordinateur, importez `system-resources-logger-v2.zip` dans App Lab, ou
copiez-le sur la carte et décompressez-le dans `~/ArduinoApps/`.

## Langues

L'app contient l'**anglais** et le **français** : le tableau de bord suit la langue du
navigateur et le sélecteur **EN / FR** de l'en-tête permet d'en changer.

Pour que l'app reste légère, les autres langues sont des **packs optionnels** d'environ 6 Ko :
allemand (`de`), espagnol (`es`), finnois (`fi`), italien (`it`), japonais (`ja`), portugais
(`pt`), russe (`ru`), ukrainien (`uk`) et chinois simplifié (`zh`). N'installez que ceux dont
vous avez besoin :

```sh
python3 -m zipfile -e sysmon-v2-lang-de.zip ~/ArduinoApps/system-resources-logger-v2/
```

Un pack ajoute seulement `assets/lang/<code>.js` ; rechargez le tableau de bord et son bouton
apparaît. Supprimez le fichier pour l'enlever. `sysmon-v2-lang-all.zip` installe tous les
packs d'un coup.

## Fonctionnement

```
/proc, /sys ──► sysmon-collector (Rust, binaire statique aarch64)
                    │  une ligne JSON toutes les 5 s
                    ▼
               python/main.py ──► dbstorage_tsstore (historique, 7 jours)
                    │
                    └──────────► web_ui (WebSocket "metrics" / "info" + API REST)
                                     │
                                     ▼
                         assets/ (tableau de bord Chart.js)
```

- **`collector/`** : le collecteur en Rust. Il lit directement `/proc` et `/sys` (aucune
  dépendance système, binaire musl statique d'environ 600 Ko) et détecte la carte et ses
  accélérateurs : Adreno via `kgsl` (noyaux Qualcomm) ou `msm` / DRM + devfreq (noyaux
  mainline), NPU via remoteproc + fastrpc ou `/dev/accel`. Sans fichier d'occupation,
  l'occupation GPU / NPU est calculée depuis les statistiques DRM `fdinfo`.
- **`python/main.py`** : lance le collecteur, enregistre et diffuse les mesures. Si le binaire
  manque ou ne démarre pas, un mode secours `psutil` (CPU, RAM) prend le relais et le tableau
  de bord l'indique.
- **`host-agent/`** : agent **optionnel** qui exécute le même collecteur directement sur la
  carte (voir plus bas).

## Vue conteneur et agent hôte (optionnel)

App Lab exécute `main.py` dans un conteneur Docker. Depuis ce conteneur, le collecteur voit le
CPU, la RAM, les températures, le GPU, le NPU et les disques de la carte, mais :

- seuls les **processus de l'app** sont visibles ;
- seule l'**interface réseau du conteneur** est visible (pas le Wi-Fi de la carte) ;
- l'OS affiché est celui de l'**image Python**, pas celui de la carte ;
- certaines versions de firmware (Wi-Fi via ethtool, UEFI) peuvent manquer.

Le badge sous le titre indique la vue utilisée. Pour la vue complète, installez l'agent hôte
sur la carte, une seule fois (en SSH ou depuis le terminal de la carte) :

```sh
cd ~/ArduinoApps/system-resources-logger-v2/host-agent
sudo sh install.sh            # ou : sudo sh install.sh <dossier-de-l-app> <intervalle-en-s>
```

Il installe un service systemd `sysmon-host` qui écrit `data/host-metrics.json` dans le dossier
de l'app ; `main.py` utilise ce fichier tant qu'il est récent (moins de 15 s). Le service tourne
avec l'utilisateur propriétaire de l'app et seulement les capacités `CAP_SYS_PTRACE` et
`CAP_DAC_READ_SEARCH` (lecture des processus). Désinstallation : `sudo sh uninstall.sh`.

## Compilation du collecteur

Prérequis : [Rust](https://rustup.rs). Aucune chaîne de compilation C n'est nécessaire : le
binaire est lié avec `rust-lld` fourni par rustup (voir `collector/.cargo/config.toml`).

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File collector\build.ps1
```

```sh
# Linux, macOS, WSL ou directement sur la carte
sh collector/build.sh
```

Les scripts lancent les tests puis copient le binaire dans `python/bin/sysmon-collector`.
`python package.py` fabrique ensuite l'archive de l'app et les packs de langue dans le
dossier parent du projet.

Le collecteur peut aussi être lancé seul sur la carte :

```sh
python/bin/sysmon-collector --once     # info + mesures, puis quitte
python/bin/sysmon-collector --info     # carte, noyau, firmwares
python/bin/sysmon-collector --probe    # sources GPU / NPU / thermiques trouvées
python/bin/sysmon-collector --help
```

## Réglages

Variables d'environnement lues par `main.py` / le collecteur :

| Variable | Rôle | Défaut |
|---|---|---|
| `SYSMON_INTERVAL` | secondes entre deux mesures | `5` |
| `SYSMON_TOP` | nombre de processus listés | `8` |
| `SYSMON_HOST_FILE` | fichier écrit par l'agent hôte | `data/host-metrics.json` |
| `SYSMON_GPU_BUSY_FILE` | fichier sysfs d'occupation GPU à forcer | détection auto |
| `SYSMON_GPU_FREQ_FILE` | fichier sysfs de fréquence GPU (Hz) à forcer | détection auto |
| `SYSMON_NPU_BUSY_FILE` | fichier d'occupation NPU à forcer | détection auto |
| `SYSMON_NPU_FREQ_FILE` | fichier de fréquence NPU (Hz) à forcer | détection auto |

Le bouton **Lancer le diagnostic** de l'onglet *Système & firmware* (ou `--probe`) liste les
fichiers trouvés sur la carte pour choisir ces valeurs.

## API

| Route | Réponse |
|---|---|
| `GET /info` | carte, noyau, OS, firmwares, réseau, source des mesures |
| `GET /get_samples/{mesure}/{début}/{fenêtre}` | historique moyenné, ex. `/get_samples/temp/-1d/15m` |
| `GET /probe` | sources GPU / NPU / thermiques détectées |
| WebSocket `metrics` | une mesure complète toutes les `SYSMON_INTERVAL` secondes |
| WebSocket `info` | informations statiques (au démarrage, puis toutes les 5 min) |

Mesures historisées : `cpu`, `mem`, `swap`, `temp`, `gpu`, `npu`, `load1`, `cpu_freq`,
`gpu_freq`, `net_rx`, `net_tx`, `disk_r`, `disk_w` (débits en Ko/s).

## Limites connues

- **Occupation du NPU** : les noyaux actuels ne publient pas toujours un pourcentage
  d'occupation du DSP Hexagon. La v2 affiche alors son état (`running`…), son firmware et les
  processus qui l'utilisent ; le pourcentage apparaît dès que le noyau l'expose (`/dev/accel` +
  fdinfo, devfreq) ou avec `SYSMON_NPU_BUSY_FILE`.
- **Firmware du microcontrôleur** (STM32) : il n'est pas visible depuis Linux.
- Sans agent hôte, voir *Vue conteneur et agent hôte*.

## Structure

```
app.yaml                 description de l'app et Bricks utilisées
python/main.py           stockage, diffusion, API
python/bin/              collecteur compilé (aarch64)
assets/                  tableau de bord (index.html, app.js, i18n.js, style.css, libs/)
lang-packs/              packs de langue optionnels (de, es, fi, it, ja, pt, ru, uk, zh)
collector/               code Rust du collecteur, tests, scripts de compilation
host-agent/              installation / désinstallation de l'agent hôte
package.py               fabrique l'archive de l'app et les packs de langue
```
