# Priority P0 — Small Bore Connection (SBC) Master Data (Technical Module T3)

*Source Document: Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition), Technical Module T3: Quantitative SBC LOF Assessment (printed pages 81–84, PDF pages 89–92).*

---

## 1. Table T3-1 — Fitting Span Factors
*Printed page 81, PDF page 89.*

The **Fitting Span Factor** accounts for the relative stiffness and stress concentration of different branch fittings connected to the parent pipework. It is applied:
- As a **divisor** to evaluate the **maximum span length**:
  $$L_{\text{modified}} = \frac{L_{\text{span}}}{\text{Fitting Span Factor}}$$
- As a **multiplier** to evaluate the **minimum allowable span length** (to deck or between two lines):
  $$L_{\text{min,modified}} = L_{\text{span}} \times (\text{Fitting Span Factor})$$

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

## 2. Table T3-2 — Minimum Allowable First Span Length for SBC Connected to Deck or Structural Steelwork
*Printed page 81, PDF page 89.*

When an SBC is supported to the deck or structural steelwork, differential thermal/mechanical displacement between the parent header and structure can induce high bending stresses at the branch connection.
- **Evaluation Rule**:
  $$\text{Modified Minimum Span} = L_{\text{span}} \times (\text{Fitting Span Factor})$$
  - If $\text{Modified Minimum Span} < L_{\text{min allowable}} \implies \mathbf{\text{LOF}_{\text{GEOM}}(E) = 0.70}$
  - If $\text{Modified Minimum Span} \ge L_{\text{min allowable}} \implies \mathbf{\text{LOF}_{\text{GEOM}}(E) = 0.20}$

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

## 3. Table T3-3 — Minimum Allowable Span Length for SBC Connected Between Two Main Lines
*Printed page 82, PDF page 90.*

When an SBC connects between two independently moving process headers:
- **Evaluation Rule**:
  $$\text{Modified Minimum Span} = L_{\text{span}} \times (\text{Fitting Span Factor})$$
  - If $\text{Modified Minimum Span} < L_{\text{min allowable}} \implies \mathbf{\text{LOF}_{\text{GEOM}}(K) = 0.70}$
  - If $\text{Modified Minimum Span} \ge L_{\text{min allowable}} \implies \mathbf{\text{LOF}_{\text{GEOM}}(K) = 0.20}$

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

## 4. Controlled Digitized Datasets for Figures T3-1 to T3-4

Every data point represents the exact upper boundary threshold for that LOF score at the specified nominal pipe diameter.

### Standard Evaluator Decision Logic
For any modified span length $L_{\text{mod}}$ at diameter $D$:
1. If $L_{\text{mod}} \le Y(\text{LOF}=0.2) \implies \text{LOF} = 0.20$ (or $0.30$ for Fig T3-4).
2. If $Y(\text{LOF}=0.2) < L_{\text{mod}} \le Y(\text{LOF}=0.4) \implies \text{LOF} = 0.40$.
3. If $Y(\text{LOF}=0.4) < L_{\text{mod}} \le Y(\text{LOF}=0.6) \implies \text{LOF} = 0.60$.
4. If $L_{\text{mod}} > Y(\text{LOF}=0.6) \implies \text{LOF} = 0.70$.

---

### Figure T3-1 — Maximum Span Connected to Main Line and Involving Mass
*Printed page 82, PDF page 90.*  
*Applicability: Evaluates first span geometric likelihood of failure $\text{LOF}_{\text{GEOM}}(D)$ or bridge span $\text{LOF}_{\text{GEOM}}(J)$ when unsupported mass (valve/flange) is present.*

```text
Figure_ID | Curve_or_Series | X_Value | X_Unit | Y_Value | Y_Unit | Result_LOF | Source_Page | Notes
```

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

### Figure T3-2 — Maximum Span Length Connected to Main Line and with No Additional Mass
*Printed page 83, PDF page 91.*  
*Applicability: Evaluates first span geometric likelihood of failure $\text{LOF}_{\text{GEOM}}(D)$ when NO unsupported mass is present.*

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

### Figure T3-3 — Maximum Span Length for Subsequent Spans and Involving Mass
*Printed page 83, PDF page 91.*  
*Applicability: Evaluates subsequent span geometric likelihood of failure $\text{LOF}_{\text{GEOM}}(F)$ when unsupported mass is present on intermediate spans.*

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

### Figure T3-4 — Maximum Span Length for Subsequent Spans and with No Additional Mass
*Printed page 84, PDF page 92.*  
*Applicability: Evaluates subsequent span geometric likelihood of failure $\text{LOF}_{\text{GEOM}}(G)$ when no unsupported mass is present on intermediate spans.*

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

## 5. Type 3 SBC Assessment Synthesis & Formulation

*Reference: Flowcharts T3-5, T3-6, T3-7, T3-9 (PDF pp. 84–88) and Appendix D Worked Examples (PDF pp. 222–227).*

1. **First Span Synthesis**:
   $$\text{LOF}_{\text{GEOM}}(\text{first span}) = \max\left[\text{LOF}_{\text{GEOM}}(C), \text{LOF}_{\text{GEOM}}(D), \text{LOF}_{\text{GEOM}}(E)\right]$$
   $$\text{SBC Modifier}(\text{first span}) = \min\left[\text{LOF}_{\text{GEOM}}(\text{first span}), \text{LOF}_{\text{LOC}}\right]$$
   Where:
   - $\text{LOF}_{\text{GEOM}}(C)$: Cantilever mass score (from Flowchart T3-3).
   - $\text{LOF}_{\text{GEOM}}(D)$: Figure T3-1 lookup (if mass) or Figure T3-2 lookup (if no mass) evaluated at $L_{\text{first}} / (\text{Fitting Factor})$.
   - $\text{LOF}_{\text{GEOM}}(E)$: Table T3-2 minimum span comparison ($0.7$ if $L_{\text{first}} \times \text{Fitting Factor} < L_{\text{min}}$, else $0.2$).
   - $\text{LOF}_{\text{LOC}}$: Parent pipe schedule & location modifier (Flowchart T3-9).

2. **Subsequent Spans Synthesis**:
   $$\text{LOF}_{\text{GEOM}}(\text{subsequent spans}) = \max\left[\text{LOF}_{\text{GEOM}}(F), \text{LOF}_{\text{GEOM}}(G)\right]$$
   $$\text{SBC Modifier}(\text{subsequent spans}) = \min\left[\text{LOF}_{\text{GEOM}}(\text{subsequent spans}), \text{LOF}_{\text{LOC}}\right]$$
   Where:
   - $\text{LOF}_{\text{GEOM}}(F)$: Figure T3-3 lookup for maximum subsequent span with mass.
   - $\text{LOF}_{\text{GEOM}}(G)$: Figure T3-4 lookup for maximum subsequent span without mass.

3. **Overall SBC Score**:
   $$\text{SBC Modifier} = \max\left[\text{SBC Modifier}(\text{first span}), \text{SBC Modifier}(\text{subsequent spans})\right]$$
   $$\mathbf{\text{SBC LOF}} = \text{Main Line Multiplier} \times \text{Main Line LOF} \times \text{SBC Modifier}$$
