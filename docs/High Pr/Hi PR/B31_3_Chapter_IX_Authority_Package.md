# ASME B31.3 Chapter IX — High Pressure Piping Design Authority Package

**Controlled Standard Reference:** ASME B31.3 *Process Piping*, Chapter IX: *High Pressure Fluid Service* (2024 / 2022 Editions).  
**Document Custody & Scope:** Primary engineering authority governing High Pressure Piping classification, static pressure containment design, component rules, and invocation of ASME Section VIII Division 3 fatigue analysis.

---

## 1. Controlled Authority & Scope Boundaries

### 1.1 High Pressure Fluid Service Classification (Paragraph K300)
* **Application (Paragraph K300.1.1):** High Pressure Fluid Service applies to piping systems designated by the Owner when design pressures and operating conditions exceed the rating boundaries of ASME B16.5 Class 2500 flanges, or where extreme cyclic/dynamic severity requires high-pressure engineering rules.
* **Exclusions (Paragraph K300.1.4):**
  * Piping systems operating within conventional ASME B31.3 Base Code pressure ratings (unless explicitly owner-designated).
  * Non-metallic piping materials (prohibited in High Pressure Fluid Service).
  * Tubes and headers of fired heaters, internal vessel piping, and boiler external piping governed by ASME Section I.
* **Piping System Boundaries:** Applies from the terminal connections of high-pressure equipment (vessels, compressors, pumps) throughout the interconnected high-pressure piping headers, bypasses, vents, and drains.

---

## 2. Straight Pipe Pressure Design (Paragraph K304.1)

### 2.1 Governing Pressure Design Equations (Paragraph K304.1.2)
For thick-walled high-pressure straight pipe under internal design pressure $P$, the required pressure-design thickness $t$ is calculated by the logarithmic (Lamé thick-wall) formulation:

#### Outside Diameter ($D$) Basis:
$$t = \frac{D}{2} \left( 1 - \exp\left( -\frac{P}{S} \right) \right)$$

#### Inside Diameter ($d$) Basis:
$$t = \frac{d + 2c}{2} \left( \exp\left( \frac{P}{S} \right) - 1 \right)$$

#### Maximum Allowable Internal Pressure ($P$):
$$P = S \cdot \ln\left( \frac{D}{D - 2t} \right) = S \cdot \ln\left( \frac{D}{d + 2c} \right)$$

Where:
* $P$ = Internal design gage pressure ($\text{MPa}$ or $\text{psig}$)
* $D$ = Outside diameter of pipe ($\text{mm}$ or $\text{in.}$)
* $d$ = Inside diameter of pipe ($\text{mm}$ or $\text{in.}$)
* $t$ = Pressure design thickness ($\text{mm}$ or $\text{in.}$)
* $S$ = Basic allowable stress from ASME B31.3 Table K-1 at design temperature ($\text{MPa}$ or $\text{ksi}$)
* $c$ = Sum of mechanical, corrosion, erosion, and threading allowances:
  $$c = c_{\text{corr}} + c_{\text{mech}} + c_{\text{thread}}$$

### 2.2 Minimum Required Wall Thickness ($t_m$) & Manufacturing Tolerance
The minimum required thickness $t_m$ including allowances is:
$$t_m = t + c$$

The selected nominal wall thickness $T_{\text{nom}}$ must satisfy the manufacturing under-tolerance criterion:
$$T_{\text{nom}} \cdot (1 - \text{Tol}_{\text{mfg}}) \ge t_m$$
* For standard seamless forged pipe, standard mill under-tolerance $\text{Tol}_{\text{mfg}} = 0.125$ ($12.5\%$).
* For precision machined/bored forgings, specified drawing machining tolerance applies.

---

## 3. Material Authority & Allowable Stress (Paragraph K302 / Table K-1)

### 3.1 Basic Allowable Stress Basis
Basic allowable stress values in tension ($S$) are governed by Table K-1 and determined as:
$$S = \min\left( \frac{2}{3} S_y, \; \frac{1}{3} S_u \right)$$
where $S_y$ is the yield strength and $S_u$ is the specified minimum tensile strength at design temperature.

### 3.2 Temperature Rules & Property Derating
* For intermediate design temperatures, linear interpolation between Table K-1 temperatures is mandatory.
* Operation above the maximum temperature listed in Table K-1 is strictly prohibited (Fail-Closed: `B31_3_TEMPERATURE_EXCEEDED`).
* No extrapolation below minimum design metal temperature (MDMT) without impact qualification per Paragraph K323.2.

---

## 4. Mandatory Invocation of ASME Section VIII Division 3 (Paragraph K304.8)

### 4.1 Invocation Mandate (Paragraph K304.8.1)
Fatigue analysis is **mandatory for all components in High Pressure Fluid Service**, including straight pipe, elbows, bends, tees, forged branch blocks, and end closures, subject to cyclic loading, pressure fluctuations, mechanical vibration, or thermal transients.

### 4.2 Referenced ASME Section VIII-3 Methodology
* Fatigue analysis shall be conducted in accordance with **ASME Boiler and Pressure Vessel Code, Section VIII, Division 3**:
  * **Article KD-2:** Basic elastic stress field determination and principal stress intensity calculations.
  * **Article KD-3:** Linear elastic fatigue analysis and cumulative usage factor calculation.
  * **Article KD-4:** Fracture mechanics fatigue crack growth evaluation (mandatory if leak-before-burst cannot be established).
* **Cross-Code Edition Relationship:** The edition of ASME Section VIII Division 3 referenced by B31.3 Chapter IX is the current endorsed edition or addenda cited in B31.3 Appendix E / referenced standards table.

---

## 5. High-Pressure Component Specific Rules (Paragraphs K305–K308)

| Component Type | Governing Paragraph | Permitted Construction Details | Explicit Prohibitions / Exclusions |
| :--- | :--- | :--- | :--- |
| **Straight Pipe** | K305 | Seamless pipe and bored forgings only. | Longitudinal welded pipe is prohibited unless 100% UT/RT examined and qualified under Chapter IX. |
| **Bends & Elbows** | K304.2 / K306.2 | Forged seamless elbows, induction bends with controlled thinning. Thickness at intrados/extrados must meet K304.2. | Miter bends and segmented cut elbows are strictly prohibited. |
| **Branch Connections** | K304.3 / K306.1 | Integrally reinforced forged tees, contoured extruded outlets, and monolithic forged blocks. | Unreinforced fabricated stub-in / set-on branches and pad-reinforced nozzles are prohibited. |
| **Flanges & Closures** | K308 / K304.5 | High-pressure proprietary hub/clamp connectors (e.g. Grayloc, Techlok) or Section VIII-3 Part KD designed flanges. | ASME B16.5 standard slip-on, threaded, or socket-weld flanges are strictly prohibited. |
| **Valves** | K307 | Specially designed high-pressure valves meeting API 6A / ASME VIII-3 rules. | Standard low-pressure commercial casting valves without NDE. |

---

## 6. Static Pressure Containment Pass/Fail Ledger

```text
EVIDENCE LEDGER:
1. Nominal Dimensions: Outside Diameter D, Inside Diameter d, Nominal Wall Tnom
2. Allowances: Corrosion c_corr, Mill Tolerance Tol_mfg
3. Operating Envelope: Design Pressure P_des, Design Temp T_des
4. Material Authority: Material Grade, Table K-1 Allowable S(T_des), Sy(T_des), Su(T_des)
5. Thickness Verification:
   - Required Pressure Thickness: t = (D/2) * (1 - exp(-P_des / S))
   - Minimum Required Thickness: tm = t + c_corr
   - Available Minimum Wall: Tmin_avail = Tnom * (1 - Tol_mfg)
   - PASS CRITERION: Tmin_avail >= tm
6. Maximum Allowable Working Pressure (MAWP):
   - MAWP = S * ln( D / (D - 2 * (Tmin_avail - c_corr)) )
   - PASS CRITERION: MAWP >= P_des
7. High-Pressure Routing Decision:
   - PASS -> Invoke ASME VIII-3 Article KD-2 for Elastic Stress Tensor calculation.
   - FAIL -> Reject component (B31_3_STATIC_PRESSURE_EXCEEDED).
```
