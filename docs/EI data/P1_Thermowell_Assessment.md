# Priority P1 — Quantitative Thermowell LOF Assessment Master Data (Technical Module T4)

*Source Document: Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition), Technical Module T4: Quantitative Thermowell LOF Assessment (printed pages 85–88, PDF pages 93–96).*

---

## 1. Table T4-1 — Parent Pipework Wall Thickness Modifier $F_M$
*Printed page 87, PDF page 95.*

The wall thickness of the parent pipe affects the structural natural frequency of the thermowell because the nozzle / header junction cannot be considered infinitely rigid (clamped base), especially on thin-walled pipe.
If the thermowell boss/nozzle is stiffened with 4-way welded gussets at $90^\circ$ intervals, the base rotational stiffness is restored and $F_M$ increases.

| Parent Pipe Schedule Classification | Wall Thickness Modifier $F_M$ (Plain Connection) | Wall Thickness Modifier $F_M$ (With 4-Way Welded Gussets) | Structural Rationale |
| :--- | :---: | :---: | :--- |
| **Schedule 160 or greater** | `0.96` | `0.98` | Very stiff parent pipe wall; acts almost as an ideal clamped cantilever base. |
| **Schedule 80 to less than Schedule 160** | `0.93` | `0.96` | Heavy wall process piping with minimal junction ovalization. |
| **Schedule 40 to less than Schedule 80** | `0.85` | `0.93` | Standard schedule piping; moderate rotational flexibility at nozzle intersection. |
| **Less than Schedule 40 (Thin Wall)** | `0.42` | `0.85` | Highly flexible pipe shell; fundamental natural frequency drops by over 50% without gussets. |

---

## 2. Thermowell Geometry Taxonomy & Parameters

*Reference: Figure T4-1 (PDF p. 93) & Section T4.2 (PDF pp. 94–95).*

```text
       STRAIGHT                  TAPERED                           STEPPED
       
   |              |          |              |                 |              |
   |              |          |              |                 |    D1, L1    |
   |              |          |  D1 (Root)   |                 |              |
   |   Dtw, Ltw   |          |              |                 +--------------+
   |              |          \              /                 |              |
   |              |           \   D2 (Tip) /                  |    D2, L2    |
   +--------------+            +----------+                   +--------------+
```

### Parameter Definitions

| Parameter Symbol | Description | Engineering Unit | Applicability |
| :---: | :--- | :---: | :--- |
| $L_{tw}$ | Overall insertion length from support point (weld root / flange face) to tip | $\text{m}$ | All thermowells |
| $L_1$ | Length of the root (larger diameter) section | $\text{m}$ | Stepped thermowell ($L_{tw} = L_1 + L_2$) |
| $L_2$ | Length of the tip (smaller diameter) section | $\text{m}$ | Stepped thermowell |
| $D_{tw}$ | Outside diameter of straight thermowell | $\text{mm}$ | Straight thermowell |
| $D_1$ | Outside diameter at root / base section | $\text{mm}$ | Tapered & Stepped thermowells |
| $D_2$ | Outside diameter at tip section | $\text{mm}$ | Tapered & Stepped thermowells |
| $d_{tw}$ | Internal bore diameter | $\text{mm}$ | All thermowells |
| $D_A$ | Weighted average outside diameter | $\text{mm}$ | Stepped: $D_A = \frac{L_1 D_1 + L_2 D_2}{L_1 + L_2}$ |
| $k$ | Diameter taper ratio ($D_2 / D_1$) | — | Tapered thermowell |
| $\delta$ | Bore to root diameter ratio ($d_{tw} / D_1$) | — | Tapered thermowell |
| $\delta_A$ | Bore to average diameter ratio ($d_{tw} / D_A$) | — | Stepped thermowell |
| $E_{tw}$ | Modulus of Elasticity of thermowell material at operating temperature | $\text{Pa}$ | All ($2.0 \times 10^{11}\text{ Pa}$ for 316 SS at $20^\circ\text{C}$) |
| $\rho$ | Material density of thermowell | $\text{kg/m}^3$ | All ($7900\text{ kg/m}^3$ for austenitic SS) |
| $I$ | Second moment of area: $I = \frac{\pi}{64} (D_{tw}^4 - d_{tw}^4) \times 10^{-12}$ | $\text{m}^4$ | Straight thermowell |
| $A$ | Cross-sectional metal area: $A = \frac{\pi}{4} (D_{tw}^2 - d_{tw}^2) \times 10^{-6}$ | $\text{m}^2$ | Straight thermowell |

---

## 3. Fundamental Structural Natural Frequency ($f_n$) Formulations

### 3.1 Straight Thermowell (Equation 1, PDF p. 94)
$$f_n = \frac{3.516}{2 \pi L_{tw}^2} \sqrt{\frac{E_{tw} I}{\rho A}}$$

### 3.2 Tapered Thermowell (Equation 2, PDF p. 94)
$$f_n = \frac{1.12}{1000} \frac{D_1}{L_{tw}^2} \sqrt{\frac{E_{tw}}{\rho}} \sqrt{\frac{5 + 15k + 35k^2 + 70k^3 + 126k^4 - 2142 \delta^2}{5353 - 8008 \delta^2}}$$

### 3.3 Stepped Thermowell (Equation 3, PDF p. 95)
$$f_n = \frac{0.14}{1000} \frac{D_A}{L_{tw}^2} \sqrt{\frac{E_{tw}}{\rho (1 + \delta_A^2)}}$$

---

## 4. Vortex Shedding Excitation Frequency ($F_v$)

1. **Reynolds Number ($\text{Re}$)** (refer to Appendix B, Section B.9):
   $$\text{Re} = \frac{\rho_{\text{fluid}} \cdot v \cdot D_{\text{char}}}{1000 \cdot \mu}$$
   Where:
   - $\rho_{\text{fluid}}$: Fluid density ($\text{kg/m}^3$).
   - $v$: Mean fluid flow velocity in the main line ($\text{m/s}$).
   - $\mu$: Dynamic viscosity ($\text{Pa}\cdot\text{s}$).
   - $D_{\text{char}}$: Characteristic tip diameter ($\text{mm}$):
     - Straight thermowell: $D_{\text{char}} = D_{tw}$
     - Tapered & Stepped thermowells: $D_{\text{char}} = D_2$

2. **Strouhal Number ($S$)** (Equation 4, PDF p. 96):
   $$S = 0.184 + 0.012 \log_{10}(\text{Re})$$

3. **Vortex Shedding Frequency ($F_v$)** (Equation 5, PDF p. 96):
   $$F_v = \frac{S \cdot v \cdot 1000}{D_{\text{char}}}$$

---

## 5. Quantitative Acceptance Criteria & LOF Disposition (Flowchart T4-1)

The effective structural natural frequency is adjusted for parent pipewall flexibility:
$$f_{n,\text{effective}} = f_n \times F_M$$

The excitation frequency ratio $R$ is evaluated:
$$R = \frac{F_v}{f_{n,\text{effective}}} = \frac{F_v}{f_n \cdot F_M}$$

| Frequency Ratio Condition | Outcome Disposition | Assigned LOF | Action Required |
| :---: | :---: | :---: | :--- |
| **$R > 0.80$** (Resonance Lock-in Risk) | **FAIL** | $\mathbf{1.00}$ | Potential vortex-induced lock-in. Shorten insertion length $L_{tw}$, increase tip diameter, or add 4-way gusset plates. |
| **$R \le 0.80$** (Adequate Frequency Margin) | **PASS** | $\mathbf{0.29}$ | Thermowell design is structurally acceptable under evaluated flow conditions. |

### Proximity Rule
If two or more thermowells are installed in close proximity along the main line:
$$\text{Spacing} \le 10 \times D_{\text{char}}$$
Turbulent wake vortices from the upstream thermowell can amplify dynamic excitation on the downstream thermowell. Specialist wake-interaction analysis is required.
