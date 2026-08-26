# Priority P1 — Valve Transient & Cavitation/Flashing Master Data (Technical Module T2.8 & T2.9)

*Source Document: Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition), Technical Module T2: Quantitative Main Line LOF Assessment (printed pages 63–70, PDF pages 71–78).*

---

## 1. T2.8 Valve Transient Assessment

### 1.1 Liquid or Multiphase Valve Closure (Flowchart T2-7)

Fast closure of an inline valve (such as an Emergency Shutdown Valve / ESDV) generates acoustic pressure surge waves (water hammer) and unbalanced dynamic shaking forces.

#### Mathematical Formulations

1. **Piping Acoustic Pipe Period ($T_c$)**:
   $$T_c = \frac{2 L}{c}$$
   Where:
   - $L$: Length of pipe from the closing valve to the first major upstream/downstream reflection boundary / vessel (m).
   - $c$: Speed of sound in the fluid (m/s) (refer to Appendix B, Section B.8.2).

2. **Effective Closure Time ($\tau_{\text{eff}}$)**:
   $$\tau_{\text{eff}} = \phi \cdot t_{\text{closure}}$$
   Where:
   - $t_{\text{closure}}$: Total mechanical stroke time of the valve actuator (s).
   - $\phi$: Dimensionless valve characteristic closure factor (fraction of total stroke where primary flow interruption occurs).

3. **Joukowsky Peak Transient Overpressure ($\Delta P$)**:
   - **Rapid Closure ($\tau_{\text{eff}} \le T_c$)**:
     $$\Delta P = \rho \cdot c \cdot \Delta v$$
   - **Slow Closure ($\tau_{\text{eff}} > T_c$)**:
     $$\Delta P = \rho \cdot c \cdot \Delta v \cdot \left(\frac{T_c}{\tau_{\text{eff}}}\right)$$
   Where:
   - $\rho$: Fluid density ($\text{kg/m}^3$).
   - $\Delta v$: Change in fluid velocity upon closure (m/s).

4. **Maximum Peak Pressure**:
   $$P_{\text{peak}} = P_{\text{operating}} + \Delta P$$

---

### 1.2 Valve Closure Characteristic Factor $\phi$ Master Dataset

| Valve Style / Trim Type | Typical Effective Closure Fraction $\phi$ | Flow Reduction Characteristic | Applicable Valve Types & Standards | Engineering Rationale |
| :--- | :---: | :--- | :--- | :--- |
| **Quick Opening** | `0.80 – 0.90` | Steep initial flow reduction | Quick-dump valves, relief valves | 80–90% of flow interruption occurs almost immediately upon stem movement. |
| **Linear Trim** | `0.40 – 0.50` | Proportional to stroke | Linear control globe valves | Default $\phi = 0.50$ when specific trim Cv curve is unavailable. |
| **Equal Percentage ($= \%$)** | `0.10 – 0.20` | Highly non-linear; steep final drop | Equal-% globe, high-performance ball | Flow is throttled heavily only in the final 15–20% of stroke travel. Effective closure time is very short. |
| **Quarter-Turn Butterfly** | `0.20 – 0.30` | Non-linear near seat | Standard concentric / eccentric butterfly | Flow cutoff occurs primarily in the final $30^\circ$ of disc rotation. |
| **Full Bore Ball Valve** | `0.15 – 0.25` | Very steep cutoff at final rotation | API 6D ESDVs, trunnion ball valves | Default $\phi = 0.20$ for fast-acting pipeline shutdown valves. |
| **Gate / Wedge Valve** | `0.20 – 0.35` | Parabolic area cutoff | Wedge gate, parallel slide | Primary flow reduction occurs as gate enters seating pocket. |

---

### 1.3 Rapid Valve Opening Assessment (Flowchart T2-6b [Surge] & Flowchart T2-8)

> [!NOTE]
> **Source Document Numbering Disambiguation:**
> In the printed Energy Institute Guidelines (2nd Edition), page 74 (PDF page 74) labels the dry gas rapid opening workflow as *Flowchart T2-6*, which duplicates the numbering of *Flowchart T2-6 (AIV Discontinuity Assessment)* on page 69. In our controlled database architecture, the dry gas surge flowchart is designated **Flowchart T2-6b (Surge)** to ensure zero ambiguity with AIV fatigue calculations.

Rapid opening of a valve into an unpressurized downstream header or vent line creates transient dynamic momentum and shock loading.

- **Dynamic Thrust Force ($F_{\text{thrust}}$)**:
  $$F_{\text{thrust}} = \dot{m} v + (P_{\text{exit}} - P_{\text{ambient}}) A_{\text{exit}}$$
- **Transient Fluid Acceleration Force on Elbows ($F_{\text{elbow}}$)**:
  $$F_{\text{elbow}} = \Delta P_{\text{wave}} \cdot A_{\text{pipe}} \cdot \sqrt{2(1 - \cos \theta)}$$
- **Screening Threshold**: If opening time $t_{\text{open}} < 1.0\text{ s}$ and $\Delta P_{\text{initial}} > 10\text{ bar} \implies \mathbf{\text{LOF} = 1.0}$, requiring dynamic support restraint qualification.

---

## 2. T2.9 Cavitation & Flashing Assessment

*Source: Technical Module T2, Section T2.9, printed pages 69–70, PDF pages 77–78.*

### 2.1 Governing Formulations

1. **Cavitation Index ($\sigma$)**:
   $$\sigma = \frac{P_{\text{upstream}} - P_v}{P_{\text{upstream}} - P_{\text{downstream}}}$$
   Where $P_v$ is the true fluid vapor pressure at flowing temperature (bar a).

2. **Incipient Cavitation Index Ratio ($K_c$)**:
   $$K_c = 0.80 \cdot F_L^2$$
   Where $F_L$ is the valve liquid pressure-recovery factor.

3. **Choked Flow Pressure Drop ($\Delta P_{\text{choked}}$)**:
   $$\Delta P_{\text{choked}} = F_L^2 \cdot (P_{\text{upstream}} - F_F \cdot P_v)$$
   Where $F_F$ is the liquid critical pressure ratio factor ($F_F = 0.96 - 0.28 \sqrt{P_v / P_c}$).

---

### 2.2 Valve Pressure-Recovery Factor $F_L$ Master Lookup Table

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

### 2.3 Decision Tree & Outcome Disposition (Flowchart T2-9)

| Operating Regime | Mathematical Criterion | Phenomenon | Assigned LOF | Action Required |
| :--- | :---: | :--- | :---: | :--- |
| **Flashing Regime** | $\sigma \le 1.00$ | Liquid flashes to vapor downstream; two-phase erosive jet | $\mathbf{1.00}$ | Multi-stage trim, expanded downstream piping, or relocation. |
| **Severe Cavitation Regime** | $1.00 < \sigma \le \frac{1}{K_c}$ | Vapor cavities form at vena contracta and collapse violently | $\mathbf{1.00}$ | Anti-cavitation tortuous trim or pressure reduction stages. |
| **Incipient Cavitation Margin** | $\frac{1}{K_c} < \sigma \le \frac{1.2}{K_c}$ | Intermittent micro-bubble collapse near boundary | $\mathbf{0.50}$ | Inspect piping wall and monitor high-frequency acoustics. |
| **Cavitation-Free Regime** | $\sigma > \frac{1.2}{K_c}$ | Fluid static pressure remains safely above vapor pressure | $\mathbf{0.20}$ | Design is acceptable under evaluated operating envelope. |
