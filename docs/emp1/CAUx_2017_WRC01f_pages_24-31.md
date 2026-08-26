# CAUx 2017 - WRC01f.pdf (Pages 24–31)
**Presented by GAURAV BHENDE in CAU EXPRESS 2017**  
**Date:** 27/04/2017

---

## Page 24 (Slide 24)

### Slide 24 - Top: Stress Classification:-
* **$P_m \rightarrow$** General primary membrane stress (primarily due to internal pressure)
* **$P_l \rightarrow$** Local primary membrane stress, which may include:
  * Membrane stress due to internal pressure
  * Local membrane stress due to applied sustained forces and moments
* **$Q \rightarrow$** Secondary stresses, which may include:
  * Bending stress due to internal pressure
  * Bending stress due to applied sustained forces & moments
  * Membrane stress due to applied expansion forces
  * Bending stress due to applied expansion forces & moments
  * Membrane stress due to applied expansion moments
* **$k \rightarrow$** Occasional Stress factor
* **$S_{mh} \rightarrow$** Hot material allowable stress intensity
* **$S_{mc} \rightarrow$** Cold material allowable stress intensity
* **$S_{mavg} \rightarrow$** Average material stress intensity: $(S_{mh} + S_{mc}) / 2$

---

### Slide 24 - Bottom: WRC-107 WARNING
* While using WRC 107 there are no specific geometric restrictions available, hence it is the **responsibility** of the user to take care that the curve values are not exceeded.
* The output report notifies the user if the curve values are exceeded with an **exclamation (!) mark** and warning printed in blue.
* If the curve value is exceeded, one should opt for **Nozzlepro**.

#### Dimensionless Loads for Cylindrical Shells at Attachment Junction (Sample Report Excerpt):
*Curves read for 1979 B1/B2*

| Dimensionless Parameter / Curve | Beta ($\beta$) | Figure | Value | Location |
| :--- | :---: | :---: | :---: | :---: |
| $N_\phi / ( P / R_m )$ | 0.155 | 4C | 7.955 | (A, B) |
| $N_\phi / ( P / R_m )$ | 0.155 | 3C | 5.663 | (C, D) |
| $M_\phi / ( P )$ | 0.155 | 2C1 | 0.042 | (A, B) |
| $M_\phi / ( P )$ | 0.155 | **1C !** | 0.076 | (C, D) |
| $N_\phi / [ M_C / (R_m^2 \cdot \beta) ]$ | 0.155 | 3A | 2.167 | (A, B, C, D) |
| $M_\phi / [ M_C / (R_m \cdot \beta) ]$ | 0.155 | **1A !** | 0.078 | (A, B, C, D) |
| $N_\phi / [ M_L / (R_m^2 \cdot \beta) ]$ | 0.155 | **3B !** | 5.742 | (A, B, C, D) |
| $M_\phi / [ M_L / (R_m \cdot \beta) ]$ | 0.155 | 1B1 | 0.029 | (A, B, C, D) |
| $N_x / ( P / R_m )$ | 0.155 | 3C | 5.663 | (A, B) |
| $N_x / ( P / R_m )$ | 0.155 | 4C | 7.955 | (C, D) |
| $M_x / ( P )$ | 0.155 | 1C1 | 0.078 | (A, B) |
| $M_x / ( P )$ | 0.155 | **2C !** | 0.043 | (C, D) |
| $N_x / [ M_C / (R_m^2 \cdot \beta) ]$ | 0.155 | 4A | 3.831 | (A, B, C, D) |
| $M_x / [ M_C / (R_m \cdot \beta) ]$ | 0.155 | 2A | 0.039 | (A, B, C, D) |
| $N_x / [ M_L / (R_m^2 \cdot \beta) ]$ | 0.155 | **4B !** | 2.105 | (A, B, C, D) |
| $M_x / [ M_L / (R_m \cdot \beta) ]$ | 0.155 | 2B1 | 0.041 | (A, B, C, D) |

> **Note:** The `!` mark next to the figure name denotes curve value exceeded.

---

## Page 25 (Slide 25)

### Slide 25 - Top: WRC ANALYSIS:-Output Report Study

#### Input Echo, 107/537 Item 1
* **Description:** New WRC 107(537)

#### Vessel Input Data
| Parameter | Variable | Value / Setting |
| :--- | :--- | :--- |
| Diameter Basis for Vessel | Vbasis | OD |
| Cylindrical or Spherical Vessel | Cylsph | Cylindrical |
| Internal Corrosion Allowance | Cas | 3.0000 mm |
| Vessel Diameter | Dv | 1844.000 mm |
| Vessel Thickness | Tv | 22.000 mm |
| Vessel Node Number | — | 7051 |
| Design Temperature | — | 350.00 °C |
| Vessel Material | — | SA-516 70 |
| Vessel Cold S.I. Allowable | Smc | 137892.00 kPa |
| Vessel Hot S.I. Allowable | Smh | 128465.29 kPa |
| Attachment Type | Type | Round |

#### Nozzle Input Data
| Parameter | Variable | Value / Setting |
| :--- | :--- | :--- |
| Diameter Basis for Nozzle | Nbasis | OD |
| Corrosion Allowance for Nozzle | Can | 3.0000 mm |
| Nozzle Diameter | Dn | 323.850 mm |
| Nozzle Thickness | Tn | 14.270 mm |
| Nozzle Material | — | SA-333 6 |
| Nozzle Cold S.I. Allowable | SNmc | 117897.66 kPa |
| Nozzle Hot S.I. Allowable | SNmh | 115426.55 kPa |
| Nozzle Node Number | — | 7050 |
| Design Internal Pressure | Dp | 1.970 N/mm² |
| Include Pressure Thrust | — | No |

---

### Slide 25 - Bottom: Direction Cosines & Imported Loads

#### Direction Cosines
* **Vessel Centerline Direction Cosine:** $V_x = 0.000,\; V_y = 1.000,\; V_z = 0.000$
* **Nozzle Centerline Direction Cosine:** $N_x = 1.000,\; N_y = 0.000,\; N_z = 0.000$

#### Imported SUStained Loads
| Load Component | Value | Units |
| :--- | :--- | :--- |
| Global Force (SUS) $F_x$ | -161.0 | N |
| Global Force (SUS) $F_y$ | -2109.0 | N |
| Global Force (SUS) $F_z$ | 53.0 | N |
| Global Moment (SUS) $M_x$ | 775.0 | N·m |
| Global Moment (SUS) $M_y$ | -121.0 | N·m |
| Global Moment (SUS) $M_z$ | -33.0 | N·m |
| Internal Pressure (SUS) $P$ | 1.97 | N/mm² |
| Include Pressure Thrust | No | — |

#### Imported EXPansion Loads
| Load Component | Value | Units |
| :--- | :--- | :--- |
| Global Force (EXP) $F_x$ | 1085.0 | N |
| Global Force (EXP) $F_y$ | -1636.0 | N |
| Global Force (EXP) $F_z$ | -4936.0 | N |
| Global Moment (EXP) $M_x$ | -8657.0 | N·m |
| Global Moment (EXP) $M_y$ | -3933.0 | N·m |
| Global Moment (EXP) $M_z$ | -3031.0 | N·m |

#### Imported OCCasional Loads
| Load Component | Value | Units |
| :--- | :--- | :--- |
| Global Force (OCC) $F_x$ | 1162.0 | N |
| Global Force (OCC) $F_y$ | -330.0 | N |
| Global Force (OCC) $F_z$ | -107.0 | N |
| Global Moment (OCC) $M_x$ | 416.0 | N·m |
| Global Moment (OCC) $M_y$ | 1175.0 | N·m |
| Global Moment (OCC) $M_z$ | -1486.0 | N·m |
| Occasional Internal Pressure (OCC) $P_{var}$ | 0.00 | N/mm² |

---

## Page 26 (Slide 26)

### Slide 26 - Top: WRC ANALYSIS:-Output Report Study (General Options)
* **Occasional Internal Pressure (OCC):** $P_{var} = 0.00	ext{ N/mm}^2$
* **Use Interactive Control:** No
* **WRC107 Version:** Version March 1979 ( B1 & B2 )
* **Include Pressure Stress Indices per Div. 2:** No
* **Compute Pressure Stress per WRC-368:** No

> **Note:** WRC Bulletin 537 provides equations for the dimensionless curves found in bulletin 107. As noted in the foreword to bulletin 537, *"537 is equivalent to WRC 107"*. Where 107 is printed in the results below, *"537"* can be interchanged with *"107"*.

---

### Slide 26 - Bottom: Load Conversion & Dimensionless Parameters

> **Program Callout:** *"Program will Convert the Loads from Global Convention to WRC-107 convention"*

#### WRC 107 Sustained Loads (Local Junction Convention):
* **Radial Load ($P$):** $-161.0	ext{ N}$
* **Circumferential Shear ($V_C$):** $-53.0	ext{ N}$
* **Longitudinal Shear ($V_L$):** $-2109.0	ext{ N}$
* **Circumferential Moment ($M_C$):** $121.0	ext{ N}\cdot	ext{m}$
* **Longitudinal Moment ($M_L$):** $33.0	ext{ N}\cdot	ext{m}$
* **Torsional Moment ($M_T$):** $-775.0	ext{ N}\cdot	ext{m}$

#### Geometric Dimensionless Parameters:
* **Shell Mean Radius & Corroded Thickness:**
  $$R_m = rac{1844 - 22}{2} = 911	ext{ mm}, \quad T = 22 - 3 = 19	ext{ mm}$$
* **Shell Parameter Gamma ($\gamma$):**
  $$	ext{Gamma}(\gamma) = rac{R_m}{T} = rac{911}{19} = 47.94 pprox 48.03$$
* **Nozzle Outer Radius:**
  $$r_0 = rac{323.85}{2} = 161.925 pprox 162	ext{ mm}$$
* **Attachment Parameter Beta ($eta$):**
  $$	ext{Beta}(eta) = rac{0.875 \cdot r_0}{R_m} = rac{0.875 \cdot 162}{911} = 0.155$$

#### Dimensionless Loads for Cylindrical Shells at Attachment Junction:
*Curves read for 1979 B1/B2*

| Dimensionless Parameter | Beta ($eta$) | Figure | Value | Location |
| :--- | :---: | :---: | :---: | :---: |
| $N_\phi / ( P / R_m )$ | 0.155 | 4C | 7.273 | (A, B) |
| $N_\phi / ( P / R_m )$ | 0.155 | 3C | 5.343 | (C, D) |
| $M_\phi / ( P )$ | 0.155 | 2C1 | 0.046 | (A, B) |

---

## Page 27 (Slide 27)

### Slide 27 - Top: Dimensionless Loads Table & Curve Lookup
* **Dimensionless Parameters used:** $	ext{Gamma} = 48.03,\; 	ext{Beta} = 0.155$

| Dimensionless Quantity | Beta ($eta$) | Figure | Value | Location |
| :--- | :---: | :---: | :---: | :---: |
| $N_\phi / ( P / R_m )$ | 0.155 | 4C | 7.273 | (A, B) |
| $N_\phi / ( P / R_m )$ | 0.155 | 3C | 5.343 | (C, D) |
| $M_\phi / ( P )$ | 0.155 | 2C1 | 0.046 | (A, B) |
| $M_\phi / ( P )$ | 0.155 | 1C | 0.079 | (C, D) |
| $N_\phi / [ M_C / (R_m^2 \cdot eta) ]$ | 0.155 | 3A | 1.935 | (A, B, C, D) |
| $M_\phi / [ M_C / (R_m \cdot eta) ]$ | 0.155 | 1A | 0.080 | (A, B, C, D) |
| $N_\phi / [ M_L / (R_m^2 \cdot eta) ]$ | 0.155 | 3B | 5.217 | (A, B, C, D) |
| $M_\phi / [ M_L / (R_m \cdot eta) ]$ | 0.155 | 1B1 | 0.031 | (A, B, C, D) |
| $N_x / ( P / R_m )$ | 0.155 | 3C | 5.343 | (A, B) |
| $N_x / ( P / R_m )$ | 0.155 | 4C | 7.273 | (C, D) |
| $M_x / ( P )$ | 0.155 | 1C1 | 0.082 | (A, B) |
| $M_x / ( P )$ | 0.155 | 2C | 0.045 | (C, D) |
| $N_x / [ M_C / (R_m^2 \cdot eta) ]$ | 0.155 | 4A | 3.318 | (A, B, C, D) |
| $M_x / [ M_C / (R_m \cdot eta) ]$ | 0.155 | 2A | 0.040 | (A, B, C, D) |
| $N_x / [ M_L / (R_m^2 \cdot eta) ]$ | 0.155 | 4B | 1.861 | (A, B, C, D) |
| $M_x / [ M_L / (R_m \cdot eta) ]$ | 0.155 | 2B1 | 0.045 | (A, B, C, D) |

---

### Slide 27 - Bottom: Circumferential Stress ($\sigma_\phi$) Calculation
* **Stress Concentration Factors:** $K_n = 1.00,\; K_b = 1.00$

#### Stresses in the Vessel at the Attachment Junction (kPa):
| Type of Stress | Load | Au | Al | Bu | Bl | Cu | Cl | Du | Dl |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Circ. Memb. | P | 67 | 67 | 67 | 67 | 49 | 49 | 49 | 49 |
| Circ. Bend. | P | 121 | -121 | 121 | -121 | 210 | -210 | 210 | -210 |
| Circ. Memb. | MC | 0 | 0 | 0 | 0 | -95 | -95 | 95 | 95 |
| Circ. Bend. | MC | 0 | 0 | 0 | 0 | -1138 | 1138 | 1138 | -1138 |
| Circ. Memb. | ML | -70 | -70 | 70 | 70 | 0 | 0 | 0 | 0 |
| Circ. Bend. | ML | -118 | 118 | 118 | -118 | 0 | 0 | 0 | 0 |
| **Tot. Circ. Str.** | | **0** | **-5** | **378** | **-102** | **-973** | **882** | **1493** | **-1204** |

#### Governing Equations & Numerical Substitutions:
1. **Circumferential Membrane Stress due to Radial Load $P$:**
   $$	ext{Circ. Memb. Stress }(P) = K_n \left( rac{N_\phi}{P / R_m} ight) \left( rac{P}{R_m \cdot T} ight) = (7.273) \left( rac{161}{911 \cdot 19} ight) 	imes 1000 = 67.65	ext{ kPa}$$

2. **Circumferential Bending Stress due to Radial Load $P$:**
   $$	ext{Circ. Bend. Stress }(P) = K_b \left( rac{M_\phi}{P} ight) \left( rac{6P}{T^2} ight) = (0.046) \left( rac{6 \cdot 161}{19^2} ight) 	imes 1000 = 123.09	ext{ kPa}$$

3. **Circumferential Membrane Stress due to Circumferential Moment $M_C$:**
   $$	ext{Circ. Memb. Stress }(M_C) = K_n \left( rac{N_\phi}{M_C / R_m^2 eta} ight) \left( rac{M_C}{R_m^2 eta \cdot T} ight) = (1.935) \left( rac{121 	imes 1000}{911^2 \cdot 0.155 \cdot 19} ight) 	imes 1000 = 95.79	ext{ kPa}$$

4. **Circumferential Bending Stress due to Circumferential Moment $M_C$:**
   $$	ext{Circ. Bend. Stress }(M_C) = K_b \left( rac{M_\phi}{M_C / R_m eta} ight) \left( rac{6 M_C}{R_m eta \cdot T^2} ight) = (0.080) \left( rac{6 \cdot 121 	imes 1000}{911 \cdot 0.155 \cdot 19^2} ight) 	imes 1000 = 1139	ext{ kPa}$$

5. **Circumferential Membrane Stress due to Longitudinal Moment $M_L$:**
   $$	ext{Circ. Memb. Stress }(M_L) = K_n \left( rac{N_\phi}{M_L / R_m^2 eta} ight) \left( rac{M_L}{R_m^2 eta \cdot T} ight) = (5.217) \left( rac{33 	imes 1000}{911^2 \cdot 0.155 \cdot 19} ight) 	imes 1000 = 70.43	ext{ kPa}$$

6. **Circumferential Bending Stress due to Longitudinal Moment $M_L$:**
   $$	ext{Circ. Bend. Stress }(M_L) = K_b \left( rac{M_\phi}{M_L / R_m eta} ight) \left( rac{6 M_L}{R_m eta \cdot T^2} ight) = (0.031) \left( rac{6 \cdot 33 	imes 1000}{911 \cdot 0.155 \cdot 19^2} ight) 	imes 1000 = 120.41	ext{ kPa}$$

---

## Page 28 (Slide 28)

### Slide 28 - Top: Longitudinal Stress ($\sigma_x$) Calculation

#### Stresses in the Vessel at the Attachment Junction (kPa):
| Type of Stress | Load | Au | Al | Bu | Bl | Cu | Cl | Du | Dl |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Long. Memb. | P | 49 | 49 | 49 | 49 | 67 | 67 | 67 | 67 |
| Long. Bend. | P | 219 | -219 | 219 | -219 | 120 | -120 | 120 | -120 |
| Long. Memb. | MC | 0 | 0 | 0 | 0 | -163 | -163 | 163 | 163 |
| Long. Bend. | MC | 0 | 0 | 0 | 0 | -571 | 571 | 571 | -571 |
| Long. Memb. | ML | -24 | -24 | 24 | 24 | 0 | 0 | 0 | 0 |
| Long. Bend. | ML | -172 | 172 | 172 | -172 | 0 | 0 | 0 | 0 |
| **Tot. Long. Str.** | | **71** | **-22** | **466** | **-317** | **-545** | **354** | **923** | **-461** |

#### Governing Equations & Numerical Substitutions:
1. **Longitudinal Membrane Stress due to Radial Load $P$:**
   $$	ext{Long. Memb. Stress }(P) = K_n \left( rac{N_x}{P / R_m} ight) \left( rac{P}{R_m \cdot T} ight) = (5.343) \left( rac{161}{911 \cdot 19} ight) 	imes 1000 = 49.70	ext{ kPa}$$

2. **Longitudinal Bending Stress due to Radial Load $P$:**
   $$	ext{Long. Bend. Stress }(P) = K_b \left( rac{M_x}{P} ight) \left( rac{6P}{T^2} ight) = (0.082) \left( rac{6 \cdot 161}{19^2} ight) 	imes 1000 = 219.42	ext{ kPa}$$

3. **Longitudinal Membrane Stress due to Circumferential Moment $M_C$:**
   $$	ext{Long. Memb. Stress }(M_C) = K_n \left( rac{N_x}{M_C / R_m^2 eta} ight) \left( rac{M_C}{R_m^2 eta \cdot T} ight) = (3.318) \left( rac{121 	imes 1000}{911^2 \cdot 0.155 \cdot 19} ight) 	imes 1000 = 164.26	ext{ kPa}$$

4. **Longitudinal Bending Stress due to Circumferential Moment $M_C$:**
   $$	ext{Long. Bend. Stress }(M_C) = K_b \left( rac{M_x}{M_C / R_m eta} ight) \left( rac{6 M_C}{R_m eta \cdot T^2} ight) = (0.040) \left( rac{6 \cdot 121 	imes 1000}{911 \cdot 0.155 \cdot 19^2} ight) 	imes 1000 = 569.69	ext{ kPa}$$

5. **Longitudinal Membrane Stress due to Longitudinal Moment $M_L$:**
   $$	ext{Long. Memb. Stress }(M_L) = K_n \left( rac{N_x}{M_L / R_m^2 eta} ight) \left( rac{M_L}{R_m^2 eta \cdot T} ight) = (1.861) \left( rac{33 	imes 1000}{911^2 \cdot 0.155 \cdot 19} ight) 	imes 1000 = 25.12	ext{ kPa}$$

6. **Longitudinal Bending Stress due to Longitudinal Moment $M_L$:**
   $$	ext{Long. Bend. Stress }(M_L) = K_b \left( rac{M_x}{M_L / R_m eta} ight) \left( rac{6 M_L}{R_m eta \cdot T^2} ight) = (0.045) \left( rac{6 \cdot 33 	imes 1000}{911 \cdot 0.155 \cdot 19^2} ight) 	imes 1000 = 174.79	ext{ kPa}$$

---

### Slide 28 - Bottom: Shear Stress Calculation ($	au$) & Coordinate Diagram

#### Stresses in the Vessel at the Attachment Junction (kPa):
| Type of Stress | Load | Au | Al | Bu | Bl | Cu | Cl | Du | Dl |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Shear | VC | -5 | -5 | 5 | 5 | 0 | 0 | 0 | 0 |
| Shear | VL | 0 | 0 | 0 | 0 | 218 | 218 | -218 | -218 |
| Shear | MT | -247 | -247 | -247 | -247 | -247 | -247 | -247 | -247 |
| **Tot. Shear** | | **-253** | **-253** | **-242** | **-242** | **-29** | **-29** | **-465** | **-465** |

#### Governing Equations & Numerical Substitutions:
*Note: On Cylinders, $	heta$ is measured from the longitudinal axis ($	heta = 0^\circ$).*
1. **Shear Stress due to Circumferential Shear Force $V_C$:**
   $$	ext{Shear } V_C = rac{V_C}{\pi r_0 T} \cos(	heta) = rac{53}{\pi \cdot 162 \cdot 19} \cos(0^\circ) 	imes 1000 = 5.480	ext{ kPa}$$

2. **Shear Stress due to Longitudinal Shear Force $V_L$:**
   $$	ext{Shear } V_L = rac{V_L}{\pi r_0 T} \sin(	heta) = rac{2109}{\pi \cdot 162 \cdot 19} \sin(90^\circ) 	imes 1000 = 218.10	ext{ kPa}$$

3. **Shear Stress due to Torsional Moment $M_T$:**
   $$	ext{Shear } M_T = rac{M_T}{2\pi r_0^2 T} = \left( rac{775 	imes 1000}{2\pi \cdot 162^2 \cdot 19} ight) 	imes 1000 = 247.36	ext{ kPa}$$

---

## Page 29 (Slide 29)

### Slide 29 - Top: Combined Stress Intensity ($S$) Evaluation

#### Stresses at Attachment Junction (Sample Row Au):
* $	ext{Tot. Circ. Str. } (\sigma_\phi) = 0	ext{ kPa}$
* $	ext{Tot. Long. Str. } (\sigma_x) = 71	ext{ kPa}$
* $	ext{Tot. Shear } (	au) = -253	ext{ kPa}$
* **Resulting Stress Intensity:** $S = 511	ext{ kPa}$

#### Combined Stress Intensity Rules:
1. **When $\sigma_\phi$ and $\sigma_x$ have like signs:**
   $$S = rac{1}{2} \left[ \sigma_\phi + \sigma_x \pm \sqrt{(\sigma_\phi - \sigma_x)^2 + 4	au^2} ight] \quad	ext{or}\quad \sqrt{(\sigma_\phi - \sigma_x)^2 + 4	au^2}$$
2. **When $	au = 0$:**
   $$S = \max \left( |\sigma_\phi|, |\sigma_x|, |\sigma_\phi - \sigma_x| ight)$$
3. **When $\sigma_\phi$ and $\sigma_x$ have unlike signs:**
   $$S = \sqrt{(\sigma_\phi - \sigma_x)^2 + 4	au^2}$$

#### Sample Substitution at Point Au:
$$S = \sqrt{(\sigma_\phi - \sigma_x)^2 + 4	au^2} = \sqrt{(0 - 71)^2 + 4(253)^2} = 510.95 pprox 511	ext{ kPa}$$

#### Stress Intensities across all 8 points (Au through Dl):
| Stress Category | Au | Al | Bu | Bl | Cu | Cl | Du | Dl |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Str. Int.** | **511** | **506** | **668** | **529** | **975** | **883** | **1754** | **1428** |

*Note: Similarly, stresses are calculated for Expansion and Occasional Loads.*

---

### Slide 29 - Bottom: Expansion & Occasional Load Output Tables

#### WRC 107 Stress Calculation for Expansion Loads:
* Applied Loads: $P = 1085.0	ext{ N},\; V_C = 4936.0	ext{ N},\; V_L = -1636.0	ext{ N},\; M_C = 3933.0	ext{ N}\cdot	ext{m},\; M_L = 3031.0	ext{ N}\cdot	ext{m},\; M_T = 8657.0	ext{ N}\cdot	ext{m}$
* Stress Summary:
  * $	ext{Tot. Circ. Str.}: 	ext{Au} = -18625,\; 	ext{Al} = 4839,\; 	ext{Bu} = 16073,\; 	ext{Bl} = -4108,\; 	ext{Cu} = -41853,\; 	ext{Cl} = 34989,\; 	ext{Du} = 38346,\; 	ext{Dl} = -32819	ext{ kPa}$
  * $	ext{Tot. Long. Str.}: 	ext{Au} = -19947,\; 	ext{Al} = 14686,\; 	ext{Bu} = 16321,\; 	ext{Bl} = -12397,\; 	ext{Cu} = -25144,\; 	ext{Cl} = 13609,\; 	ext{Du} = 22603,\; 	ext{Dl} = -12889	ext{ kPa}$
  * $	ext{Tot. Shear}: 	ext{Au} = 3276,\; 	ext{Al} = 3276,\; 	ext{Bu} = 2255,\; 	ext{Bl} = 2255,\; 	ext{Cu} = 2935,\; 	ext{Cl} = 2935,\; 	ext{Du} = 2596,\; 	ext{Dl} = 2596	ext{ kPa}$
  * $\mathbf{Str. Int.}: 	ext{Au} = 22628,\; 	ext{Al} = 15676,\; 	ext{Bu} = 18455,\; 	ext{Bl} = 12971,\; 	ext{Cu} = 42353,\; 	ext{Cl} = 35385,\; 	ext{Du} = 38763,\; 	ext{Dl} = 33152	ext{ kPa}$

#### WRC 107 Stress Calculation for Occasional Loads:
* Applied Loads: $P = 1162.0	ext{ N},\; V_C = 107.0	ext{ N},\; V_L = -330.0	ext{ N},\; M_C = -1175.0	ext{ N}\cdot	ext{m},\; M_L = 1486.0	ext{ N}\cdot	ext{m},\; M_T = -416.0	ext{ N}\cdot	ext{m}$
* Stress Summary:
  * $	ext{Tot. Circ. Str.}: 	ext{Au} = -9872,\; 	ext{Al} = 2584,\; 	ext{Bu} = 7139,\; 	ext{Bl} = -1801,\; 	ext{Cu} = 10101,\; 	ext{Cl} = -8967,\; 	ext{Du} = -13858,\; 	ext{Dl} = 11291	ext{ kPa}$
  * $	ext{Tot. Long. Str.}: 	ext{Au} = -10832,\; 	ext{Al} = 7864,\; 	ext{Bu} = 6948,\; 	ext{Bl} = -5413,\; 	ext{Cu} = 5771,\; 	ext{Cl} = -3572,\; 	ext{Du} = -8493,\; 	ext{Dl} = 4344	ext{ kPa}$
  * $	ext{Tot. Shear}: 	ext{Au} = -121,\; 	ext{Al} = -121,\; 	ext{Bu} = -143,\; 	ext{Bl} = -143,\; 	ext{Cu} = -98,\; 	ext{Cl} = -98,\; 	ext{Du} = -167,\; 	ext{Dl} = -167	ext{ kPa}$
  * $\mathbf{Str. Int.}: 	ext{Au} = 10847,\; 	ext{Al} = 7867,\; 	ext{Bu} = 7216,\; 	ext{Bl} = 5419,\; 	ext{Cu} = 10104,\; 	ext{Cl} = 8969,\; 	ext{Du} = 13863,\; 	ext{Dl} = 11295	ext{ kPa}$

---

## Page 30 (Slide 30)

### Slide 30 - Top: Stress Summations & Categories

#### Formulas for Pressure & Local Stresses:
* **Circumferential General Primary Membrane Stress due to Internal Pressure:**
  $$	ext{Circ. } P_m(	ext{SUS}) = rac{P \cdot D}{2 T} = rac{1.970 	imes 1844}{2 	imes 19} 	imes 1000 = 95596	ext{ kPa}$$
* **Circumferential Local Primary Membrane Stress (SUS):**
  $$	ext{Circ. } P_l(	ext{SUS}) = 	ext{Circ. Memb. } P + 	ext{Circ. Memb. } M_L = 67 + (-70) = -3	ext{ kPa}$$
* **Circumferential Secondary Bending Stress (SUS):**
  $$	ext{Circ. } Q(	ext{SUS}) = 	ext{Circ. Bend. } P + 	ext{Circ. Bend. } M_L = 121 + (-118) = 3	ext{ kPa}$$

#### Stress Summation Table Across Vessel Attachment Locations (kPa):
| Stress Category | Au | Al | Bu | Bl | Cu | Cl | Du | Dl |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Circ. Pm (SUS) | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 |
| Circ. Pm (OCC) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Circ. Pm (TOTAL)** | **95596** | **95596** | **95596** | **95596** | **95596** | **95596** | **95596** | **95596** |
| Circ. Pl (SUS) | -3 | -3 | 137 | 137 | -45 | -45 | 144 | 144 |
| Circ. Pl (OCC) | -3643 | -3643 | 2668 | 2668 | 567 | 567 | -1283 | -1283 |
| **Circ. Pl (TOTAL)** | **-3646** | **-3646** | **2806** | **2806** | **521** | **521** | **-1138** | **-1138** |
| Circ. Q (SUS) | 2 | -2 | 240 | -240 | -927 | 927 | 1348 | -1348 |
| Circ. Q (OCC) | -6228 | 6228 | 4470 | -4470 | 9534 | -9534 | -12574 | 12574 |
| Circ. Q (EXP) | -18625 | 4839 | 16073 | -4108 | -41853 | 34989 | 38346 | -32819 |
| **Circ. Q (TOTAL)** | **-24850** | **11064** | **20784** | **-8819** | **-33246** | **26382** | **27120** | **-21594** |
| Long. Pm (SUS) | 46326 | 46326 | 46326 | 46326 | 46326 | 46326 | 46326 | 46326 |
| Long. Pm (OCC) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Long. Pm (TOTAL)** | **46326** | **46326** | **46326** | **46326** | **46326** | **46326** | **46326** | **46326** |
| Long. Pl (SUS) | 24 | 24 | 74 | 74 | -95 | -95 | 230 | 230 |
| Long. Pl (OCC) | -1483 | -1483 | 767 | 767 | 1099 | 1099 | -2074 | -2074 |
| **Long. Pl (TOTAL)** | **-1459** | **-1459** | **842** | **842** | **1003** | **1003** | **-1843** | **-1843** |
| Long. Q (SUS) | 46 | -46 | 391 | -391 | -450 | 450 | 692 | -692 |
| Long. Q (EXP) | -19947 | 14686 | 16321 | -12397 | -25144 | 13609 | 22603 | -12889 |
| Long. Q (OCC) | -9348 | 9348 | 6181 | -6181 | 4672 | -4672 | -6418 | 6418 |
| **Long. Q (TOTAL)** | **-29248** | **23988** | **22894** | **-18970** | **-20922** | **9387** | **16876** | **-7162** |

#### Combined Primary & Secondary Summation (Point Au):
* $	ext{Circ. } P_m(	ext{Total}) = P_m(	ext{SUS}) + P_m(	ext{OCC}) = 95596	ext{ kPa}$
* $	ext{Circ. } P_l(	ext{Total}) = P_l(	ext{SUS}) + P_l(	ext{OCC}) = -3646	ext{ kPa}$
* $	ext{Circ. } Q(	ext{Total}) = Q(	ext{SUS}) + Q(	ext{OCC}) + Q(	ext{EXP}) = -24850	ext{ kPa}$
* **Total Primary + Secondary Stress:**
  $$P_m + P_l + Q(	ext{Total}) = 95596 + (-3646) + (-24850) = 67100	ext{ kPa}$$

---

### Slide 30 - Bottom: ASME Section VIII Div. 2 Stress Check & Allowables

#### Combined Stress Intensities Across Locations (kPa):
| Stress Combination | Au | Al | Bu | Bl | Cu | Cl | Du | Dl | Max S.I. |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pm (SUS)** | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | **95596** |
| **Pm (SUS+OCC)** | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | 95596 | **95596** |
| **Pm+Pl (SUS)** | 95594 | 95594 | 95734 | 95734 | 95552 | 95552 | **95742** | 95742 | **95742** |
| **Pm+Pl (SUS+OCC)** | 91950 | 91950 | **98403** | 98403 | 96119 | 96119 | 94459 | 94459 | **98403** |
| **Pm+Pl+Q (Total)** | 67262 | 103260 | 119259 | 89640 | 63086 | **122620** | 121642 | 72972 | **122620** |

#### ASME Allowable Limits & Compliance Table:
| Type of Stress Int. | Max. S.I. (kPa) | S.I. Allowable Formulation | S.I. Allowable Value (kPa) | Result |
| :--- | :---: | :--- | :---: | :---: |
| **Pm (SUS)** | 95596 | $S_{mh}$ | 128465 | **Passed** |
| **Pm (SUS+OCC)** | 95596 | $1.2 \cdot S_{mh}$ | 154158 | **Passed** |
| **Pm+Pl (SUS)** | 95742 | $1.5 \cdot S_{mh}$ | 192697 | **Passed** |
| **Pm+Pl (SUS+OCC)** | 98403 | $1.5 	imes 1.2 \cdot S_{mh} = 1.8 \cdot S_{mh}$ | 231237 | **Passed** |
| **Pm+Pl+Q (TOTAL)** | 122620 | $1.5 \cdot (S_{mh} + S_{mc}) = 3 \cdot S_{mavg}$ | 399535 | **Passed** |

---

## Page 31 (Slide 31)

### Slide 31 - Top: Geometric Layout, Applied Loads & Stress Points

#### Geometry Summary:
* **Vessel:** Cylindrical Shell, $R = 900.000	ext{ mm}$, $T_v = 22.0	ext{ mm}$, Corroded $T = 19.0	ext{ mm}$
* **Nozzle:** Cylindrical Branch, $D_n = 324.0	ext{ mm}$ ($r_0 = 162.0	ext{ mm}$), $T_n = 14.0	ext{ mm}$
* **Operating Conditions:** Internal Pressure $= 1.970	ext{ N/mm}^2$, Corrosion Allowances $= 3.0	ext{ mm}$

#### Applied Sustained External Loads at Nozzle Junction:
* **Radial Load ($P$):** $161.00	ext{ N}$ (acting upward / outward)
* **Circumferential Shear Force ($V_C$):** $53.00	ext{ N}$
* **Longitudinal Shear Force ($V_L$):** $2109.00	ext{ N}$
* **Circumferential Overturning Moment ($M_C$):** $121.00	ext{ N}\cdot	ext{m}$
* **Longitudinal Overturning Moment ($M_L$):** $33.00	ext{ N}\cdot	ext{m}$
* **Torsional Moment ($M_T$):** $775.00	ext{ N}\cdot	ext{m}$

#### Stress Locations on Vessel Surface:
* **Points A & B:** Located along the **Longitudinal Axis** ($x$-axis, $	heta = 0^\circ$ and $180^\circ$)
  * Point A: Outside surface ($A_u$), Inside surface ($A_l$)
  * Point B: Outside surface ($B_u$), Inside surface ($B_l$)
* **Points C & D:** Located along the **Transverse / Circumferential Axis** ($\phi$-axis, $	heta = 90^\circ$ and $270^\circ$)
  * Point C: Outside surface ($C_u$), Inside surface ($C_l$)
  * Point D: Outside surface ($D_u$), Inside surface ($D_l$)

---

### Slide 31 - Bottom: Transition to WRC 297
* **Title:** **WRC 297**  
*(Introduction to Local Stress and Flexibility Analysis in Cylindrical Vessels under Nozzle Loads per WRC Bulletin 297)*
