# <p align="center"><img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" height="2px" /></p>

<p align="center">
  <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#0C1015"/>
    <rect x="2" y="2" width="96" height="96" rx="18" stroke="#06B6D4" stroke-width="2" stroke-opacity="0.6"/>
    <path d="M50 18L78 34V66L50 82L22 66V34L50 18Z" stroke="#38BDF8" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="14" fill="#0E7490" fill-opacity="0.3" stroke="#10B981" stroke-width="2.5"/>
    <path d="M50 36V50L62 57" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="50" cy="18" r="4" fill="#EF4444"/>
    <circle cx="78" cy="34" r="4" fill="#06B6D4"/>
    <circle cx="78" cy="66" r="4" fill="#10B981"/>
    <circle cx="50" cy="82" r="4" fill="#06B6D4"/>
    <circle cx="22" cy="66" r="4" fill="#10B981"/>
    <circle cx="22" cy="34" r="4" fill="#06B6D4"/>
  </svg>
</p>

<h1 align="center">AGAC Oil & Gas SCADA PWA</h1>

<p align="center">
  <strong>Universal Offline Progressive Web App (PWA) for Industrial Automation, I&C Field Execution & Process Commissioning</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/ISA--101-High--Performance_HMI-06B6D4?style=for-the-badge&logo=opsgenie&logoColor=white" alt="ISA-101" />
  <img src="https://img.shields.io/badge/IEC_61511-SIL--3_ESD_Matrix-DC2626?style=for-the-badge&logo=shield&logoColor=white" alt="IEC 61511" />
  <img src="https://img.shields.io/badge/API_2350-Overfill_Protection-F59E0B?style=for-the-badge" alt="API 2350" />
  <img src="https://img.shields.io/badge/API_1130-Pipeline_CPM-10B981?style=for-the-badge" alt="API 1130" />
  <img src="https://img.shields.io/badge/PWA-Offline_Ready-38BDF8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
</p>

<p align="center"><img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" height="2px" /></p>

---

## 📌 Executive Summary

Building, configuring, and commissioning Oil & Gas SCADA, DCS, and Safety Instrumented Systems (SIS) across **Tank Farms**, **LPG Pumping Skids**, **Emergency Shutdown (ESD) Systems**, **Transmission Pipelines**, and **Refinery Units (CDU-01)** demands extreme precision.

This repository hosts an installable, cross-platform **Progressive Web App (PWA)** built according to **ISA-101 High-Performance HMI** design standards. It operates completely offline in remote, air-gapped field environments, equipping Control Systems Engineers with loop calibration tools, Cause & Effect matrix validation, strapping calculators, and hydraulic gradient modeling on industrial tablets and phones.

---

## 🎯 What It Directly Solves

### 1. Eliminates Paper-Based Field Commissioning & SAT
* **The Problem:** Technicians and I&C engineers frequently walk down tank farms, pump manifolds, and pipeline tie-ins using paper punch lists, clipboards, and static calibration sheets that have to be re-entered into spreadsheets later.
* **The Solution:** A PWA works offline on industrial tablets or mobile phones. You can calculate 4–20 mA zero/span values, log loop test verifications, and track commissioning punch lists directly in the field with local persistence (`localStorage` / `IndexedDB`) and export sign-off reports.

### 2. Offline Logic & Hydraulic Verification
* **The Problem:** Validating Cause & Effect (C&E) logic for Emergency Shutdown (ESD) or checking hydraulic pressure drops along a multi-station pipeline usually requires a live connection to an engineering station or specialized desktop software.
* **The Solution:** The PWA provides an offline sandbox to test matrix triggers (initiators to executive actions) and visualize pipeline pressure gradients (API 1130 Computational Pipeline Monitoring) before loading configurations into the live PLC/DCS.

### 3. Low-Bandwidth / Air-Gapped Process Visibility
* **The Problem:** Native SCADA clients (like full desktop runtimes) are heavy, require licensed client installations, and fail over unreliable site Wi-Fi or cellular connections.
* **The Solution:** Because it is a Progressive Web App, it caches its entire UI shell locally via service workers. Even with intermittent field connectivity, mimic graphics (tanks, pumps, valves, refinery columns) render instantly without redrawing or network latency.

### 4. Client Demos & Human-Machine Interface (HMI) Prototyping
* **The Problem:** Demonstrating high-performance ISA-101 graphics or operational philosophy to clients, operations managers, and HAZOP teams usually requires dragging them into an operating control room or spinning up heavy virtual machines.
* **The Solution:** The app can be opened or installed with one click on any browser, laptop, or tablet to walk stakeholders through operational flows, loop schedules, and safety trip scenarios.

---

## ⚠️ Operational Boundaries (What It Does NOT Solve)

| Limitation | Technical Reason | Engineered Workaround / Correct Standard |
| :--- | :--- | :--- |
| **Not a Hard Real-Time SIL Controller** | Web browsers and PWAs cannot guarantee deterministic, sub-millisecond execution loops or safety-rated hardware watchdog integrity. | Never execute active SIL trips from the web UI. Primary safety trips must run on certified hardware (Triconex, HIMA, Siemens S7-400FH). |
| **Requires Gateway for Live OT Telemetry** | Browsers cannot directly speak raw Modbus RTU (RS-485) or native industrial fieldbuses (Profibus, Foundation Fieldbus). | Interfacing live data requires an OT-to-Web gateway (Node-RED, OPC UA to WebSocket bridge, or MQTT/Sparkplug B broker). Without this, the app functions as an offline commissioning and simulation tool. |

---

## 🏛️ System Architecture

### Field Deployment Topology

```
+-----------------------------------------------------------------------------------+
|                        OIL & GAS ASSETS & FIELD SENSORS                           |
|  [Tanks T-101/104]   [LPG Pumps P-201]   [ESD Valves XV]   [120 KM Pipeline CP]   |
+-----------------------------------------+-----------------------------------------+
                                          |
                        4-20mA HART / Modbus / Foundation Fieldbus
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                   INDUSTRIAL CONTROL & SAFETY LAYER (L1 / L2)                    |
|       +----------------------------+        +-----------------------------+       |
|       | Safety PLC (Triconex TMR)  |        | Process DCS / RTU (Modbus)  |       |
|       | SIL-3 Interlocks & Tripping|        | VFD Drives, Flow Computers  |       |
|       +--------------+-------------+        +--------------+--------------+       |
+----------------------|-------------------------------------|----------------------+
                       |                                     |
                       +------------------+------------------+
                                          | OPC UA / Modbus TCP
                                          v
+-----------------------------------------------------------------------------------+
|                    SECURE INDUSTRIAL WEB GATEWAY (DMZ / L3)                       |
|   +---------------------------------------------------------------------------+   |
|   |  Edge Gateway (Node-RED / OPC UA WebSocket Broker / MQTT Sparkplug B)     |   |
+---+-------------------------------------+-------------------------------------+---+
                                          | TLS / WSS / HTTPS
                                          v
+-----------------------------------------------------------------------------------+
|               AGAC SCADA PROGRESSIVE WEB APP (CLIENT RUNTIME)                     |
|                                                                                   |
|   +-------------------+  +-----------------------+  +-------------------------+   |
|   |  Service Worker   |  |   Cache Storage API   |  | IndexedDB Local Storage |   |
|   | (sw.js - Offline) |  | (Mimics, CSS, SVGs)   |  |  (SAT Loop Punchlist)   |   |
|   +-------------------+  +-----------------------+  +-------------------------+   |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                       ISA-101 PROCESS MODULES                             |   |
|   |  * Tank Farming (API 2350)           * LPG Pump Skids (P-201A/B)          |   |
|   |  * SIL-3 ESD Cause & Effect          * Pipeline Gradient Leak Detection   |   |
|   |  * Atmospheric Distillation CDU-01   * 4-20 mA Loop Calibrator Tool       |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Repository File Structure

```
scada-pwa/
├── index.html                   # Core ISA-101 UI & Single-Page SCADA Dashboard
├── manifest.webmanifest         # PWA Manifest (display: standalone, theme colors)
├── sw.js                        # Cache-first service worker for full offline field use
├── offline.html                 # Dedicated fallback page when connectivity is severed
├── favicon.svg                  # Vector SCADA core icon
├── favicon.ico                  # Legacy browser favicon
├── assets/
│   └── icons.svg                # Industrial SVG symbol library (valves, pumps, tanks)
├── icons/                       # Complete cross-platform icon pack (iOS, Android, PWA)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   └── favicon-32x32.png
├── css/
│   └── styles.css               # ISA-101 design system & high-contrast dark theme
└── js/
    ├── app.js                   # Navigation router, service worker init & telemetry tick
    └── modules/
        ├── tankFarm.js          # API 2350 strapping calculation & radar level gauges
        ├── esdMatrix.js         # SIL Cause-and-Effect simulation & trip bypass logic
        ├── lpgPumps.js          # LPG Skid A/B VFD controls & vibration RMS monitoring
        ├── pipeline.js          # API 1130 hydraulic pressure gradient canvas
        ├── refinery.js          # Crude Distillation Unit (CDU-01) temperature profiles
        └── loopCheck.js         # 4-20mA calibration calculator & FAT/SAT punchlist
```

---

## 📦 Key Functional Modules

```
  [Tank Farming]      --> Radar LT, Strapping Table, API 2350 High-High Protection
  [ESD SIL-3 Matrix]  --> 2oo3 Voting, Fire & Gas Tripping, Blowdown Activation
  [LPG Pumping Skid]  --> Duty/Standby Transfer, Discharge Pressures, Plan 53B Seal
  [Pipeline CPM]      --> API 1130 Acoustic Rupture Wave, Real-time Hydraulic Slope
  [Refinery CDU-01]   --> Furnace F-101 Draft & COT, Main Column Cut Fractions Yield
  [Loop Check Toolkit]--> 4-20 mA Signal Generator (0-100%), I/O Wiring & Sign-off
```

### 1. Tank Farm Inventory (API 2350)
* Real-time calculation of **Gross Observed Volume (GOV)** and **Net Standard Volume (NSV)**.
* Independent visual alerts for High (H) and Critical High-High (HH) level trips.

### 2. Emergency Shutdown (ESD) Cause & Effect Matrix
* Interactive 2oo3 voting evaluation for confirmed field fire and hydrocarbon gas leaks.
* Sectional de-energize simulations: pipeline block valves ($XV\text{-}01 / 02$), pump breaker trips, and flare blowdown ($BDV$).

### 3. LPG Pumping Station (P-201A/B)
* Lead/Lag auto-switchover logic when discharge differential drops ($\Delta P < 8\text{ bar}$).
* Real-time telemetry monitoring: discharge pressure, motor current (amps), and vibration velocity ($RMS\text{ mm/s}$).

### 4. Pipeline Monitoring & Leak Detection (API 1130)
* Dynamic HTML5 canvas drawing the hydraulic pressure gradient from **KM 0** ($64\text{ bar}$) to **KM 120** ($12\text{ bar}$).
* Rupture simulation calculating transient pressure waves and localized break markers.

### 5. I&C Loop Checking & SAT Punchlist
* Fluke 789 / Trex field simulator calculating Process Variables from mA inputs:
  $$\text{PV (\% Span)} = \frac{I_{\text{measured}} - 4.0\,\text{mA}}{16.0\,\text{mA}} \times 100$$
* Digital inspection sign-off saved locally to browser storage with instant text report export.

---

## 🚀 Quick Start & Installation

### Option A: Direct Static Serve (No Node.js Required)
Because this PWA is built with standard web technologies, it runs on any static web server:

```bash
# Clone the repository
git clone https://github.com/githubbest729/oilgas-scada-pwa.git
cd oilgas-scada-pwa

# Serve locally using Python 3
python3 -m http.server 8080

# Or serve using Node http-server
npx http-server -p 8080 -c-1
```
Open `http://localhost:8080` in your browser.

### Option B: Deploying with HTTPS (Required for PWA Installability)
Service Workers require a secure origin (`https://` or `localhost`).
* **Vercel / Netlify / Cloudflare Pages:** Push this repository to GitHub and connect it to your hosting provider. No build script is required.
* **On-Premise Industrial Gateway:** Host behind an NGINX reverse proxy configured with self-signed or internal CA SSL certificates.

---

## 📱 Installing on Mobile & Field Tablets

1. Navigate to the deployed URL in **Chrome** (Android) or **Safari** (iOS).
2. **Android:** Tap the **Install App** button on the header or select `Add to Home Screen`.
3. **iOS:** Tap the Share icon and select `Add to Home Screen`.
4. The application will launch in full-screen standalone mode with no browser URL bar, ready for offline field work.

---

## 📜 Industrial Standards Compliance

* **ISA-101.01-2015:** Human-Machine Interfaces for Process Automation Systems (Color philosophy, alarm prioritization).
* **ISA-18.2 / IEC 62682:** Management of Alarm Systems for the Process Industries.
* **IEC 61508 / IEC 61511:** Functional Safety & Safety Instrumented Systems (Cause & Effect Logic).
* **API Standard 2350:** Overfill Protection for Storage Tanks in Petroleum Facilities.
* **API Recommended Practice 1130:** Computational Pipeline Monitoring for Liquids.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
