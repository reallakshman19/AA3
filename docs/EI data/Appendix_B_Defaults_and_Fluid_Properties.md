# Energy Institute Appendix B Defaults & Fluid Properties Master Register

*Source Document: Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition), Appendix B: Sample Parameters (printed pages 158–161, PDF pages 166–169) & Technical Module T2.3 (PDF page 62).*

---

## 1. Speed of Sound in Common Process Liquids (Section B.8.2)
*Printed page 158, PDF page 166.*

Liquid speed of sound $c$ at $20^\circ\text{C}$ and standard atmospheric / reference conditions:

| Process Liquid | Speed of Sound $c$ (m/s at $20^\circ\text{C}$) | Typical Density $\rho$ ($\text{kg/m}^3$) | Isothermal Bulk Modulus $K$ (GPa) |
| :--- | :---: | :---: | :---: |
| **Benzene** | `1321` | 876 | 1.53 |
| **Crude Oil** | `1385` | 850 | 1.63 |
| **Ethanol** | `1180` | 789 | 1.10 |
| **Ethyl ether** | `1008` | 713 | 0.72 |
| **Gasoline** | `1166` | 740 | 1.01 |
| **Heptene** | `1082` | 697 | 0.82 |
| **Hexane** | `1203` | 655 | 0.95 |
| **Hydraulic oil** | `1280` | 880 | 1.44 |
| **Kerosene** | `1315` | 800 | 1.38 |
| **Methanol** | `1123` | 792 | 1.00 |
| **Naphtha** | `1225` | 760 | 1.14 |
| **Nonane** | `1248` | 718 | 1.12 |
| **Octane** | `1192` | 703 | 1.00 |
| **Pentane** | `1008` | 626 | 0.64 |
| **Sea water** | `1481` | 1025 | 2.25 |
| **Water (Pure, Ref)** | `1482` | 998 | 2.19 |

---

## 2. Reynolds Number Formulation & Characteristic Dimensions (Section B.9)
*Printed page 158, PDF page 166.*

$$\text{Re} = \frac{\rho \cdot v \cdot D_{\text{char}}}{1000 \cdot \mu}$$

Where:
- $\rho$: Fluid density ($\text{kg/m}^3$).
- $v$: Mean fluid velocity ($\text{m/s}$).
- $\mu$: Dynamic viscosity ($\text{Pa}\cdot\text{s}$).
- $D_{\text{char}}$: Characteristic dimension ($\text{mm}$), defined by mechanism:
  - **Pulsation — Flow Induced Excitation in Deadlegs (T2.6.3)**: $D_{\text{char}} = D_{\text{int}}$ (Internal diameter of the main line).
  - **Thermowell Vortex Shedding (TM-04 / T4)**: $D_{\text{char}} = D_{\text{tip}}$ ($D_{tw}$ for straight thermowells; $D_2$ for tapered and stepped thermowells).

---

## 3. Gas Dynamic Viscosity vs Temperature (Figure B-1 / Section B.2)
*Printed page 159, PDF page 167.*

Dynamic Viscosity $\mu$ ($\text{Pa}\cdot\text{s} \times 10^{-5}$ or $\text{cP} \times 10^{-2}$) across process operating temperatures:

| Fluid / Gas Composition | $-50^\circ\text{C}$ | $0^\circ\text{C}$ | $50^\circ\text{C}$ | $150^\circ\text{C}$ | $250^\circ\text{C}$ | $350^\circ\text{C}$ | $450^\circ\text{C}$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Air** | $1.46 \times 10^{-5}$ | $1.72 \times 10^{-5}$ | $1.96 \times 10^{-5}$ | $2.39 \times 10^{-5}$ | $2.76 \times 10^{-5}$ | $3.11 \times 10^{-5}$ | $3.44 \times 10^{-5}$ |
| **Methane ($\text{CH}_4$, SG=0.55)** | $0.88 \times 10^{-5}$ | $1.03 \times 10^{-5}$ | $1.18 \times 10^{-5}$ | $1.44 \times 10^{-5}$ | $1.67 \times 10^{-5}$ | $1.88 \times 10^{-5}$ | $2.08 \times 10^{-5}$ |
| **HC Gas (SG = 0.75)** | $0.78 \times 10^{-5}$ | $0.92 \times 10^{-5}$ | $1.05 \times 10^{-5}$ | $1.29 \times 10^{-5}$ | $1.51 \times 10^{-5}$ | $1.71 \times 10^{-5}$ | $1.89 \times 10^{-5}$ |
| **HC Gas (SG = 1.00)** | $0.68 \times 10^{-5}$ | $0.81 \times 10^{-5}$ | $0.94 \times 10^{-5}$ | $1.16 \times 10^{-5}$ | $1.36 \times 10^{-5}$ | $1.54 \times 10^{-5}$ | $1.71 \times 10^{-5}$ |
| **Nitrogen ($\text{N}_2$)** | $1.41 \times 10^{-5}$ | $1.66 \times 10^{-5}$ | $1.89 \times 10^{-5}$ | $2.30 \times 10^{-5}$ | $2.65 \times 10^{-5}$ | $2.98 \times 10^{-5}$ | $3.28 \times 10^{-5}$ |
| **Carbon Dioxide ($\text{CO}_2$)** | $1.15 \times 10^{-5}$ | $1.39 \times 10^{-5}$ | $1.62 \times 10^{-5}$ | $2.05 \times 10^{-5}$ | $2.44 \times 10^{-5}$ | $2.80 \times 10^{-5}$ | $3.12 \times 10^{-5}$ |
| **Hydrogen ($\text{H}_2$)** | $0.74 \times 10^{-5}$ | $0.84 \times 10^{-5}$ | $0.94 \times 10^{-5}$ | $1.12 \times 10^{-5}$ | $1.28 \times 10^{-5}$ | $1.42 \times 10^{-5}$ | $1.56 \times 10^{-5}$ |
| **Helium ($\text{He}$)** | $1.68 \times 10^{-5}$ | $1.87 \times 10^{-5}$ | $2.06 \times 10^{-5}$ | $2.41 \times 10^{-5}$ | $2.74 \times 10^{-5}$ | $3.05 \times 10^{-5}$ | $3.34 \times 10^{-5}$ |
| **Oxygen ($\text{O}_2$)** | $1.65 \times 10^{-5}$ | $1.92 \times 10^{-5}$ | $2.18 \times 10^{-5}$ | $2.64 \times 10^{-5}$ | $3.05 \times 10^{-5}$ | $3.42 \times 10^{-5}$ | $3.76 \times 10^{-5}$ |

---

## 4. Ratio of Specific Heats ($\gamma = C_p / C_v$) & Sonic Velocity Defaults (Figures B-2 to B-5)
*Printed pages 159–161, PDF pages 167–169.*

Formula for Ideal / Real Gas Speed of Sound $c$:
$$c = \sqrt{\frac{\gamma \cdot Z \cdot R \cdot T}{M_w}}$$

Where $R = 8314.5\text{ J/(kmol}\cdot\text{K)}$, $T$ is temperature in Kelvin, $Z$ is compressibility factor, and $M_w$ is molecular weight ($\text{kg/kmol}$).

| Gas Compound | Molecular Weight $M_w$ | Ratio of Specific Heats $\gamma$ ($20^\circ\text{C}, 1\text{ bar}$) | Typical Sonic Velocity $c$ at $20^\circ\text{C}$ (m/s) |
| :--- | :---: | :---: | :---: |
| **Methane ($\text{CH}_4$)** | `16.04` | `1.31` | 446 |
| **Ethane ($\text{C}_2\text{H}_6$)** | `30.07` | `1.19` | 310 |
| **Propane ($\text{C}_3\text{H}_8$)** | `44.10` | `1.13` | 250 |
| **Dry Natural Gas (Typical SG=0.65)** | `18.85` | `1.28` | 408 |
| **Air** | `28.96` | `1.40` | 343 |
| **Nitrogen ($\text{N}_2$)** | `28.01` | `1.40` | 349 |
| **Carbon Dioxide ($\text{CO}_2$)** | `44.01` | `1.29` | 267 |
| **Chlorine ($\text{Cl}_2$)** | `70.90` | `1.34` | 215 |
| **Steam / Water Vapor ($100^\circ\text{C}$)** | `18.02` | `1.33` | 478 |
| **Hydrogen ($\text{H}_2$)** | `2.016` | `1.41` | 1308 |

---

## 5. Water Vapor Pressure vs Temperature (Figure B-6)
*Printed page 161, PDF page 169.*

| Temperature ($^\circ\text{C}$) | Vapor Pressure $P_v$ (bar a) | Vapor Pressure $P_v$ (kPa a) | Engineering Context |
| :---: | :---: | :---: | :--- |
| **0** | `0.0061` | 0.61 | Freezing point threshold |
| **10** | `0.0123` | 1.23 | Cold ambient water |
| **20** | `0.0234` | 2.34 | Standard reference state |
| **30** | `0.0425` | 4.25 | Warm operating liquid |
| **40** | `0.0738` | 7.38 | Cooling water return |
| **50** | `0.1235` | 12.35 | Process cooling baseline |
| **60** | `0.1994` | 19.94 | Moderate temperature water |
| **70** | `0.3120` | 31.20 | Produced water baseline |
| **80** | `0.4741` | 47.41 | High temperature process liquid |
| **90** | `0.7018` | 70.18 | Near-atmospheric boiling |
| **100** | `1.0133` | 101.33 | Atmospheric boiling point |
| **120** | `1.9854` | 198.54 | Pressurized condensate |
| **150** | `4.7580` | 475.80 | High pressure boiler feed |

---

## 6. Table T2-3 — Mechanical Excitation Baseline Likelihood of Failure
*Printed page 54, PDF page 62.*

| Connected or Adjacent Mechanical Excitation Source | Assigned Baseline LOF | Structural / Dynamic Qualification Gate |
| :--- | :---: | :--- |
| **Reciprocating / Positive Displacement Compressor or Pump** | `0.90` | If detailed structural dynamic analysis (TM-09) proves no coincidence with excitation harmonics, LOF may be reduced to `0.40`. |
| **Diesel Engine / Gas Engine Drive** | `0.80` | If dynamic modal separation analysis (TM-09) confirms no harmonic resonance, LOF may be reduced to `0.40`. |
| **Screw Compressor / Pump** | `0.60` | Subject to rotor pocket pass frequency checks. |
| **Centrifugal Pump** | `0.40` | Standard rotating machine baseline. |
| **Electric Motor / Alternator ($\ge 15\text{ kW}$)** | `0.40` | $2\times$ line electrical frequency & $1\times/2\times$ mechanical running speed. |
| **Electric Motor / Alternator ($< 15\text{ kW}$)** | `0.20` | Low mechanical power excitation. |
| **Centrifugal Compressor** | `0.20` | Continuous flow baseline. |
| **Gas Turbine** | `0.20` | High frequency, low flexural structural coupling. |
| **Fan / Blower** | `0.20` | Blade pass frequency check required. |
| **Pipework sharing supports with line where $\text{LOF} \ge 0.50$** | `Equal to adjacent LOF` | Transmitted structural excitation across shared racks/clamps. |
