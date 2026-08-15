# Energy Institute (EI) AVIFF 2nd Edition — Complete Master Engineering Data Register

*Primary Reference: Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition, 2008).*

---

# Table of Contents
1. [P0 — Small Bore Connection (SBC) Master Data](#1-p0--small-bore-connection-sbc-master-data)
   - [Table T3-1: Fitting Span Factors](#11-table-t3-1--fitting-span-factors)
   - [Table T3-2: Minimum First Span Limits (Deck/Steelwork)](#12-table-t3-2--minimum-first-span-limits-decksteelwork)
   - [Table T3-3: Minimum Span Limits (Between Main Lines)](#13-table-t3-3--minimum-span-limits-between-main-lines)
   - [Digitized Figure T3-1 (First Span with Mass)](#14-figure-t3-1--maximum-span-connected-to-main-line-and-involving-mass)
   - [Digitized Figure T3-2 (First Span without Mass)](#15-figure-t3-2--maximum-span-length-connected-to-main-line-and-with-no-additional-mass)
   - [Digitized Figure T3-3 (Subsequent Span with Mass)](#16-figure-t3-3--maximum-span-length-for-subsequent-spans-and-involving-mass)
   - [Digitized Figure T3-4 (Subsequent Span without Mass)](#17-figure-t3-4--maximum-span-length-for-subsequent-spans-and-with-no-additional-mass)
   - [Type 3 SBC Assessment Synthesis](#18-type-3-sbc-assessment-synthesis)
2. [P1 — Valve Transient & Cavitation/Flashing](#2-p1--valve-transient--cavitationflashing)
   - [T2.8 Fast Valve Closure & Joukowsky Surge](#21-t28-fast-valve-closure--joukowsky-surge)
   - [Valve Closure Factor $\phi$ Master Dataset](#22-valve-closure-factor-phi-master-dataset)
   - [T2.8 Rapid Valve Opening](#23-t28-rapid-valve-opening)
   - [T2.9 Cavitation & Flashing Formulations](#24-t29-cavitation--flashing-formulations)
   - [Valve Pressure-Recovery Factor $F_L$ Table](#25-valve-pressure-recovery-factor-fl-table)
3. [P1 — Thermowell Quantitative Assessment (Module T4)](#3-p1--thermowell-quantitative-assessment-module-t4)
   - [Table T4-1: Wall Thickness Modifier $F_M$](#31-table-t4-1--wall-thickness-modifier-fm)
   - [Thermowell Taxonomy & Dimensional Parameters](#32-thermowell-taxonomy--dimensional-parameters)
   - [Natural Frequency $f_n$ Formulations](#33-natural-frequency-fn-formulations)
   - [Vortex Shedding $F_v$ & Flowchart T4-1 Criteria](#34-vortex-shedding-fv--flowchart-t4-1-criteria)
4. [P2 — Decision Flowcharts & Specialized Mechanisms](#4-p2--decision-flowcharts--specialized-mechanisms)
   - [Flowchart T2-2: Reciprocating / Positive Displacement](#41-flowchart-t2-2-reciprocating--positive-displacement)
   - [Flowchart T2-3: Centrifugal Compressor Rotating Stall](#42-flowchart-t2-3-centrifugal-compressor-rotating-stall)
   - [Flowchart T2-4: Deadleg Acoustic Resonance](#43-flowchart-t2-4-deadleg-acoustic-resonance)
   - [Subsea Corrugation Singing & Slug Flow Screening](#44-subsea-corrugation-singing--slug-flow-screening)
5. [Appendix B Master Defaults & Fluid Properties](#5-appendix-b-master-defaults--fluid-properties)
   - [Speed of Sound in Common Liquids](#51-speed-of-sound-in-common-liquids)
   - [Reynolds Number & Characteristic Dimensions](#52-reynolds-number--characteristic-dimensions)
   - [Gas Dynamic Viscosities vs Temperature](#53-gas-dynamic-viscosities-vs-temperature)
   - [Specific Heat Ratios & Sonic Velocities](#54-specific-heat-ratios--sonic-velocities)
   - [Water Vapor Pressure](#55-water-vapor-pressure)
   - [Table T2-3: Mechanical Excitation Baseline LOFs](#56-table-t2-3-mechanical-excitation-baseline-lofs)

---

# 1. P0 — Small Bore Connection (SBC) Master Data

### 1.1 Table T3-1 — Fitting Span Factors
*Printed page 81, PDF page 89.*

| Fitting Type / Configuration Category | Fitting Span Factor | Applicable Dimensions / Weld Description | Engineering Notes |
| :--- | :---: | :--- | :--- |
| **Short Contoured Body** | `1.00` | Integrally reinforced contoured branch fitting with short profile | Maximum structural stiffness; lowest stress concentration. |
| **Contoured Body** | `0.85` | Integrally reinforced contoured fitting (standard profile) | Standard integrally reinforced branch connection. |
| **Forged Reducing Tee** | `0.85` | Full penetration butt-welded forged tee | High integrity tee branch. |
| **Welded Tee** | `0.85` | Fabricated welded tee with full penetration weld | Standard welded tee connection. |
| **Weldolet** | `0.70` | Standard integrally reinforced weldolet fitting | Full penetration weld to header. |
| **Threadolet — Fully back-welded** | `0.70` | Threaded fitting with complete back-seal weld | Seal weld covers all exposed threads. |
| **Screwed — Fully back-welded** | `0.70` | Screwed fitting with complete back-seal weld | Seal weld covers all exposed threads. |
| **Threadolet** | `0.65` | Standard threaded branch connection | Threaded only, no seal weld. |
| **Screwed** | `0.65` | Standard screwed fitting | Threaded only, no seal weld. |
| **Sockolet** | `0.65` | Standard socket weld branch fitting | Socket fillet weld. |
| **Threadolet — Partially back-welded** | `0.60` | Threaded connection with partial seal weld | Exposed threads remain visible. |
| **Screwed — Partially back-welded** | `0.60` | Screwed fitting with partial seal weld | Exposed threads remain visible. |
| **Set-on** | `0.55` | Unreinforced set-on branch nozzle | Fillet / partial penetration weld. |
| **Set-in** | `0.55` | Unreinforced set-in branch nozzle | Butt weld to parent pipe cutout. |
| **Set-thru** | `0.55` | Unreinforced set-through branch nozzle | Least rigid connection configuration. |

---

### 1.2 Table T3-2 — Minimum First Span Limits (Deck/Steelwork)
*Printed page 81, PDF page 89.*

| SBC Nominal Size (in) | Decimal Equivalent (in) | Minimum Allowable First Span Length (m) | Minimum Allowable First Span Length (mm) | Support Boundary |
| :---: | :---: | :---: | :---: | :--- |
| **¼** | `0.250` | `0.7` | 700 | Connected to deck / steelwork |
| **⅜** | `0.375` | `0.8` | 800 | Connected to deck / steelwork |
| **½** | `0.500` | `0.8` | 800 | Connected to deck / steelwork |
| **¾** | `0.750` | `0.9` | 900 | Connected to deck / steelwork |
| **1** | `1.000` | `1.1` | 1100 | Connected to deck / steelwork |
| **1¼** | `1.250` | `1.2` | 1200 | Connected to deck / steelwork |
| **1½** | `1.500` | `1.3` | 1300 | Connected to deck / steelwork |
| **2** | `2.000` | `1.4` | 1400 | Connected to deck / steelwork |

---

### 1.3 Table T3-3 — Minimum Span Limits (Between Main Lines)
*Printed page 82, PDF page 90.*

| SBC Nominal Size (in) | Decimal Equivalent (in) | Minimum Allowable Span Length (m) | Minimum Allowable Span Length (mm) | Boundary Configuration |
| :---: | :---: | :---: | :---: | :--- |
| **¼** | `0.250` | `1.0` | 1000 | Bridging between two process headers |
| **⅜** | `0.375` | `1.1` | 1100 | Bridging between two process headers |
| **½** | `0.500` | `1.1` | 1100 | Bridging between two process headers |
| **¾** | `0.750` | `1.3` | 1300 | Bridging between two process headers |
| **1** | `1.000` | `1.6` | 1600 | Bridging between two process headers |
| **1¼** | `1.250` | `1.7` | 1700 | Bridging between two process headers |
| **1½** | `1.500` | `1.8` | 1800 | Bridging between two process headers |
| **2** | `2.000` | `2.0` | 2000 | Bridging between two process headers |

---

### 1.4 Figure T3-1 — Maximum Span Connected to Main Line and Involving Mass
*Printed page 82, PDF page 90.*

| Figure_ID | Curve_or_Series | X_Value | X_Unit | Y_Value | Y_Unit | Result_LOF | Source_Page | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `T3-1` | `LOF=0.7_Limit` | 0.250 | in | 1.90 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 0.375 | in | 2.40 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 0.500 | in | 2.90 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 0.750 | in | 3.20 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 1.000 | in | 3.50 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 1.250 | in | 3.70 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 1.500 | in | 4.00 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.7_Limit` | 2.000 | in | 4.40 | m | 0.70 | 82 | Solid curve / Upper threshold |
| `T3-1` | `LOF=0.6_Limit` | 0.250 | in | 1.40 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 0.375 | in | 1.70 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 0.500 | in | 2.10 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 0.750 | in | 2.30 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 1.000 | in | 2.50 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 1.250 | in | 2.70 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 1.500 | in | 2.90 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.6_Limit` | 2.000 | in | 3.10 | m | 0.60 | 82 | Long-dash curve |
| `T3-1` | `LOF=0.4_Limit` | 0.250 | in | 0.80 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 0.375 | in | 1.00 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 0.500 | in | 1.25 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 0.750 | in | 1.35 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 1.000 | in | 1.50 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 1.250 | in | 1.60 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 1.500 | in | 1.70 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.4_Limit` | 2.000 | in | 1.80 | m | 0.40 | 82 | Dash-dot curve |
| `T3-1` | `LOF=0.2_Base` | 0.250 | in | 0.50 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 0.375 | in | 0.65 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 0.500 | in | 0.80 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 0.750 | in | 0.90 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 1.000 | in | 1.00 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 1.250 | in | 1.10 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 1.500 | in | 1.15 | m | 0.20 | 82 | Dotted / lower bound |
| `T3-1` | `LOF=0.2_Base` | 2.000 | in | 1.25 | m | 0.20 | 82 | Dotted / lower bound |

---

### 1.5 Figure T3-2 — Maximum Span Length Connected to Main Line and with No Additional Mass
*Printed page 83, PDF page 91.*

| Figure_ID | Curve_or_Series | X_Value | X_Unit | Y_Value | Y_Unit | Result_LOF | Source_Page | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `T3-2` | `LOF=0.7_Limit` | 0.250 | in | 3.40 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 0.375 | in | 3.90 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 0.500 | in | 4.40 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 0.750 | in | 4.90 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 1.000 | in | 5.50 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 1.250 | in | 6.30 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 1.500 | in | 6.70 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.7_Limit` | 2.000 | in | 7.50 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-2` | `LOF=0.6_Limit` | 0.250 | in | 2.60 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 0.375 | in | 3.00 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 0.500 | in | 3.40 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 0.750 | in | 3.80 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 1.000 | in | 4.30 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 1.250 | in | 4.80 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 1.500 | in | 5.20 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.6_Limit` | 2.000 | in | 5.80 | m | 0.60 | 83 | Long-dash curve |
| `T3-2` | `LOF=0.4_Limit` | 0.250 | in | 1.80 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 0.375 | in | 2.00 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 0.500 | in | 2.20 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 0.750 | in | 2.50 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 1.000 | in | 2.80 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 1.250 | in | 3.20 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 1.500 | in | 3.40 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.4_Limit` | 2.000 | in | 3.90 | m | 0.40 | 83 | Dash-dot curve |
| `T3-2` | `LOF=0.2_Base` | 0.250 | in | 1.10 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 0.375 | in | 1.30 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 0.500 | in | 1.50 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 0.750 | in | 1.70 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 1.000 | in | 1.90 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 1.250 | in | 2.10 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 1.500 | in | 2.30 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-2` | `LOF=0.2_Base` | 2.000 | in | 2.60 | m | 0.20 | 83 | Dotted / lower bound |

---

### 1.6 Figure T3-3 — Maximum Span Length for Subsequent Spans and Involving Mass
*Printed page 83, PDF page 91.*

| Figure_ID | Curve_or_Series | X_Value | X_Unit | Y_Value | Y_Unit | Result_LOF | Source_Page | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `T3-3` | `LOF=0.7_Limit` | 0.250 | in | 1.50 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 0.375 | in | 1.80 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 0.500 | in | 2.30 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 0.750 | in | 2.40 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 1.000 | in | 2.70 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 1.250 | in | 2.90 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 1.500 | in | 3.10 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.7_Limit` | 2.000 | in | 3.40 | m | 0.70 | 83 | Solid curve / Upper threshold |
| `T3-3` | `LOF=0.6_Limit` | 0.250 | in | 1.10 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 0.375 | in | 1.30 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 0.500 | in | 1.60 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 0.750 | in | 1.70 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 1.000 | in | 1.90 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 1.250 | in | 2.00 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 1.500 | in | 2.20 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.6_Limit` | 2.000 | in | 2.40 | m | 0.60 | 83 | Long-dash curve |
| `T3-3` | `LOF=0.4_Limit` | 0.250 | in | 0.60 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 0.375 | in | 0.80 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 0.500 | in | 1.00 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 0.750 | in | 1.00 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 1.000 | in | 1.10 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 1.250 | in | 1.20 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 1.500 | in | 1.30 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.4_Limit` | 2.000 | in | 1.40 | m | 0.40 | 83 | Dash-dot curve |
| `T3-3` | `LOF=0.2_Base` | 0.250 | in | 0.35 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 0.375 | in | 0.45 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 0.500 | in | 0.55 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 0.750 | in | 0.65 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 1.000 | in | 0.75 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 1.250 | in | 0.80 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 1.500 | in | 0.85 | m | 0.20 | 83 | Dotted / lower bound |
| `T3-3` | `LOF=0.2_Base` | 2.000 | in | 0.95 | m | 0.20 | 83 | Dotted / lower bound |

---

### 1.7 Figure T3-4 — Maximum Span Length for Subsequent Spans and with No Additional Mass
*Printed page 84, PDF page 92.*

| Figure_ID | Curve_or_Series | X_Value | X_Unit | Y_Value | Y_Unit | Result_LOF | Source_Page | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `T3-4` | `LOF=0.7_Limit` | 0.250 | in | 2.70 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 0.375 | in | 3.10 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 0.500 | in | 3.40 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 0.750 | in | 3.90 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 1.000 | in | 4.40 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 1.250 | in | 4.90 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 1.500 | in | 5.30 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.7_Limit` | 2.000 | in | 5.90 | m | 0.70 | 84 | Solid curve / Upper threshold |
| `T3-4` | `LOF=0.6_Limit` | 0.250 | in | 2.10 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 0.375 | in | 2.40 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 0.500 | in | 2.70 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 0.750 | in | 3.00 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 1.000 | in | 3.40 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 1.250 | in | 3.80 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 1.500 | in | 4.10 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.6_Limit` | 2.000 | in | 4.60 | m | 0.60 | 84 | Long-dash curve |
| `T3-4` | `LOF=0.4_Limit` | 0.250 | in | 1.40 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 0.375 | in | 1.60 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 0.500 | in | 1.80 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 0.750 | in | 2.00 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 1.000 | in | 2.30 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 1.250 | in | 2.50 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 1.500 | in | 2.70 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.4_Limit` | 2.000 | in | 3.00 | m | 0.40 | 84 | Dash-dot curve |
| `T3-4` | `LOF=0.3_Base` | 0.250 | in | 1.00 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 0.375 | in | 1.10 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 0.500 | in | 1.25 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 0.750 | in | 1.45 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 1.000 | in | 1.65 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 1.250 | in | 1.85 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 1.500 | in | 2.00 | m | 0.30 | 84 | Dotted / lower bound |
| `T3-4` | `LOF=0.3_Base` | 2.000 | in | 2.25 | m | 0.30 | 84 | Dotted / lower bound |

---

### 1.8 Type 3 SBC Assessment Synthesis
1. **First Span**:
   $$\text{LOF}_{\text{GEOM}}(\text{first}) = \max\left[\text{LOF}_{\text{GEOM}}(C), \text{LOF}_{\text{GEOM}}(D), \text{LOF}_{\text{GEOM}}(E)\right]$$
   $$\text{SBC Modifier}(\text{first}) = \min\left[\text{LOF}_{\text{GEOM}}(\text{first}), \text{LOF}_{\text{LOC}}\right]$$
2. **Subsequent Spans**:
   $$\text{LOF}_{\text{GEOM}}(\text{subsequent}) = \max\left[\text{LOF}_{\text{GEOM}}(F), \text{LOF}_{\text{GEOM}}(G)\right]$$
   $$\text{SBC Modifier}(\text{subsequent}) = \min\left[\text{LOF}_{\text{GEOM}}(\text{subsequent}), \text{LOF}_{\text{LOC}}\right]$$
3. **Overall SBC Score**:
   $$\mathbf{\text{SBC LOF}} = \text{Main Line Multiplier} \times \text{Main Line LOF} \times \max\left[\text{SBC Modifier}(\text{first}), \text{SBC Modifier}(\text{subsequent})\right]$$

---

# 2. P1 — Valve Transient & Cavitation/Flashing

### 2.1 T2.8 Fast Valve Closure & Joukowsky Surge
- **Pipe Acoustic Period**: $T_c = \frac{2 L}{c}$
- **Effective Closure Time**: $\tau_{\text{eff}} = \phi \cdot t_{\text{closure}}$
- **Peak Overpressure**:
  - If $\tau_{\text{eff}} \le T_c \implies \Delta P = \rho \cdot c \cdot \Delta v$
  - If $\tau_{\text{eff}} > T_c \implies \Delta P = \rho \cdot c \cdot \Delta v \cdot \left(\frac{T_c}{\tau_{\text{eff}}}\right)$
  - Peak Static Pressure: $P_{\text{peak}} = P_{\text{operating}} + \Delta P$

---

### 2.2 Valve Closure Factor $\phi$ Master Dataset

| Valve Style / Trim Type | Typical Effective Closure Fraction $\phi$ | Flow Reduction Characteristic | Applicable Valve Types & Standards | Engineering Rationale |
| :--- | :---: | :--- | :--- | :--- |
| **Quick Opening** | `0.80 – 0.90` | Steep initial flow reduction | Quick-dump valves, relief valves | 80–90% of flow interruption occurs almost immediately upon stem movement. |
| **Linear Trim** | `0.40 – 0.50` | Proportional to stroke | Linear control globe valves | Default $\phi = 0.50$ when specific trim Cv curve is unavailable. |
| **Equal Percentage ($= \%$)** | `0.10 – 0.20` | Highly non-linear; steep final drop | Equal-% globe, high-performance ball | Flow is throttled heavily only in the final 15–20% of stroke travel. |
| **Quarter-Turn Butterfly** | `0.20 – 0.30` | Non-linear near seat | Standard concentric / eccentric butterfly | Flow cutoff occurs primarily in the final $30^\circ$ of disc rotation. |
| **Full Bore Ball Valve** | `0.15 – 0.25` | Very steep cutoff at final rotation | API 6D ESDVs, trunnion ball valves | Default $\phi = 0.20$ for fast-acting pipeline shutdown valves. |
| **Gate / Wedge Valve** | `0.20 – 0.35` | Parabolic area cutoff | Wedge gate, parallel slide | Primary flow reduction occurs as gate enters seating pocket. |

---

### 2.3 T2.8 Rapid Valve Opening
- **Dynamic Thrust Force**: $F_{\text{thrust}} = \dot{m} v + (P_{\text{exit}} - P_{\text{ambient}}) A_{\text{exit}}$
- **Elbow Transient Acceleration Force**: $F_{\text{elbow}} = \Delta P_{\text{wave}} \cdot A_{\text{pipe}} \cdot \sqrt{2(1 - \cos \theta)}$

---

### 2.4 T2.9 Cavitation & Flashing Formulations
- **Cavitation Index**: $\sigma = \frac{P_{\text{upstream}} - P_v}{P_{\text{upstream}} - P_{\text{downstream}}}$
- **Incipient Cavitation Limit**: $K_c = 0.80 \cdot F_L^2$
- **Choked Delta P**: $\Delta P_{\text{choked}} = F_L^2 \cdot (P_{\text{upstream}} - F_F \cdot P_v)$

---

### 2.5 Valve Pressure-Recovery Factor $F_L$ Table

| Valve Trim / Geometry | Flow Orientation | Liquid Pressure Recovery Factor $F_L$ | Cavitation Resistance Class | Notes & Source Basis |
| :--- | :--- | :---: | :---: | :--- |
| **Globe — Single Port** | Flow-to-Open (Standard plug) | `0.90` | High | High energy dissipation, low pressure recovery. |
| **Globe — Single Port** | Flow-to-Close | `0.80` | Moderate | Tendency for vena-contracta separation. |
| **Globe — Double Port / Cage** | Standard balanced trim | `0.85` | High | Standard general service cage trim. |
| **Globe — Multi-Stage / Tortuous Path** | Anti-cavitation trim stack | `0.95 – 0.98` | Very High | Pressure dropped across multi-turn stages ($K_c \approx 0.75$). |
| **Angle Valve** | Flow-to-Close (Standard body) | `0.85` | High | Directs jet into downstream pipe center. |
| **Angle Valve** | Expanded outlet venturi | `0.55 – 0.65` | Low | High recovery in expanding horn. |
| **Rotary Plug (Eccentric Cam)** | Flow-to-Open | `0.85` | High | Cam-action eccentric rotary control valve. |
| **Rotary Plug (Eccentric Cam)** | Flow-to-Close | `0.70` | Moderate | Standard rotary service. |
| **Butterfly — Standard Concentric** | $60^\circ$ Throttling angle | `0.68` | Low | Moderate recovery at partial stroke. |
| **Butterfly — Standard Concentric** | Full $90^\circ$ Open | `0.55` | Very Low | Severe recovery; highest cavitation susceptibility. |
| **Butterfly — High Performance** | Double / Triple Offset ($60^\circ$) | `0.70` | Moderate | Standard high-performance disc. |
| **Ball Valve — Segmented / V-Notch** | Throttling profile | `0.75` | Moderate | Segmented V-ball control valve. |
| **Ball Valve — Full Bore** | Full $100\%$ Open | `0.50` | Very Low | Unobstructed bore; minimum resistance and maximum recovery. |
| **Restriction Orifice (Single Hole)** | Concentric square edge | `0.80` | Moderate | ISO 5167 single-stage orifice. |
| **Restriction Orifice (Multi-Hole)** | Anti-cavitation drilled pattern | `0.90 – 0.95` | Very High | Multi-jet acoustic dissipation. |

---

# 3. P1 — Thermowell Quantitative Assessment (Module T4)

### 3.1 Table T4-1 — Wall Thickness Modifier $F_M$
*Printed page 87, PDF page 95.*

| Parent Pipe Schedule Classification | Wall Thickness Modifier $F_M$ (Plain Connection) | Wall Thickness Modifier $F_M$ (With 4-Way Welded Gussets) | Structural Rationale |
| :--- | :---: | :---: | :--- |
| **Schedule 160 or greater** | `0.96` | `0.98` | Very stiff parent pipe wall; acts almost as an ideal clamped cantilever base. |
| **Schedule 80 to less than Schedule 160** | `0.93` | `0.96` | Heavy wall process piping with minimal junction ovalization. |
| **Schedule 40 to less than Schedule 80** | `0.85` | `0.93` | Standard schedule piping; moderate rotational flexibility at nozzle intersection. |
| **Less than Schedule 40 (Thin Wall)** | `0.42` | `0.85` | Highly flexible pipe shell; fundamental natural frequency drops by over 50% without gussets. |

---

### 3.2 Thermowell Taxonomy & Dimensional Parameters
- **Straight**: Insertion length $L_{tw}$ (m), Outside diameter $D_{tw}$ (mm), Bore $d_{tw}$ (mm).
- **Tapered**: Insertion length $L_{tw}$ (m), Root OD $D_1$ (mm), Tip OD $D_2$ (mm), Bore $d_{tw}$ (mm), $k = D_2 / D_1$, $\delta = d_{tw} / D_1$.
- **Stepped**: Root section length $L_1$ (m), Tip section length $L_2$ (m), $L_{tw} = L_1 + L_2$, Root OD $D_1$ (mm), Tip OD $D_2$ (mm), $D_A = \frac{L_1 D_1 + L_2 D_2}{L_1 + L_2}$, $\delta_A = d_{tw} / D_A$.

---

### 3.3 Natural Frequency $f_n$ Formulations
1. **Straight Thermowell (Eq. 1)**:
   $$f_n = \frac{3.516}{2 \pi L_{tw}^2} \sqrt{\frac{E_{tw} I}{\rho A}}$$
2. **Tapered Thermowell (Eq. 2)**:
   $$f_n = \frac{1.12}{1000} \frac{D_1}{L_{tw}^2} \sqrt{\frac{E_{tw}}{\rho}} \sqrt{\frac{5 + 15k + 35k^2 + 70k^3 + 126k^4 - 2142 \delta^2}{5353 - 8008 \delta^2}}$$
3. **Stepped Thermowell (Eq. 3)**:
   $$f_n = \frac{0.14}{1000} \frac{D_A}{L_{tw}^2} \sqrt{\frac{E_{tw}}{\rho (1 + \delta_A^2)}}$$

---

### 3.4 Vortex Shedding $F_v$ & Flowchart T4-1 Criteria
- **Reynolds Number**: $\text{Re} = \frac{\rho \cdot v \cdot D_{\text{char}}}{1000 \cdot \mu}$
- **Strouhal Number**: $S = 0.184 + 0.012 \log_{10}(\text{Re})$
- **Vortex Frequency**: $F_v = \frac{S \cdot v \cdot 1000}{D_{\text{char}}}$
- **Acceptance Criterion**:
  - If $\frac{F_v}{f_n \cdot F_M} > 0.80 \implies \mathbf{\text{LOF} = 1.00}$ (Vortex lock-in risk).
  - If $\frac{F_v}{f_n \cdot F_M} \le 0.80 \implies \mathbf{\text{LOF} = 0.29}$ (Acceptable design).

---

# 4. P2 — Decision Flowcharts & Specialized Mechanisms

### 4.1 Flowchart T2-2: Reciprocating / Positive Displacement
- Node 1: Specific machine data known? $\implies$ If No: $\mathbf{\text{LOF} = 1.00}$.
- Node 2: Driver Power $< 112\text{ kW}$ AND $P_{\text{discharge}} < 35\text{ bar}$? $\implies$ If Yes: $\mathbf{\text{LOF} = 0.40}$.
- Node 3: Full API 618 / 674 study completed and implemented? $\implies$ If Yes: $\mathbf{\text{LOF} = 0.40}$; If No: $\mathbf{\text{LOF} = 1.00}$.

### 4.2 Flowchart T2-3: Centrifugal Compressor Rotating Stall
- Node 1: Aerodynamic data known? $\implies$ If No: $\mathbf{\text{LOF} = 1.00}$.
- Node 2: Compressor displays rotating stall characteristic? $\implies$ If No: $\mathbf{\text{LOF} = 0.20}$.
- Node 3: Low flow / near stall condition on OEM map? $\implies$ If Yes: $\mathbf{\text{LOF} = 1.00}$; If No: $\mathbf{\text{LOF} = 0.40}$.

### 4.3 Flowchart T2-4: Deadleg Acoustic Resonance
- Acoustic Frequency: $F_{s,n} = \frac{(2n - 1) c}{4 (L_{\text{branch}} + 0.3 d_{\text{int}} \times 10^{-3})}$
- Vortex Shedding: $f_{\text{shed}} = \frac{St \cdot v}{d_{\text{int}} \times 10^{-3}}$ (Default $St = 0.42$).
- Lock-in Check: If $|f_{\text{shed}} - F_s| \le 0.10 F_s$ and $v > 5\text{ m/s}$ $\implies \mathbf{\text{LOF} = 1.00}$; else $\mathbf{\text{LOF} = 0.20}$.

### 4.4 Subsea Corrugation Singing & Slug Flow Screening
- **Corrugation singing**: $f_{\text{corr}} = v_{\text{gas}} / \lambda_{\text{pitch}}$. If $0.85 f_{\text{acoustic}} \le f_{\text{corr}} \le 1.15 f_{\text{acoustic}} \implies \mathbf{\text{LOF} = 1.00}$.
- **Slug flow transient**: $F_{\text{slug}} = \rho_{\text{mix}} A v_{\text{slug}}^2 \sqrt{2(1 - \cos \theta)} + \Delta P_{\text{slug}} A$. If $(\rho v^2)_{\text{mix}} > 5000\text{ kg/(m}\cdot\text{s}^2) \implies \mathbf{\text{LOF} = 1.00}$.

---

# 5. Appendix B Master Defaults & Fluid Properties

### 5.1 Speed of Sound in Common Liquids
*At $20^\circ\text{C}$ (m/s):*
Benzene: `1321`, Crude Oil: `1385`, Ethanol: `1180`, Ethyl ether: `1008`, Gasoline: `1166`, Heptene: `1082`, Hexane: `1203`, Hydraulic oil: `1280`, Kerosene: `1315`, Methanol: `1123`, Naphtha: `1225`, Nonane: `1248`, Octane: `1192`, Pentane: `1008`, Sea water: `1481`, Water (Pure): `1482`.

### 5.2 Reynolds Number & Characteristic Dimensions
$$\text{Re} = \frac{\rho \cdot v \cdot D_{\text{char}}}{1000 \cdot \mu}$$
- Deadleg Pulsation: $D_{\text{char}} = D_{\text{int}}$ (Main pipe ID).
- Thermowell: $D_{\text{char}} = D_{\text{tip}}$ ($D_{tw}$ for straight, $D_2$ for tapered/stepped).

### 5.3 Gas Dynamic Viscosities vs Temperature ($\text{Pa}\cdot\text{s} \times 10^{-5}$)
- Air: $-50^\circ\text{C} = 1.46$, $0^\circ\text{C} = 1.72$, $50^\circ\text{C} = 1.96$, $150^\circ\text{C} = 2.39$, $250^\circ\text{C} = 2.76$.
- Methane: $-50^\circ\text{C} = 0.88$, $0^\circ\text{C} = 1.03$, $50^\circ\text{C} = 1.18$, $150^\circ\text{C} = 1.44$, $250^\circ\text{C} = 1.67$.
- Hydrocarbon Gas (SG=0.75): $-50^\circ\text{C} = 0.78$, $0^\circ\text{C} = 0.92$, $50^\circ\text{C} = 1.05$, $150^\circ\text{C} = 1.29$, $250^\circ\text{C} = 1.51$.
- Nitrogen: $-50^\circ\text{C} = 1.41$, $0^\circ\text{C} = 1.66$, $50^\circ\text{C} = 1.89$, $150^\circ\text{C} = 2.30$, $250^\circ\text{C} = 2.65$.
- Carbon Dioxide: $-50^\circ\text{C} = 1.15$, $0^\circ\text{C} = 1.39$, $50^\circ\text{C} = 1.62$, $150^\circ\text{C} = 2.05$, $250^\circ\text{C} = 2.44$.
- Hydrogen: $-50^\circ\text{C} = 0.74$, $0^\circ\text{C} = 0.84$, $50^\circ\text{C} = 0.94$, $150^\circ\text{C} = 1.12$, $250^\circ\text{C} = 1.28$.

### 5.4 Specific Heat Ratios & Sonic Velocities
$$c = \sqrt{\frac{\gamma \cdot Z \cdot R \cdot T}{M_w}}$$
- Methane ($\text{CH}_4$, $M_w = 16.04$): $\gamma = 1.31$, $c_{20^\circ\text{C}} = 446\text{ m/s}$.
- Air ($M_w = 28.96$): $\gamma = 1.40$, $c_{20^\circ\text{C}} = 343\text{ m/s}$.
- Nitrogen ($\text{N}_2$, $M_w = 28.01$): $\gamma = 1.40$, $c_{20^\circ\text{C}} = 349\text{ m/s}$.
- Carbon Dioxide ($\text{CO}_2$, $M_w = 44.01$): $\gamma = 1.29$, $c_{20^\circ\text{C}} = 267\text{ m/s}$.
- Steam ($M_w = 18.02$, $100^\circ\text{C}$): $\gamma = 1.33$, $c_{100^\circ\text{C}} = 478\text{ m/s}$.

### 5.5 Water Vapor Pressure
$0^\circ\text{C} = 0.0061\text{ bar a}$, $20^\circ\text{C} = 0.0234\text{ bar a}$, $40^\circ\text{C} = 0.0738\text{ bar a}$, $60^\circ\text{C} = 0.199\text{ bar a}$, $80^\circ\text{C} = 0.474\text{ bar a}$, $100^\circ\text{C} = 1.013\text{ bar a}$, $120^\circ\text{C} = 1.985\text{ bar a}$, $150^\circ\text{C} = 4.758\text{ bar a}$.

### 5.6 Table T2-3 — Mechanical Excitation Baseline LOFs
- Reciprocating / Positive Displacement: `0.90` (can reduce to `0.40` with dynamic study).
- Diesel / Gas Engine: `0.80` (can reduce to `0.40` with dynamic study).
- Screw Compressor / Pump: `0.60`.
- Centrifugal Pump: `0.40`.
- Electric Motor ($\ge 15\text{ kW}$): `0.40`.
- Electric Motor ($< 15\text{ kW}$): `0.20`.
- Centrifugal Compressor: `0.20`.
- Gas Turbine: `0.20`.
- Fan / Blower: `0.20`.
- Shared support with line $\text{LOF} \ge 0.50$: `Equal to adjacent LOF`.
