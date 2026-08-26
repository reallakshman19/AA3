# WRC Bulletin 537 (2013 Edition) — Complete Tables, Equations & Nondimensional Charts
**Title:** Precision Equations and Enhanced Diagrams for Local Stresses in Spherical and Cylindrical Shells Due to External Loading
**Publication Date:** 2013 | **Issuing Body:** Welding Research Council (WRC)
**Scope & Equivalence:** WRC Bulletin 537 provides precise mathematical equations and digitized curves equivalent to WRC Bulletin 107 (March 1979 Revision).

---

## Table of Contents
1. [Overview & Governing Formulations](#overview--governing-formulations)
2. [Section 7: Standard Design & Computation Tables](#section-7-standard-design--computation-tables)
   - [Table 1: Sign Convention for Spherical Shells](#table-1--sign-convention-for-stresses-resulting-from-radial-and-moment-load-on-a-spherical-shell)
   - [Table 2: Computation Sheet for Spherical Shells (Solid Attachment)](#table-2--computation-sheet-for-local-stresses-in-spherical-shells-solid-attachment)
   - [Table 3: Computation Sheet for Spherical Shells (Hollow Attachment)](#table-3--computation-sheet-for-local-stresses-in-spherical-shells-hollow-attachment)
   - [Table 4: Sign Convention for Cylindrical Shells](#table-4--sign-convention-for-stresses-resulting-from-radial-and-moment-load-on-a-cylindrical-shell)
   - [Table 5: Computation Sheet for Cylindrical Shells](#table-5--computation-sheet-for-local-stresses-in-cylindrical-shells)
   - [Table 6: Radial Load P (Rectangular Attachment Factors)](#table-6--radial-load-p)
   - [Table 7: Circumferential Moment MC (Correction Factors)](#table-7--circumferential-moment-mc)
   - [Table 8: Longitudinal Moment ML (Correction Factors)](#table-8--longitudinal-moment-ml)
3. [Section 8: Nondimensional Charts & Curve Fit Coefficients](#section-8-nondimensional-charts--curve-fit-coefficients)
   - [8.1 Spherical Shells — Solid Attachments (Rigid Plug: SR-1, SR-2, SR-3)](#81-spherical-shells--solid-attachments-rigid-plug)
   - [8.2 Spherical Shells — Hollow Attachments: Radial Load P (SP-1 to SP-10)](#82-spherical-shells--hollow-attachments-radial-load-p)
   - [8.3 Spherical Shells — Hollow Attachments: Overturning Moment M (SM-1 to SM-10)](#83-spherical-shells--hollow-attachments-overturning-moment-m)
   - [8.4 Cylindrical Shells — Circumferential Moment MC (1A, 2A, 3A, 4A)](#84-cylindrical-shells--circumferential-moment-mc)
   - [8.5 Cylindrical Shells — Longitudinal Moment ML (1B, 1B-1, 2B, 2B-1, 3B, 4B)](#85-cylindrical-shells--longitudinal-moment-ml)
   - [8.6 Cylindrical Shells — Radial Load P (1C, 1C-1, 2C, 2C-1, 3C, 4C)](#86-cylindrical-shells--radial-load-p)
4. [Section 9 (Appendix A): Basis for Corrections & Test Benchmark Tables](#section-9-appendix-a--basis-for-corrections--test-benchmark-data)
   - [Table A-1: Model Vessel Parameters](#table-a-1--parameters-for-model-vessels-tested-with-external-loads-on-nozzles)
   - [Table A-2: Spherical Model Test Stresses](#table-a-2--comparison-of-calculated-and-measured-stresses-in-spherical-models)
   - [Table A-3: Thick-Walled Cylindrical Model Stresses](#table-a-3--comparison-of-calculated-and-measured-stresses-in-thick-walled-cylindrical-vessels)
   - [Table A-4: Thin-Walled Cylindrical Model Stresses (IITRI C-1)](#table-a-4--comparison-of-calculated-and-measured-stresses-in-thin-walled-cylindrical-vessels)
   - [Table A-5: Opposite Side Measured Stresses (IITRI C-1)](#table-a-5--comparison-of-measured-stresses-on-opposite-sides-of-iitri-c-1)
   - [Table A-6: Cornell Attachment No. 2 Stresses](#table-a-6--summary-of-calculated-and-measured-stresses-for-cornell-attachment-no-2)
   - [Appendix A Figures & Benchmark Charts (Figures A-1 to A-18)](#appendix-a-figures--benchmark-charts)
5. [Section 10 (Appendix B): Stress Concentration Factors & Juncture Charts](#section-10-appendix-b--stress-concentration-factors-for-stresses-due-to-external-loads)
   - [Appendix B Governing Equations (B.1 to B.61)](#appendix-b-governing-equations)
   - [Appendix B Figures (Figures B-1 to B-6)](#appendix-b-figures)

---

## Overview & Governing Formulations
WRC Bulletin 537 provides direct mathematical equations for all nondimensional curves originally published in WRC Bulletin 107.

### Curve Fit Model Equation Structure:
For all curves evaluated against parameter $X$ (where $X = U$ for Spherical Shells and $X = \beta$ for Cylindrical Shells):
$$Y = \left( \frac{a + c X + e X^2 + g X^3 + i X^4}{1 + b X + d X^2 + f X^3 + h X^4 + j X^5} \right)$$
Where:
* $a, b, c, d, e, f, g, h, i, j$ are fitted numerical coefficients tabulated in Section 8.
* For Spherical Shells: $U = \frac{r_0}{\sqrt{R_m T}}$ and $\rho = \frac{T}{t}$.
* For Cylindrical Shells: $\gamma = \frac{R_m}{T}$ and $\beta = 0.875 \cdot \frac{r_0}{R_m}$.

---

## Section 7: Standard Design & Computation Tables
### Table 1 – Sign Convention for Stresses Resulting from Radial and Moment Load on a Spherical Shell
**Pages 33–34**

| STRESS | LOCATION | LOADING |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  |  | P | M 1 |  |  | M 2 |  |  |
| Membrane N N x & y T T | A A u L B B u L | - |  |  |  | - |  |  |
|  |  | - |  |  |  | + |  |  |
|  | C C u L D D u L | - | - |  |  |  |  |  |
|  |  | - | + |  |  |  |  |  |
| Bending 6M x T2 | A u | - |  |  |  | - |  |  |
|  | A L | + |  |  |  | + |  |  |
|  | B u | - |  |  |  | + |  |  |
|  | B L | + |  |  |  | - |  |  |
|  | C u | - | - |  |  |  |  |  |
|  | C L | + | + |  |  |  |  |  |
|  | D u | - | + |  |  |  |  |  |
|  | D L | + | - |  |  |  |  |  |
| Bending 6M y T 2 | A u | - |  |  |  | - |  |  |
|  | A L | + |  |  |  | + |  |  |
|  | B u | - |  |  |  | + |  |  |
|  | B L | + |  |  |  | - |  |  |
|  | C u | - | - |  |  |  |  |  |
|  | C L | + | + |  |  |  |  |  |
|  | D u | - | + |  |  |  |  |  |
|  | D L | + | - |  |  |  |  |  |
| Notes: (+) (-) 1. Sign convention for stresses: tension, compression. 2. If load P reverses, all signs in column P reverse 3. If overturning moment M reverses, all signs in column M reverse. 1 1 4. For round attachment, overturning moments M and M may be combined vectorially, thus; M= M2+M2 1 2 1 2 |  |  |  |  |  |  |  |  |


**Table 1 Notes:**
1. Sign convention for stresses: $(+)$ tension, $(-)$ compression.
2. If load or moment directions reverse, all signs in applicable column reverse.
3. Locations $A, B, C, D$ correspond to 4 orthogonal points on shell circumference at nozzle junction.


### Table 2 – Computation Sheet for Local Stresses in Spherical Shells (Solid Attachment)
**Pages 35–36**

| 1. Applied Loads |  |  |
| :--- | :--- | :--- |
| Radial Load | P = |  |
| Shear Load | V = 1 |  |
| Shear Load | V = 2 |  |
| Overturning Moment | M = 1 |  |
| Overturning Moment | M = 2 |  |
| Torsional Moment | M = T |  |
| 2. Geometry |  |  |
| Vessel Thickness | T = |  |
| Vessel Mean Radius | R = m |  |
| Attachment Outside Radius | r = o |  |
| 3. Geometric Parameters |  |  |
| r U = o = R T m |  |  |
| R T = m |  |  |
| T R T = m |  |  |
| 4. Stress Concentration Factors due to |  |  |
| Membrane Load | K = n |  |
| Bending Load | K = b |  |
| Notes: 1. Enter all force values in accordance with sign convention. 2. Use consistent set of units in all calculations. |  |  |


| Reference Figure No. | Read Curves for | Calculate absolute values of stress and enter result |  |  |  | STRESSES - If load is opposite that shown, reverse signs shown |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  |  |  |  |  |  | A u | A L | B u | B L | C u | C L | D u | D L |
| SR-2 | N T x = P | N T  P  K n  Px       T2   =   |  |  |  | - | - | - | - | - | - | - | - |
|  | M x = P | M  6P  K b  Px      T2   =   |  |  |  | - | + | - | + | - | + | - | + |
| SR-3 | N T R T x m = M 1 | N T R T  M   K   x m    1  = n    M 1       T2 R m T    |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T x m = M 1 | M R T  6M   K   x m    1  = b    M 1       T2 R m T    |  |  |  |  |  |  |  | - | + | + | - |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | N T R T x m = M 2 | N T R T  M   K   x m    2  = n    M 2       T2 R m T    |  |  |  | - | - | + | + |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T x m = M 2 | M R T  6M   K   x m    2  = b    M 2       T2 R m T    |  |  |  | - | + | + | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of radial stresses σ x |  |  |  | σ = x |  |  |  |  |  |  |  |  |  |
| SR-2 | N T y = P | N T  P  K n  Py       T2   =   |  |  |  | - | - | - | - | - | - | - | - |
|  | M y = P | M  6P  K b  Py      T2   =   |  |  |  | - | + | - | + | - | + | - | + |
| SR-3 | N T R T y m = M 1 | N T R T  M   K   y m    1  = n    M 1       T2 R m T    |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T y m = M 1 | M R T  6M   K   y m    1  = b    M 1       T2 R m T    |  |  |  |  |  |  |  | - | + | + | - |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | N T R T y m = M 2 | N T R T  M   K   y m    2  = n    M 2       T2 R m T    |  |  |  | - | - | + | + |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T y m = M 2 | M R T  6M   K   y m    2  = b    M 2       T2 R m T    |  |  |  | - | + | + | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of tangential stresses σ y |  |  |  |  | σ = y |  |  |  |  |  |  |  |  |
| Shear stress due to load V 1 |  |  | V τ = 1 = 1  rT o |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Shear stress due to load V 2 |  |  | V τ = 2 = 2  rT o |  |  | + | + | - | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Shear stress due to Torsion, M T |  |  | M τ =τ = T = 1 2 2 r 2T o |  |  | + | + | + | + | + | + | + | + |
| Add algebraically for summation of shear stresses τ |  |  | τ= |  |  |  |  |  |  |  |  |  |  |
| COMBINED STRESS INTENSITY - S 1) When τ 0, S=largest absolute magnitude of eitherS=1  σ +σ ± (σ -σ )2+4τ2  or (σ -σ )2+4τ2 2    x y x y     x y 2) When τ=0, S= largest absolute magnitude of eitherS=σ ,σ ,(σ -σ ) x y x y |  |  |  |  |  |  |  |  |  |  |  |  |  |


**Combined Stress Intensity Formulations for Table 2:**
1. When $\sigma_x$ and $\sigma_y$ have like signs:
   $$S = \frac{1}{2} \left[ \sigma_x + \sigma_y \pm \sqrt{(\sigma_x - \sigma_y)^2 + 4\tau^2} \right] \quad\text{or}\quad \sqrt{(\sigma_x - \sigma_y)^2 + 4\tau^2}$$
2. When $\tau = 0$:
   $$S = \max \left( |\sigma_x|, |\sigma_y|, |\sigma_x - \sigma_y| \right)$$
3. When $\sigma_x$ and $\sigma_y$ have unlike signs:
   $$S = \sqrt{(\sigma_x - \sigma_y)^2 + 4\tau^2}$$


### Table 3 – Computation Sheet for Local Stresses in Spherical Shells (Hollow Attachment)
**Pages 37–38**

| 1. Applied Loads |  |  |
| :--- | :--- | :--- |
| Radial Load | P = |  |
| Shear Load | V = 1 |  |
| Shear Load | V = 2 |  |
| Overturning Moment | M = 1 |  |
| Overturning Moment | M = 2 |  |
| Torsional Moment | M = T |  |
| 2. Geometry |  |  |
| Vessel Thickness | T = |  |
| Vessel Mean Radius | R = m |  |
| Nozzle Thickness | t = |  |
| Nozzle Mean Radius | r = m |  |
| Nozzle Outside Radius | r = o |  |
| 3. Geometric Parameters |  |  |
| r  = m = t |  |  |
| T ρ= = t |  |  |
| r U = o = R T m |  |  |
| 4. Stress Concentration Factors due to |  |  |
| Membrane Load | K = n |  |
| Bending Load | K = b |  |
| Notes: 1. Enter all force values in accordance with sign convention. 2. Use consistent set of units in all calculations. |  |  |


| Reference Figure No. | Read Curves for | Calculate absolute values of stress and enter result |  |  |  | STRESSES - If load is opposite that shown, reverse signs shown |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  |  |  |  |  |  | A u | A L | B u | B L | C u | C L | D u | D L |
| SP-1 to 10 | N T x = P | N T  P  K n  Px       T2   =   |  |  |  | - | - | - | - | - | - | - | - |
|  | M x = P | M  6P  K b  Px      T2   =   |  |  |  | - | + | - | + | - | + | - | + |
| SM-1 to 10 | N T R T x m = M 1 | N T R T  M   K   x m    1  = n    M 1       T2 R m T    |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T x m = M 1 | M R T  6M   K   x m    1  = b    M 1       T2 R m T    |  |  |  |  |  |  |  | - | + | + | - |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | N T R T x m = M 2 | N T R T  M   K   x m    2  = n    M 2       T2 R m T    |  |  |  | - | - | + | + |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T x m = M 2 | M R T  6M   K   x m    2  = b    M 2       T2 R m T    |  |  |  | - | + | + | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of radial stresses σ x |  |  |  | σ = x |  |  |  |  |  |  |  |  |  |
| SP-1 to 10 | N T y = P | N T  P  K n  Py       T2   =   |  |  |  | - | - | - | - | - | - | - | - |
|  | M y = P | M  6P  K b  Py      T2   =   |  |  |  | - | + | - | + | - | + | - | + |
| SM-1 to 10 | N T R T y m = M 1 | N T R T   M   K   y m    1  = n  M   T2 R T     1    m   |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T y m = M 1 | M R T  6M   K   y m    1  = b    M 1       T2 R m T    |  |  |  |  |  |  |  | - | + | + | - |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | N T R T y m = M 2 | N T R T  M   K   y m    2  = n    M 2       T2 R m T    |  |  |  | - | - | + | + |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | M R T y m = M 2 | M R T  6M   K   y m    2  = b    M 2       T2 R m T    |  |  |  | - | + |  | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of tangential stresses σ y |  |  |  |  | σ = y |  |  |  |  |  |  |  |  |
| Shear stress due to load V 1 |  |  | V τ = 1 = 1  rT o |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Shear stress due to load V 2 |  |  | V τ = 2 = 2  rT o |  |  | + | + | - | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Shear stress due to Torsion, M T |  |  | M τ =τ = T = 2 1 2 r 2T o |  |  | + | + | + | + | + | + | + | + |
| Add algebraically for summation of shear stresses τ |  |  |  | τ= |  |  |  |  |  |  |  |  |  |
| COMBINED STRESS INTENSITY - S 1) When τ 0, S=largest absolute magnitude of eitherS=1  σ +σ ± (σ -σ )2+4τ2  or (σ -σ )2+4τ2 2    x y x y     x y 2) When τ=0, S= largest absolute magnitude of eitherS=σ ,σ ,(σ -σ ) x y x y |  |  |  |  |  |  |  |  |  |  |  |  |  |


### Table 4 – Sign Convention for Stresses Resulting from Radial and Moment Load on a Cylindrical Shell
**Pages 39–40**

| STRESS | LOCATION | LOADING |  |  |
| :--- | :--- | :--- | :--- | :--- |
|  |  | P | M c | M L |
| Membrane N N   & x T T | A A u L B B u L | - |  | - |
|  |  | - |  | + |
|  | C C u L D D u L | - | - |  |
|  |  | - | + |  |
| Bending 6M x T2 | A u | - |  | - |
|  | A L | + |  | + |
|  | B u | - |  | + |
|  | B L | + |  | - |
|  | C u | - | - |  |
|  | C L | + | + |  |
|  | D u | - | + |  |
|  | D L | + | - |  |
| Bending 6M   T 2 | A u | - |  | - |
|  | A L | + |  | + |
|  | B u | - |  | + |
|  | B L | + |  | - |
|  | C u | - | - |  |
|  | C L | + | + |  |
|  | D u | - | + |  |
|  | D L | + | - |  |
| Notes: (+) (-) 1. Sign convention for stresses: tension, compression. 2. If load or moment directions reverse, all signs in applicable column reverse. |  |  |  |  |


**Table 4 Notes:**
1. Sign convention: $(+)$ tension, $(-)$ compression.
2. If load or moment directions reverse, all signs in applicable column reverse.
3. $u$ denotes upper (outer) surface, $L$ denotes lower (inner) surface.
4. Points $A, B$ lie along the longitudinal axis ($x$-axis, $\theta=0^\circ, 180^\circ$). Points $C, D$ lie along circumferential/transverse axis ($\phi$-axis, $\theta=90^\circ, 270^\circ$).


### Table 5 – Computation Sheet for Local Stresses in Cylindrical Shells
**Pages 41–42**

| 1. Applied Loads |  |  |
| :--- | :--- | :--- |
| Radial Load | P = |  |
| Circumferential Moment | M = c |  |
| Longitudinal Moment | M = L |  |
| Torsional Moment | M = T |  |
| Shear Load | V = c |  |
| Shear Load | V = L |  |
| 2. Geometry |  |  |
| Vessel Thickness | T = |  |
| Attachment Radius | r = o |  |
| Vessel Radius | R = m |  |
| 3. Geometric Parameters |  |  |
| R γ= m = T |  |  |
| r β=(0.875) o = R m |  |  |
| 4. Stress Concentration Factors due to |  |  |
| Membrane Load | K = n |  |
| Bending Load | K = b |  |
| Notes: 1. Enter all force values in accordance with sign convention. 2. Use consistent set of units in all calculations. |  |  |


| Reference Figure No. | Read Curves for |  | Calculate absolute values of stress and enter result |  |  |  | STRESSES - If load is opposite that shown, reverse signs shown |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  |  |  |  |  |  |  | A u | A L | B u | B L | C u | C L | D u | D L |
| 3C | N   = P /R m |  |  N   P   K         = n  P /R m  R T  m |  |  |  | - | - | - | - | - | - | - | - |
| 1C OR 2C-1 | M  = P |  | M  6P  K b  P       T2   =   |  |  |  | - | + | - | + | - | + | - | + |
| 3A | N   = M /R2β c m |  |  N   M   K        c  = n  M c/R m2β  R m2βT  |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 1A | M   = M /R β c m |  |  M   6M   K        c  = b  M c/R mβ  R mβT2  |  |  |  |  |  |  |  | - | + | + | - |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 3B | N   = M /R2β L m |  |  N   M   K        L  = n  M L/R m2β  R m2βT  |  |  |  | - | - | + | + |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 1B or 1B-1 | M   = M /R β L m |  |  M   6M   K        L  = b  M L/R mβ  R mβT2  |  |  |  | - | + | + | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of   stresses σ   |  |  |  |  | σ =   |  |  |  |  |  |  |  |  |  |
| 4C |  | N x = P /R m |  N   P   K   x     = n  P /R m  R T  m |  |  |  | - | - | - | - | - | - | - | - |
| 1C-1 OR 2C |  | M x = P | M  6P  K b  Px      T2   =   |  |  |  | - | + | - | + | - | + | - | + |
| 4A |  | N x = M /R 2β c m |  N   M   K   x    c  = n  M c/R m2β  R m2βT  |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 2A |  | M x = M /R β c m |  M   6M   K   x    c  = b  M c/R mβ  R mβT2  |  |  |  |  |  |  |  | - | + | + | - |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 4B |  | N x = M R 2β L m |  N   M   K   x    L  = n  M L/R m2β  R m2βT  |  |  |  | - | - | + | + |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 2B or 2B-1 |  | M x = M R β L m |  M   6M   K   x    L  = b  M L/R mβ  R mβT2  |  |  |  | - | + | + | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of x stresses σ x |  |  |  |  |  | σ = x |  |  |  |  |  |  |  |  |
| Shear stress due to Torsion, M T |  |  |  | M τ =τ = T =  x x  2 r 2T o |  |  | + | + | + | + | + | + | + | + |
| Shear stress due to load V C |  |  |  | V τ = C = x   r T o |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  | + | + | - | - |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Shear stress due to load V L |  |  |  | V τ = L = x   r T o |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  | - | - | + | + |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add algebraically for summation of shear stresses τ |  |  |  |  |  | τ= |  |  |  |  |  |  |  |  |
| S COMBINED STRESS INTENSITY - 1) When σ andσ have like signsS=1  σ +σ ± (σ -σ )2+4τ2  or (σ -σ )2+4τ2   x 2      x   x       x 2) When τ=0, S= largest absolute magnitude of eitherS=σ ,σ ,or σ -σ   x   x 3) When σ andσ have unlike signs, S= (σ -σ )2+4τ2   x   x |  |  |  |  |  |  |  |  |  |  |  |  |  |  |


**Combined Stress Intensity Formulations for Table 5:**
1. When $\sigma_\phi$ and $\sigma_x$ have like signs:
   $$S = \frac{1}{2} \left[ \sigma_\phi + \sigma_x \pm \sqrt{(\sigma_\phi - \sigma_x)^2 + 4\tau^2} \right] \quad\text{or}\quad \sqrt{(\sigma_\phi - \sigma_x)^2 + 4\tau^2}$$
2. When $\tau = 0$:
   $$S = \max \left( |\sigma_\phi|, |\sigma_x|, |\sigma_\phi - \sigma_x| \right)$$
3. When $\sigma_\phi$ and $\sigma_x$ have unlike signs:
   $$S = \sqrt{(\sigma_\phi - \sigma_x)^2 + 4\tau^2}$$


### Table 6 – Radial Load P
**Page 43** (Correction factors $K_1, K_2$ for rectangular attachments)

| Parameter | N   | N x | M   | M x |
| :--- | :--- | :--- | :--- | :--- |
| K 1 | 0.91 | 1.68 | 1.76 | 1.2 |
| K 2 | 1.48 | 1.2 | 0.88 | 1.25 |
| β Note: Above holds approximately within limits4≥ 1 ≥0.25 β 2 |  |  |  |  |

| β / β 1 2 | γ | K for θ c | K fo r M c   | K for M c x | C for N c   | C for N c x |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 0.25 | 15 | 1.09 | 1.31 | 1.84 | 0.31 | 0.49 |
|  | 50 | 1.04 | 1.24 | 1.62 | 0.21 | 0.46 |
|  | 100 | 0.97 | 1.16 | 1.45 | 0.15 | 0.44 |
|  | 300 | 0.92 | 1.02 | 1.17 | 0.09 | 0.46 |
| 0.5 | 15 | 1.00 | 1.09 | 1.36 | 0.64 | 0.75 |
|  | 50 | 0.98 | 1.08 | 1.31 | 0.57 | 0.75 |
|  | 100 | 0.94 | 1.04 | 1.26 | 0.51 | 0.76 |
|  | 300 | 0.95 | 0.99 | 1.13 | 0.39 | 0.77 |
| 2 | 15 | (1.00) | (1.20) | (0.97) | (1.7) | (1.3) |
|  | 100 | 1.19 | 1.10 | 0.95 | 1.43 | 1.12 |
|  | 300 | --- | (1.00) | (0.90) | (1.3) | (1.00) |
| 4 | 15 | (1.00) | (1.47) | (1.08) | (1.75) | (1.31) |
|  | 100 | 1.49 | 1.38 | 1.06 | 1.49 | 0.81 |
|  | 300 | --- | (1.27) | (0.98) | (1.36) | (0.74) |
| Note: The values in parenthesis determined by an approximate solution. |  |  |  |  |  |  |

*Note: Holds approximately within limits $4 \ge \beta_1/\beta_2 \ge 0.25$.*


### Table 7 – Circumferential Moment MC
**Page 43** (Correction factors $K_C$ and $C_C$ for $\beta_1/\beta_2$ and $\gamma$)

| β / β 1 2 | γ | K for θ c | K fo r M c   | K for M c x | C for N c   | C for N c x |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 0.25 | 15 | 1.09 | 1.31 | 1.84 | 0.31 | 0.49 |
|  | 50 | 1.04 | 1.24 | 1.62 | 0.21 | 0.46 |
|  | 100 | 0.97 | 1.16 | 1.45 | 0.15 | 0.44 |
|  | 300 | 0.92 | 1.02 | 1.17 | 0.09 | 0.46 |
| 0.5 | 15 | 1.00 | 1.09 | 1.36 | 0.64 | 0.75 |
|  | 50 | 0.98 | 1.08 | 1.31 | 0.57 | 0.75 |
|  | 100 | 0.94 | 1.04 | 1.26 | 0.51 | 0.76 |
|  | 300 | 0.95 | 0.99 | 1.13 | 0.39 | 0.77 |
| 2 | 15 | (1.00) | (1.20) | (0.97) | (1.7) | (1.3) |
|  | 100 | 1.19 | 1.10 | 0.95 | 1.43 | 1.12 |
|  | 300 | --- | (1.00) | (0.90) | (1.3) | (1.00) |
| 4 | 15 | (1.00) | (1.47) | (1.08) | (1.75) | (1.31) |
|  | 100 | 1.49 | 1.38 | 1.06 | 1.49 | 0.81 |
|  | 300 | --- | (1.27) | (0.98) | (1.36) | (0.74) |
| Note: The values in parenthesis determined by an approximate solution. |  |  |  |  |  |  |


### Table 8 – Longitudinal Moment ML
**Page 44** (Correction factors $K_L$ and $C_L$ for $\beta_2/\beta_1$ and $\gamma$)

| β / β 2 1 | γ | K for θ L | K for M L   | K for M L x | C for N L   | C for N L x |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 0.25 | 15 | 1.14 | 1.80 | 1.24 | 0.75 | 0.43 |
|  | 50 | 1.13 | 1.65 | 1.16 | 0.77 | 0.33 |
|  | 100 | 1.18 | 1.59 | 1.11 | 0.80 | 0.24 |
|  | 300 | 1.31 | 1.56 | 1.11 | 0.90 | 0.07 |
| 0.5 | 15 | (1.00) | (1.08) | (1.04) | (0.90) | (0.76) |
|  | 100 | 1.00 | 1.07 | 1.02 | 0.97 | 0.68 |
|  | 300 | (1.00) | (1.05) | (1.02) | (1.10) | (0.60) |
| 2 | 15 | --- | (0.94) | (1.12) | (0.87) | (1.30) |
|  | 100 | 1.09 | 0.89 | 1.07 | 0.81 | 1.15 |
|  | 300 | --- | (0.79) | (0.90) | (0.80) | (1.50) |
| 4 | 15 | 1.39 | 0.90 | 1.24 | 0.68 | 1.20 |
|  | 100 | 1.18 | 0.81 | 1.12 | 0.51 | 1.03 |
|  | 300 | --- | (0.64) | (0.83) | (0.50) | (1.33) |
| Note: The values in parenthesis determined by an approximate solution. |  |  |  |  |  |  |


---

## Section 8: Nondimensional Charts & Curve Fit Coefficients

### Curve Fit Coefficients for Figure SR-1
**PDF Page 47**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |
| :--- | :--- | :--- |
| Coefficients | External Moment, M | Radial Load, P |
| a | 1.9339841E+02 | 1.8702697E+04 |
| b | 1.8058062E+02 | 6.4692217E+05 |
| c | -1.5589849E+03 | 1.8800810E+06 |
| d | -1.3281622E+03 | 3.2052038E+06 |
| e | 5.7373932E+03 | -1.7815801E+04 |
| f | 4.3100822E+03 | 3.1294515E+06 |
| g | -3.8508953E+03 | 0 |
| h | -5.5651177E+02 | 0 |
| i | 8.0356420E+02 | 0 |
| j | 0 | 0 |



### Curve Fit Coefficients for Figure SR-2
**PDF Page 49**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M y | M y(max) | N x | N y | N y(max) |
| a | 7.2755465E-01 | 1.6626172E+00 | 2.8970908E-01 | 3.6464737E-01 | 1.0717924E-01 | 2.1307311E-01 |
| b | 1.8452167E+01 | 4.1462532E+02 | 5.7152678E-01 | 1.5895456E+01 | 1.8705138E+00 | 4.5481706E+00 |
| c | 3.1385666E+00 | 8.6012473E+00 | -3.8339359E+00 | 4.1524511E+00 | -4.8517975E-02 | 1.6485906E-01 |
| d | 4.7937955E+01 | 6.1498307E+02 | -1.1779867E+02 | 2.0645606E+01 | 7.1602527E-01 | 8.1335471E+00 |
| e | -6.6809619E-02 | 6.0279054E+02 | 1.7938924E+01 | 4.0476610E-01 | 5.6475822E-03 | -1.0185257E-02 |
| f | 4.1479087E+01 | 5.1084343E+04 | 7.1295486E+02 | 3.6192634E+01 | -4.1419366E-01 | 2.5311489E+00 |
| g | 0 | 4.5279507E+02 | -3.2608531E+01 | 0 | 0 | 0 |
| h | 0 | -3.9361860E+02 | -1.3864369E+03 | 0 | 0 | 0 |
| i | 0 | 1.7450716E+02 | 2.3270515E+01 | 0 | 0 | 0 |
| j | 0 | 6.3698839E+04 | 1.1111852E+03 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SR-3
**PDF Page 51**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |  |
|  | M x | M y | N x | N x(max) | N y | N y(max) |
| a | 1.6777501E+01 | 4.6763079E+00 | 4.4119453E-02 | 8.4890601E-02 | 1.4538620E-02 | 2.4997089E-01 |
| b | 7.8897498E+01 | 6.4665777E+01 | 1.5401538E+00 | -2.3631622E+01 | 2.0890255E+00 | -8.3301538E-01 |
| c | -2.2811287E+02 | -5.9518198E+01 | 1.1405712E+00 | -1.5592605E+00 | 3.5076166E-01 | -3.5239041E-01 |
| d | -1.2372475E+03 | -8.8579098E+02 | 5.1684372E+00 | 1.4091364E+02 | 4.1917270E+00 | -3.8173912E+00 |
| e | 1.7511638E+03 | 2.3742780E+02 | -7.4048694E-01 | 1.0521045E+00 | -1.5363008E-01 | -7.7432502E-01 |
| f | 1.0060565E+04 | 3.2406877E+03 | -1.4652288E-01 | 9.7246719E+01 | 2.7745592E+00 | 1.1932576E+01 |
| g | -6.4992108E+02 | -1.6170525E+02 | 1.4215374E-01 | 7.8988888E+01 | 2.2630118E-02 | 1.5606351E+00 |
| h | -2.1050273E+03 | 6.0522906E+01 | 0 | 0 | 0 | -2.1653474E+01 |
| i | 1.7336078E+02 | 3.4722574E+01 | 0 | 0 | 0 | -3.1315276E-01 |
| j | 7.9131118E+03 | 0 | 0 | 0 | 0 | 2.0907891E+01 |



### Curve Fit Coefficients for Figure SP-1
**PDF Page 53**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M y | M y(max) | N x | N x(max) | N y |
| a | 3.7231311E+00 | 1.9182958E+00 | -5.3669486E+01 | 2.1322836E-01 | 2.1858968E-01 | 2.4586502E-01 |
| b | 1.8671976E+02 | 7.1931150E+02 | -1.2516166E+04 | 4.2050448E+00 | -2.5343227E+00 | 2.0008949E+02 |
| c | 2.6436830E+01 | 7.4335393E+01 | 2.2431247E+02 | 1.0916995E-01 | -1.0771993E+00 | 4.8408477E+01 |
| d | 1.4194954E+03 | 2.6452748E+03 | 2.2926371E+05 | 5.4913965E+00 | -3.6522378E+00 | 2.5345658E+02 |
| e | 6.4800756E+02 | -4.5736180E+01 | 1.5781341E+04 | 1.4080117E+00 | 1.5900589E+00 | -2.5034168E+01 |
| f | 9.7346418E+03 | 9.1388566E+02 | 1.0511173E+05 | 2.4926977E+01 | 1.1261041E+01 | 1.5866437E+01 |
| g | -1.6034796E+02 | -5.3218355E+00 | 4.7741439E+03 | -2.4401880E-01 | -4.6485921E-01 | 5.4387020E+00 |
| h | 0 | -2.5983370E+03 | 2.2746897E+06 | 0 | 0 | 0 |
| i | 0 | 5.7654597E+00 | 2.2544280E+04 | 0 | 0 | 0 |
| j | 0 | 7.9658446E+02 | 8.0828856E+04 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SP-2
**PDF Page 55**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M y | M y(max) | N x | N x(max) | N y |
| a | 6.2106583E-01 | 3.6266539E-01 | -3.1810115E+02 | 4.2439923E+00 | 2.5272151E-01 | 1.4696948E-01 |
| b | 2.1627265E+01 | 4.4962773E+01 | -1.2824607E+05 | 2.9097533E+03 | 4.4206642E+00 | -1.6443301E+00 |
| c | 2.9618619E+00 | 3.7254224E+00 | -1.7399420E+04 | 6.7064837E+02 | 1.4138993E-01 | 1.2384743E-01 |
| d | 2.9230883E+01 | 9.8034596E+01 | 1.7045745E+06 | 7.8830399E+03 | 3.3747209E+00 | 2.9842988E+01 |
| e | 2.1842087E+00 | -2.7044035E-01 | 4.9959536E+05 | -1.0252729E+03 | 8.3253656E-01 | 5.3815760E+00 |
| f | 8.6140607E+01 | 1.3759214E+02 | 1.7739591E+07 | -1.5335935E+04 | 1.6937757E+01 | 6.1433221E+00 |
| g | -3.8731112E-01 | 0 | -2.0079910E+05 | 4.8289898E+02 | 0 | -3.3272374E+00 |
| h | 0 | 0 | 2.2634886E+06 | 6.9349360E+03 | 0 | 1.2596850E+00 |
| i | 0 | 0 | 0 | -3.4862622E+01 | 0 | 5.3508405E-01 |
| j | 0 | 0 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SP-3
**PDF Page 57**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |
|  | M x | M y | N x | N x(max) | N y |
| a | 3.6561314E-01 | 6.9239341E-01 | 1.9468982E+02 | 3.4042688E-01 | 1.1688293E-01 |
| b | 2.0761038E+01 | 4.1459886E+01 | 3.5425743E+04 | 5.9056469E+01 | 4.8475808E-02 |
| c | 2.1174399E+00 | 6.5648389E+00 | 6.7126521E+03 | 1.5213241E+01 | 1.0834266E+00 |
| d | 3.9890351E+01 | 5.6965733E+01 | 6.7541613E+04 | 1.1073094E+02 | 6.5637891E+00 |
| e | -1.5403305E+00 | -1.0362019E+01 | -7.0766023E+03 | -3.1746355E+01 | -1.4491092E+00 |
| f | 6.0841929E+00 | 5.0303340E+01 | -3.8750208E+04 | -3.6344661E+02 | -8.5621782E+00 |
| g | 3.0035995E-01 | 5.2068393E+00 | 7.1274907E+03 | 5.2139514E+01 | 6.6329377E-01 |
| h | 0 | -1.2484335E+02 | 5.2813192E+04 | 8.3510139E+02 | 4.7650686E+00 |
| i | 0 | -8.5063401E-01 | -9.7664276E+02 | 0 | -1.0585206E-01 |
| j | 0 | 4.5914601E+01 | 0 | 0 | -7.8865952E-01 |



### Curve Fit Coefficients for Figure SP-4
**PDF Page 59**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y |
| a | 1.9547843E-01 | -4.0106841E+00 | 7.4430591E-01 | 2.5370266E+00 | 2.1281574E-01 | 1.6064019E-01 |
| b | 3.5561016E+02 | -9.9686324E+02 | 7.5330317E+00 | 1.0717354E+03 | 9.0649994E-01 | 2.2947257E+01 |
| c | 2.1167725E+01 | 6.2842608E+01 | -2.6223441E+00 | 1.2745868E+02 | -7.1513634E-02 | 1.0337158E+01 |
| d | 1.5395199E+03 | 1.9148302E+04 | -7.6573764E+00 | 2.1126475E+03 | 2.1226034E-01 | -1.9012850E+02 |
| e | -9.9854991E+00 | 4.8442382E+02 | 9.5633663E+00 | -1.3100412E+02 | 0 | -7.6241330E+01 |
| f | 3.5676744E+02 | 2.0156314E+04 | 6.4171596E+01 | -8.1616149E+03 | 0 | 5.1797895E+02 |
| g | 0 | -1.0000458E+03 | -5.6615362E+00 | -5.4494048E+01 | 0 | 1.8682249E+02 |
| h | 0 | -4.6187578E+04 | 6.2296005E+01 | 7.1603101E+03 | 0 | -4.8381017E+02 |
| i | 0 | 0 | 0 | 1.0209281E+02 | 0 | -1.0246694E+02 |
| j | 0 | 0 | 0 | -1.5773732E+03 | 0 | 4.0888648E+02 |



### Curve Fit Coefficients for Figure SP-5
**PDF Page 61**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M y | M y(max) | N x | N x(max) | N y |
| a | 2.5313176E+00 | 2.5732378E-01 | 1.3335228E+00 | 2.1477485E-01 | 2.4808415E-01 | 2.5653323E-01 |
| b | 4.7316180E+02 | 6.2606674E-01 | 3.6615869E+01 | 7.5296188E+01 | 1.0366969E-01 | -4.0038382E+00 |
| c | 1.8832793E+02 | -3.2878161E+00 | -2.8176298E+00 | 1.1984018E+01 | -1.0506027E+00 | -1.0344640E+00 |
| d | 3.8382426E+03 | -1.1818547E+02 | 1.7787657E+03 | 3.4707847E+02 | -9.4702711E+00 | 5.3696185E+00 |
| e | 2.7635021E+02 | 1.2643209E+01 | 2.5274047E+02 | -2.8446444E+00 | 2.4040614E+00 | 6.8231556E-01 |
| f | 3.9998712E+03 | 5.9799018E+02 | 5.4840975E+03 | -5.9498781E+01 | 3.7260011E+01 | -7.5638701E+00 |
| g | -7.0676983E+01 | -5.5092161E+00 | -2.1440049E+02 | 0 | -1.6909514E+00 | 1.7988499E+00 |
| h | 0 | -1.6325622E+02 | 4.1127728E+03 | 0 | -3.0709147E+01 | 2.1898383E+01 |
| i | 0 | 5.2957940E-01 | 1.4254945E+02 | 0 | 0 | -7.1406300E-01 |
| j | 0 | 0 | 0 | 0 | 0 | -7.0391935E+00 |



### Curve Fit Coefficients for Figure SP-6
**PDF Page 63**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |
|  | M x | M y | N x | N x(max) | N y |
| a | 4.3636888E-01 | 4.5676189E-01 | 5.4075370E-01 | 2.2165293E-01 | 1.9897688E-01 |
| b | 2.3852753E+01 | 1.8440615E+01 | 8.6114576E+01 | 1.1021791E+00 | 1.3701305E+00 |
| c | 3.1217893E+00 | 5.7443847E-01 | 1.0655168E+01 | -2.9314573E-01 | 9.5618856E-01 |
| d | 5.7219498E+01 | 2.9177388E+00 | 2.1010659E+02 | -1.9321386E+00 | 4.8903930E+00 |
| e | -1.2300277E+00 | 2.3352518E-01 | -2.8820563E+00 | 8.2217044E-02 | -1.7167097E-01 |
| f | -5.0580341E-01 | 3.7543546E+01 | 6.6563609E+01 | 0 | -1.7515658E-01 |
| g | 4.2630592E-01 | 0 | 1.9552686E+00 | 0 | 0 |
| h | 1.6558694E+01 | 0 | 0 | 0 | 0 |
| i | 0 | 0 | 0 | 0 | 0 |
| j | 0 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SP-7
**PDF Page 65**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |
|  | M x | M y | N x | N x(max) | N y |
| a | 1.2253336E-01 | 1.1858251E+00 | 1.5200677E-01 | 2.1619521E-01 | 2.5863207E-01 |
| b | 1.0261809E+01 | 3.0946931E+01 | 6.4076624E+00 | -2.7578000E+00 | 2.6991616E+00 |
| c | 6.2775089E-02 | 7.3857921E-01 | -2.6209174E-01 | -9.5658676E-01 | 2.1956137E+00 |
| d | 2.5604108E+00 | -2.2783421E+01 | -2.0114106E+01 | 5.8053209E+00 | 1.0038564E+01 |
| e | -9.8501299E-04 | 8.6861688E-01 | 1.3236511E-01 | 2.7205070E+00 | 3.2810471E-01 |
| f | 7.9917757E+00 | 8.6436069E+01 | 3.0298856E+01 | 1.2379576E+01 | -5.9230203E+00 |
| g | 0 | -3.3014293E-01 | 2.5286701E-01 | -1.0511865E+00 | -3.7189490E-01 |
| h | 0 | 0 | -1.2616022E+01 | 1.3253152E+00 | 4.2863472E+00 |
| i | 0 | 0 | -8.5337612E-02 | 0 | 0 |
| j | 0 | 0 | 1.8293849E+00 | 0 | 0 |
| M Note: is a straight line with the equation x=.05 x(max) |  |  |  |  |  |



### Curve Fit Coefficients for Figure SP-8
**PDF Page 67**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y |
| a | 8.9317410E-03 | 7.3287671E-01 | 7.9508921E-01 | 3.5266962E-02 | 2.0299866E-01 | 3.5916400E-01 |
| b | 5.0203542E+00 | 3.1181895E+02 | 9.4160398E+00 | -2.6917070E+00 | 6.7978071E+00 | 5.4358345E+00 |
| c | 1.5440671E-02 | -5.6205300E-01 | -1.7189448E+00 | -1.6341645E-01 | 1.0922719E+00 | 3.4207428E+00 |
| d | 5.3485128E+00 | 2.4647845E+03 | -1.5686253E+01 | -3.1860092E-01 | 5.1652153E+00 | -8.1149255E+00 |
| e | 5.7632701E-03 | 1.4068538E+01 | 1.4218009E+00 | 3.4437164E-01 | -5.3904868E-01 | -8.9147178E+00 |
| f | 8.4286449E+00 | -6.2969213E-01 | 9.5447229E+00 | 7.5747606E+00 | 0 | 4.7756136E+00 |
| g | 0 | -1.3702486E+01 | -4.0309118E-01 | -4.1078961E-01 | 0 | 1.1359995E+01 |
| h | 0 | 0 | 0 | -8.8671717E+00 | 0 | 9.0287194E+00 |
| i | 0 | 0 | 0 | 2.2872839E-01 | 0 | -4.7214821E+00 |
| j | 0 | 0 | 0 | 3.9087223E+00 | 0 | 0 |
| M Note: becomes a straight line with the equation x=.05 x(max) |  |  |  |  |  |  |



### Curve Fit Coefficients for Figure SP-9
**PDF Page 69**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y |
| a | 2.3370685E-01 | 2.9320766E-01 | 1.1784141E+04 | 1.8320789E+01 | 2.1535587E-01 | 3.3317687E-01 |
| b | 2.9018723E+01 | -2.0763414E+01 | 9.3464313E+05 | 8.3509172E+03 | -7.0986796E+00 | -1.5369596E+00 |
| c | 1.6553216E+00 | -1.1798335E+01 | 2.1331986E+05 | 5.1312587E+02 | -1.9163557E+00 | -1.8196144E-01 |
| d | 5.4274852E+01 | -1.8702928E+02 | 2.3415593E+06 | 1.9161935E+04 | 1.0592943E+01 | 4.2630869E+00 |
| e | 6.8782763E-01 | 1.7430944E+02 | 9.6339685E+04 | -8.4129031E+01 | 5.5521226E+00 | 4.3766213E-01 |
| f | 1.2973521E+02 | 7.8818069E+03 | 5.7812319E+06 | 1.8025636E+04 | 1.4121560E+01 | -2.5134645E+00 |
| g | 0 | -1.0752442E+03 | -1.5804262E+04 | 1.5101222E+02 | -5.4628177E+00 | 5.4906974E-02 |
| h | 0 | -6.2887270E+04 | 1.9404386E+06 | 0 | -2.0933724E+01 | 1.4684140E+00 |
| i | 0 | 2.4418102E+03 | 0 | 0 | 1.4933678E+00 | 0 |
| j | 0 | 1.6152312E+05 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SP-10
**PDF Page 71**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y |
| a | 1.4339772E-02 | -1.6425478E-01 | 2.0022648E+01 | 3.3801125E-02 | 2.0919090E-01 | 3.8524647E-01 |
| b | 4.0415929E+00 | -1.8284885E+02 | 4.8112263E+03 | 9.7565490E+00 | -1.3488101E+00 | 7.3560088E-01 |
| c | -2.9455875E-03 | 4.1313219E+00 | 1.7988640E+03 | 2.5997950E-02 | -5.7654925E-01 | 8.4076762E-01 |
| d | 1.1684213E+01 | 3.5448333E+03 | 9.5288546E+03 | -1.0105151E+01 | -3.8272492E-01 | 1.4781856E+01 |
| e | 1.3730882E-02 | 4.0318050E+00 | -5.7270052E+02 | -4.5730978E-02 | 4.1711138E-01 | 6.1446779E+00 |
| f | 0 | 3.9411302E+02 | 3.4015121E+04 | 4.5197650E+00 | -1.2738654E+00 | 3.7594727E+00 |
| g | 0 | -4.8708250E+00 | -5.5304049E+01 | 4.1897271E-02 | 9.9335944E-02 | -2.4884374E+00 |
| h | 0 | 0 | -1.1347899E+04 | -1.7419178E-01 | 4.7011791E+00 | -7.0627835E-01 |
| i | 0 | 0 | 0 | 0 | 0 | 0 |
| j | 0 | 0 | 0 | 0 | 0 | 0 |
| M Note: becomes a straight line with the equation x=.05 x(max) |  |  |  |  |  |  |



### Curve Fit Coefficients for Figure SM-1
**PDF Page 73**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3 +iU4) (1+bU +dU2 + fU3 +hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M y | M y(max) | N x | N y | N y(max) |
| a | 5.5747267E+00 | 3.4183376E+00 | 2.7411866E+00 | 4.8224990E+01 | 1.0303907E+01 | 2.2427607E-01 |
| b | 6.9408828E+00 | 3.0765014E+01 | 1.6750154E+01 | 3.8808868E+03 | -5.8992358E+02 | 5.4141974E-02 |
| c | -2.3569091E+01 | -6.8170131E+01 | 1.3314356E+01 | 6.2613059E+02 | -1.9124766E+02 | 1.3230909E-01 |
| d | 3.1049928E+01 | -8.5525510E+02 | 4.3550206E+02 | 4.4477206E+04 | 4.7018017E+03 | 3.0068753E+00 |
| e | 1.1391075E+02 | 3.9074930E+02 | -1.7816973E+01 | 4.8958788E+03 | 8.3866091E+02 | -2.1599128E-01 |
| f | 2.2104023E+02 | 4.7478650E+03 | -4.5331041E+02 | 3.0249996E+03 | -1.8734948E+03 | -1.8509201E+00 |
| g | -2.6041173E+01 | -1.0234702E+02 | 0 | -3.8779845E+02 | -1.2939377E+02 | 0 |
| h | 5.8486413E+02 | 5.1547728E+03 | 0 | 5.9637346E+04 | 6.2456511E+03 | 0 |
| i | 0 | 0 | 0 | 0 | 0 | 0 |
| j | 0 | 0 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SM-2
**PDF Page 75**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |
|  | M x | M y | N x | N y | N y(max) |
| a | 1.1646993E+01 | 3.0505431E+00 | 2.3257601E+00 | -6.0791980E-02 | 2.5370654E-01 |
| b | 4.4812600E+01 | 1.8715738E+01 | 7.2895751E+00 | -4.1860737E+00 | -2.8999797E-01 |
| c | -2.1554201E+02 | -1.3822104E+01 | -1.0621217E+01 | 3.3386300E-01 | -3.8957216E-01 |
| d | -9.9067850E+02 | -1.9097632E+01 | 4.6172276E+01 | 9.0988534E+00 | -8.1897073E-01 |
| e | 1.2067112E+03 | 2.4613474E+01 | 2.3782398E+01 | -3.7291406E-01 | 2.0136812E-01 |
| f | 5.0631144E+03 | -1.0817593E+02 | -1.9822983E+02 | -7.5883117E+00 | 8.8819248E-01 |
| g | -3.9867125E+02 | -6.4013986E+00 | 1.8276664E+01 | 2.1355625E-01 | 0 |
| h | 5.2285657E+03 | 3.7344372E+02 | 7.6711959E+02 | 2.6114456E+00 | 0 |
| i | 0 | 0 | 0 | -4.2183167E-02 | 0 |
| j | 0 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SM-3
**PDF Page 77**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |
|  | M x | M y | N x | N y | N y(max) |
| a | 3.5758953E+03 | -1.6128152E+03 | 1.1657748E+00 | -2.5119924E-01 | 2.4792063E-01 |
| b | 1.8337834E+04 | -1.6367035E+04 | 6.6118950E+00 | -4.0064481E+00 | 3.3862786E-01 |
| c | -1.4840283E+05 | 1.9145704E+04 | -1.8023351E+00 | 1.2060395E+00 | -2.1239925E-01 |
| d | -1.1131498E+06 | 2.3171093E+05 | -7.5795472E+00 | 1.1601141E+01 | 4.1233137E-01 |
| e | 1.8083402E+06 | 1.7410382E+05 | 7.8509789E-01 | -9.1529815E-01 | 3.3566529E-01 |
| f | 1.9219473E+07 | 9.6988029E+05 | -5.6021012E-01 | -1.0414986E+01 | 0 |
| g | -1.2126461E+05 | 7.4723918E+04 | 4.0155458E-02 | 1.5287720E-01 | 0 |
| h | 4.8680620E+06 | 1.3653286E+06 | 2.7493072E+00 | 3.6042497E+00 | 0 |
| i | -4.2794108E+05 | -9.1957244E+04 | 0 | 0 | 0 |
| j | 8.2865245E+06 | 1.7291098E+06 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SM-4
**PDF Page 79**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N y | N y(max) |
| a | -3.9242091E+00 | 1.0391102E+01 | 1.2613214E+01 | -9.6073351E-01 | -6.9959107E+00 | 2.3037713E-01 |
| b | -6.8534649E+01 | 3.9387668E+02 | 2.9998837E+01 | -4.3250892E+01 | 1.1421396E+02 | -5.3837700E+00 |
| c | 2.2829756E+02 | 2.4027239E+02 | -1.2958011E+02 | -7.5851749E+00 | 8.1222229E+01 | -1.3160009E+00 |
| d | 9.2146671E+03 | 2.0708048E+03 | -2.1424099E+02 | 8.1122731E+00 | -7.2690623E+02 | 1.0999780E+01 |
| e | 3.4198352E+02 | -2.9873877E+02 | 5.5811848E+02 | 5.3250671E+00 | -2.9652619E+02 | 2.9822310E+00 |
| f | 1.2323895E+04 | 1.2047209E+04 | 5.9530232E+02 | 1.1170257E+01 | 1.7240898E+03 | -9.6414550E+00 |
| g | -3.7231614E+02 | 1.8628217E+02 | -3.1905073E+02 | 0 | 4.2740957E+02 | -2.8693578E+00 |
| h | 0 | -1.8362756E+03 | 2.8130991E+03 | 0 | -1.9484552E+03 | 0 |
| i | 0 | 0 | 0 | 0 | -1.9599335E+02 | 0 |
| j | 0 | 0 | 0 | 0 | 1.0400273E+03 | 0 |



### Curve Fit Coefficients for Figure SM-5
**PDF Page 81**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |
|  | M x | M y | N x | N y | N y(max) |
| a | 5.0495187E+00 | 2.3070626E+00 | 1.3094625E+00 | -9.3379908E-02 | 2.4953805E-01 |
| b | 9.0561623E+00 | 1.0325967E+01 | 7.1691230E+00 | -5.4435006E+00 | -3.6794182E+00 |
| c | -1.4047054E+01 | -1.1367273E+01 | -4.9408799E+00 | 5.7613318E-01 | -1.1051223E+00 |
| d | 4.7321689E+01 | 2.6408105E+01 | 2.5638554E+01 | 1.8604627E+01 | 3.5442764E+00 |
| e | 3.2213498E+01 | 2.8750996E+01 | 3.0615331E+01 | -5.0126487E-01 | 1.5827272E+00 |
| f | -7.3303147E+01 | -1.4837218E+02 | 3.6243218E+02 | -2.1454902E+01 | 8.1636007E-01 |
| g | -1.0376978E+01 | -3.0891775E+00 | -1.9926819E+01 | 5.9883003E-01 | -4.6227790E-01 |
| h | 2.0629537E+02 | 7.0688518E+02 | -7.4869562E+01 | 1.3008311E+01 | 1.0811231E+00 |
| i | 2.0027917E+00 | 0 | 4.1492482E+00 | 0 | 0 |
| j | 0 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SM-6
**PDF Page 83**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |  |
|  | M x | M y | N x | N x(max) | N y | N y(max) |
| a | 1.2526536E+00 | 1.9756125E+00 | 3.4347896E+00 | 1.1024681E+00 | -6.5450708E-01 | 6.5289397E-01 |
| b | -9.7363561E+00 | -1.0587166E+01 | 3.2542028E+01 | 1.9145593E+01 | 2.3552546E+00 | 1.4199337E+03 |
| c | 4.2340660E+01 | -7.1544892E+00 | -9.1948300E+00 | -1.2133251E+00 | 3.7495149E+00 | 3.3933113E+02 |
| d | 5.8175057E+02 | 2.6703193E+02 | 2.0032829E-01 | -2.3046035E+01 | 6.5143265E+00 | 3.2570245E+02 |
| e | -1.1515357E+01 | 1.8471350E+02 | 1.4434171E+01 | -4.6757595E-02 | -2.6465459E+00 | -1.6042236E+02 |
| f | -3.6331277E+02 | 4.0675643E+02 | -1.3007292E+02 | 0 | -5.4867337E+00 | -2.2415171E+03 |
| g | 4.4566609E+00 | 3.3760103E+02 | 1.0569688E+00 | 0 | 5.9067623E-01 | -3.1335921E+02 |
| h | 5.5570414E+02 | 5.1181159E+03 | 3.5029291E+02 | 0 | 1.9002049E+00 | -8.5007730E+02 |
| i | 0 | -1.5582922E+02 | 0 | 0 | 0 | 0 |
| j | 0 | 2.6197988E+03 | 0 | 0 | 0 | 0 |



### Curve Fit Coefficients for Figure SM-7
**PDF Page 85**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y | N y(max) |
| a | 8.1160668E+04 | -2.1358757E+01 | 5.4862689E+01 | -7.2531118E+09 | 3.0084382E-01 | -2.8895632E+03 | 2.3378267E-01 |
| b | 2.7739282E+06 | -7.8151335E+02 | 3.1342349E+02 | -2.0933123E+11 | -9.3748510E-01 | 4.4457769E+04 | -1.6431150E+01 |
| c | 1.1224634E+04 | 4.3277628E+02 | -8.0563479E+02 | 2.2820722E+11 | -1.0921552E+00 | 3.1259891E+04 | -3.8049391E+00 |
| d | -8.8850888E+05 | 1.7794474E+04 | -5.1997140E+03 | 6.2795832E+12 | -5.0481105E+00 | -1.7546645E+05 | 9.4783086E+01 |
| e | -4.8065269E+03 | -3.1579734E+02 | 2.6220799E+03 | 1.5072344E+12 | 1.5496602E+00 | -8.1861203E+04 | 2.1771926E+01 |
| f | 3.9177974E+06 | -6.4952855E+04 | 2.3612834E+04 | 3.0941731E+13 | 1.4960517E+01 | 2.9938720E+05 | -2.2519657E+02 |
| g | 0 | 4.0445216E+03 | 4.4422399E+03 | -1.7691040E+11 | 0 | 8.5306950E+04 | -5.2000942E+01 |
| h | 0 | 2.5342959E+05 | -2.1199170E+04 | -3.2233944E+12 | 0 | -2.4788156E+05 | 2.0419341E+02 |
| i | 0 | 0 | -1.9466481E+03 | 0 | 0 | -2.2718263E+04 | 5.0146186E+01 |
| j | 0 | 0 | 7.9566948E+04 | 0 | 0 | 1.1395648E+05 | 0 |



### Curve Fit Coefficients for Figure SM-8
**PDF Page 87**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y |
| a | 4.4733666E-01 | 5.7533123E+00 | 5.8264907E+00 | -4.7164570E+00 | -3.9918460E-01 | -3.4872177E-02 |
| b | 7.8610698E+01 | 1.1086142E+02 | 2.5265382E+00 | -5.9701208E+02 | 6.2212419E+01 | -2.3803483E+00 |
| c | -8.3839589E+00 | -2.5938122E+01 | -1.1258135E+02 | 1.6151819E+02 | 1.3584827E+01 | 1.8887817E+00 |
| d | -1.8016236E+03 | -3.1144926E+02 | -3.6871966E+02 | 1.8269051E+04 | -2.7280298E+02 | 6.6619028E+00 |
| e | 7.5876319E+00 | 3.9969232E+01 | 8.1597594E+01 | 9.2708144E+02 | -5.3559232E+01 | -3.4378049E+00 |
| f | 1.6414093E+03 | 3.2943438E+02 | -1.6649828E+02 | -9.9025503E+03 | 4.2276461E+02 | -8.1245389E+00 |
| g | -2.1271960E+00 | -2.0938374E+01 | 0 | 3.8766373E+02 | 8.0220652E+01 | 1.9493159E+00 |
| h | -8.1344676E+02 | -1.5170605E+02 | 0 | 6.7598529E+02 | -2.1963519E+02 | 3.3624721E+00 |
| i | 0 | 0 | 0 | -6.9623849E+01 | -4.1668059E+01 | -3.1426692E-01 |
| j | 0 | 0 | 0 | 2.9426661E+03 | 0 | 0 |



### Curve Fit Coefficients for Figure SM-9
**PDF Page 89**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  | N i |  |  |  |
|  | M x | M y | N x | N x(max) | N y | N y(max) |
| a | 4.1113079E+07 | 7.7336769E+00 | -2.5729153E+01 | 1.0327061E-01 | 1.1239220E-01 | 3.3638279E-01 |
| b | 9.5490286E+08 | 2.4295257E+01 | -1.7037801E+03 | -9.3530594E+00 | -5.3178302E+01 | 3.2559621E+02 |
| c | -3.4738822E+07 | -1.6569160E+02 | 2.4767641E+02 | -7.2144755E-01 | 1.9133085E+00 | 7.4118059E+01 |
| d | -8.1051168E+08 | -9.0852186E+02 | 3.3508292E+04 | 3.5225999E+01 | 3.5099270E+02 | -1.2289337E+03 |
| e | 1.3277167E+07 | 1.0596882E+02 | 7.7270511E+03 | 1.3129742E+00 | -8.5508346E+01 | -2.4911281E+02 |
| f | 7.3561624E+08 | -2.6969262E+00 | 1.0309667E+05 | -7.0766148E+01 | -4.3914256E+02 | 3.6815807E+02 |
| g | 0 | -2.2564213E+01 | 6.9481877E+03 | 8.0134153E-01 | 4.7150547E+02 | 0 |
| h | 0 | -3.2149048E+02 | 4.5697123E+05 | 9.4607204E+01 | 1.1692513E+03 | 0 |
| i | 0 | 0 | -1.2399014E+03 | -1.6631812E+00 | -1.4518703E+02 | 0 |
| j | 0 | 0 | 0 | -5.2950058E+01 | -1.8381111E+02 | 0 |



### Curve Fit Coefficients for Figure SM-10
**PDF Page 91**

$$Y = \left( \frac{a + c U + e U^2 + g U^3 + i U^4}{1 + b U + d U^2 + f U^3 + h U^4 + j U^5} \right)$$

| Y =(a+cU +eU2 +gU3+iU4) (1+bU +dU2 + fU3+hU4 + jU5) |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | M i |  |  | N i |  |  |
|  | M x | M x(max) | M y | N x | N x(max) | N y |
| a | -2.8953612E-01 | 3.7438322E+00 | -1.1507646E-01 | 3.6486425E-01 | 2.4147461E-01 | -2.4765961E+02 |
| b | -2.3969828E+02 | 4.6553411E+01 | -3.6469314E+01 | 1.5251530E+01 | -6.0878947E+00 | 1.3279704E+04 |
| c | 2.8154560E+01 | -2.6472881E+01 | 6.8407551E+01 | -5.9161742E+00 | -2.1522051E+00 | 6.0502227E+03 |
| d | 8.7047434E+03 | -2.2290514E+02 | 6.7643978E+02 | -4.9050816E+02 | 2.9258704E+01 | -7.6294446E+03 |
| e | 1.6233457E+02 | 7.0363289E+01 | 2.5082547E+02 | 5.8078798E-01 | 9.5636687E+00 | -8.5879675E+03 |
| f | 1.0939479E+04 | 3.2906011E+02 | -5.1126097E+02 | 1.9508997E+02 | -1.6150711E+00 | 8.8654767E+04 |
| g | -9.4525620E+01 | -8.3408410E+01 | -1.0601931E+02 | -3.8109676E+00 | -6.2859846E+00 | 1.0378873E+05 |
| h | 1.2376590E+04 | -3.1498891E+02 | 2.5611251E+03 | -1.1959366E+01 | 1.8565963E+01 | 2.0192673E+04 |
| i | 1.7167907E+01 | 3.7929431E+01 | 0 | 1.5998571E+00 | 1.3048984E+00 | -4.2585861E+04 |
| j | 0 | 4.0136563E+02 | 0 | 0 | -6.2293872E+00 | 3.1275025E+04 |



### Curve Fit Coefficients for Figure 1A - Original
**PDF Page 95**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | Shell parameter, γ |  |  |  |  |
|  | 5 | 15 | 50 | 100 | 300 |
| a | 1.1311378E-01 | 1.0677056E-01 | 1.0109777E-01 | 1.0421625E-01 | 1.2660191E-01 |
| b | -5.2677559E+00 | -1.1320276E+01 | -1.0861214E+01 | 2.1824726E+01 | -4.8528815E+00 |
| c | -7.0077182E-01 | -1.2290783E+00 | -8.4941998E-01 | 2.3302278E+00 | -1.7577414E+00 |
| d | 3.2197618E+01 | 5.9054782E+01 | 1.0664988E+02 | -1.6411424E+02 | -6.7041827E+01 |
| e | 5.0076344E+00 | 6.6407963E+00 | 6.1027621E+00 | -2.1699992E+01 | 8.5907696E+00 |
| f | -2.3996888E+02 | -1.3037717E+02 | -4.6751771E+02 | 1.0772743E+03 | 7.3516096E+02 |
| g | -3.7157352E+01 | -1.7172105E+01 | -2.5271049E+01 | 1.0323029E+02 | -8.2197833E+00 |
| h | 4.3474384E+02 | 5.8538852E+01 | 7.3427013E+02 | -7.3712912E+02 | -1.3310126E+03 |
| i | 9.1224960E+01 | 1.8233380E+01 | 4.0443213E+01 | -1.0533724E+02 | 6.8451216E+00 |
| j | 6.3719594E+02 | 1.4923048E+02 | 0 | -5.9351978E+02 | 9.2624773E+02 |



### Curve Fit Coefficients for Figure 2A – Original
**PDF Page 97**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 6.5550596E-02 | -2.5993561E+01 | -1.7174177E+00 | 2.5243438E+02 | 1.7115228E+01 | 9.8640306E+01 | 4.4305416E+00 | 2.4944027E+02 | -8.5471064E+00 | -2.8610241E+02 |
| 7.5 | 6.9998542E-02 | -1.1398202E+01 | -8.6964398E-01 | 5.5961524E+01 | 4.5358292E+00 | -4.0254339E+01 | -4.1243914E+00 | 1.1489190E+02 | 1.7618207E+00 | -9.2402957E+01 |
| 10 | -2.5298771E-02 | 6.0738065E+01 | 5.8514122E+00 | -3.5373388E+02 | -3.9477829E+01 | 1.3300911E+02 | 5.8939728E+01 | 5.6680649E+02 | 4.1894042E+01 | 2.7465928E+03 |
| 15 | 6.4212033E-02 | -6.3640708E+00 | -3.7856637E-01 | 2.0806090E+01 | 2.2987502E-01 | -1.0257479E+02 | 1.2123817E+00 | 2.9358399E+02 | 2.4623819E-01 | -1.7458349E+02 |
| 25 | 8.1491183E-02 | -8.0001589E+00 | -9.7627470E-01 | 8.1245859E+00 | 4.4413698E+00 | 9.1830793E+01 | -9.1858885E+00 | -3.1899940E+02 | 7.4273446E+00 | 3.2416422E+02 |
| 35 | 7.5806271E-02 | -6.0734301E+00 | -7.3627043E-01 | 1.0537847E+01 | 3.1528397E+00 | 2.0094036E+01 | -7.0920728E+00 | -1.1426500E+02 | 7.7476654E+00 | 2.4684290E+02 |
| 50 | 6.1467002E-02 | -1.3015918E+01 | -7.0181437E-01 | 1.2002158E+02 | 4.4332962E+00 | -5.8646181E+02 | -1.6621060E+01 | 1.1391130E+03 | 2.8449407E+01 | 0.0000000E+00 |
| 75 | 1.1125820E-01 | 1.7346099E+01 | -2.5343294E-01 | -1.6640866E+02 | -2.0265568E+00 | 5.7878480E+02 | 1.1139333E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 100 | 6.0013562E-02 | 3.5121279E-01 | 2.4308435E-01 | 7.5775255E+01 | -1.4817605E+00 | -1.2367900E+02 | 5.8442352E+00 | 1.0598194E+03 | 1.4243450E+01 | 1.0663580E+00 |
| 150 | 1.0265936E+00 | 2.2014737E+02 | -1.2663143E+00 | 6.0008165E+02 | 1.7990890E+01 | -5.0275086E+02 | -7.6653789E+00 | 3.1110158E+02 | 0.0000000E+00 | 0.0000000E+00 |
| 200 | 4.1203127E-02 | -1.3457287E+01 | -2.9125923E-01 | 1.5288652E+02 | 2.5352532E+00 | -1.2805926E+02 | -2.1009296E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 300 | 4.7266294E-02 | -2.5032673E+01 | -5.3506994E-01 | 5.2056401E+02 | 7.3115462E+00 | -3.0751231E+03 | -3.8555206E+01 | 7.7621240E+03 | 9.2368461E+01 | -1.2913989E+03 |



### Curve Fit Coefficients for Figure 2A – Extrapolated
**PDF Page 99**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 6.5550596E-02 | -2.5993561E+01 | -1.7174177E+00 | 2.5243438E+02 | 1.7115228E+01 | 9.8640306E+01 | 4.4305416E+00 | 2.4944027E+02 | -8.5471064E+00 | -2.8610241E+02 |
| 7.5 | 6.6355230E-02 | -3.4822641E+00 | -3.1473418E-01 | 1.4295242E+01 | 1.7109451E+00 | 4.0741506E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 10 | 6.4592671E-02 | -9.4873353E+00 | -6.3499354E-01 | 3.3089241E+01 | 2.2858108E+00 | -5.2155868E+01 | -3.6186611E+00 | 3.7371273E+01 | 2.4193456E+00 | 3.8058550E+00 |
| 15 | 6.4212033E-02 | -6.3640708E+00 | -3.7856637E-01 | 2.0806090E+01 | 2.2987502E-01 | -1.0257479E+02 | 1.2123817E+00 | 2.9358398E+02 | 2.4623819E-01 | -1.7458349E+02 |
| 25 | 6.2214927E-02 | -6.8130496E+00 | -3.8209268E-01 | 4.0245955E+01 | 1.1807549E+00 | -1.6086325E+02 | -3.1080403E+00 | 2.5903575E+02 | 4.6778860E+00 | -3.9453640E+01 |
| 35 | 6.5185401E-02 | -1.2070340E+01 | -8.5971268E-01 | 7.3397847E+01 | 5.4080322E+00 | -1.9063422E+02 | -1.6901965E+01 | 4.2522171E+01 | 2.2119858E+01 | 5.7537406E+02 |
| 50 | 6.1467002E-02 | -1.3015918E+01 | -7.0181437E-01 | 1.2002158E+02 | 4.4332962E+00 | -5.8646181E+02 | -1.6621060E+01 | 1.1391130E+03 | 2.8449407E+01 | 0.0000000E+00 |
| 75 | 6.4732277E-02 | -1.2254741E+01 | -8.5096148E-01 | 8.3755582E+01 | 4.7296908E+00 | -3.6637341E+02 | -1.4159816E+01 | 6.8672859E+02 | 1.9646366E+01 | 0.0000000E+00 |
| 100 | 6.0013562E-02 | 3.5121279E-01 | 2.4308435E-01 | 7.5775255E+01 | -1.4817605E+00 | -1.2367900E+02 | 5.8442352E+00 | 1.0598194E+03 | 1.4243450E+01 | 1.0663580E+00 |
| 150 | 6.0897173E-02 | -1.3150436E+01 | -7.1738412E-01 | 1.6561737E+02 | 4.7100404E+00 | -9.7162645E+02 | -1.8861283E+01 | 1.9188875E+03 | 3.0812124E+01 | -3.0480812E+02 |
| 200 | 6.2301148E-02 | -9.8009991E+00 | -5.2885216E-01 | 1.6255900E+02 | 3.9587716E+00 | -5.9956263E+02 | -1.1633589E+01 | 1.3707665E+03 | 2.2751084E+01 | -2.5655645E+01 |
| 300 | 4.7266294E-02 | -2.5032673E+01 | -5.3506994E-01 | 5.2056401E+02 | 7.3115462E+00 | -3.0751231E+03 | -3.8555206E+01 | 7.7621240E+03 | 9.2368461E+01 | -1.2913989E+03 |



### Curve Fit Coefficients for Figure 3A – Original
**PDF Page 101**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | -5.6666507E-03 | -1.5956787E+01 | 5.6089337E-01 | 1.6883125E+02 | -1.0083584E+01 | -2.7426633E+02 | 1.0311156E+02 | 2.9300017E+02 | -1.2151112E+02 | -2.3768100E+02 |
| 7.5 | -1.4034405E-03 | -1.1983650E+01 | 3.3601745E-01 | 9.1093186E+01 | -7.7085227E-01 | -2.7454432E+02 | 1.6732661E+01 | 4.1166827E+02 | -3.2078021E+01 | -2.8875857E+02 |
| 10 | 1.9773577E-03 | 1.7264678E+00 | -1.0368203E-01 | 4.4678943E+01 | 3.1395155E+01 | -1.9886103E+02 | -9.9073238E+01 | 2.7242529E+02 | 9.3845764E+01 | -8.0861190E+01 |
| 15 | -1.4247190E-02 | -8.5420866E+00 | 3.0617913E+00 | 6.8864517E+02 | -1.4050576E+02 | 2.2470196E+02 | 3.7326103E+03 | 3.0559066E+03 | -3.8587233E+03 | -2.0666500E+03 |
| 25 | -2.0986951E-02 | -1.4029682E+01 | 3.3468732E+00 | 1.4379852E+02 | -7.5738188E-01 | -4.8565847E+02 | 9.7186567E+01 | 8.7013941E+02 | 7.0645338E+01 | 0.0000000E+00 |
| 35 | -3.8470292E-02 | 7.1737944E+00 | 4.0749583E+00 | 6.8294905E+01 | 2.4167260E+02 | -2.0576196E+02 | -3.9654083E+02 | 1.1160524E+03 | -1.9777460E+02 | -2.0840638E+03 |
| 50 | -5.9144597E-02 | -1.9104552E+01 | 1.3569504E+01 | 1.2897476E+02 | -1.5938220E+02 | -1.9732284E+02 | 9.2937687E+01 | -1.3873484E+03 | 4.8019297E+03 | 1.1603749E+04 |
| 75 | -1.6614998E-01 | -1.4153200E+01 | 3.1929366E+01 | 1.1450185E+02 | -3.0278906E+02 | -5.5046764E+02 | 8.2176246E+02 | 1.0725649E+03 | -3.1616487E+02 | 0.0000000E+00 |
| 100 | -1.2442458E-01 | -4.2161173E+01 | 3.5546314E+01 | 8.0573701E+02 | -9.3418173E+02 | -5.7927203E+03 | 1.2434072E+04 | 2.6929228E+04 | 3.1269177E+03 | 0.0000000E+00 |
| 150 | -1.4312119E+00 | 7.2040118E+01 | 2.0074450E+02 | -1.1370646E+03 | 1.9710522E+03 | 1.0846900E+04 | -1.5436978E+04 | -4.0806009E+04 | 3.1879118E+04 | 5.9733283E+04 |
| 200 | -7.2829938E-01 | -1.2253480E+01 | 1.6942511E+02 | 1.5600036E+02 | -1.6424127E+03 | -1.0213406E+03 | 5.1092927E+03 | 2.4171535E+03 | -2.4259988E+03 | 1.1441953E+03 |
| 300 | -1.2359520E+01 | 2.2486843E+02 | 1.7639153E+03 | -4.4014225E+03 | -5.8850377E+02 | 4.8013492E+04 | -1.1033917E+05 | -2.6212588E+05 | 4.0291910E+05 | 5.5295364E+05 |



### Curve Fit Coefficients for Figure 3A – Extrapolated
**PDF Page 103**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | -1.451139E-03 | -1.035899E+01 | 2.650327E-01 | 9.166767E+01 | -1.895453E+00 | -1.323582E+02 | 3.062425E+01 | 1.812153E+02 | 0.000000E+00 | 0.000000E+00 |
| 7.5 | -1.403441E-03 | -1.198365E+01 | 3.360175E-01 | 9.109319E+01 | -7.708523E-01 | -2.745443E+02 | 1.673266E+01 | 4.116683E+02 | -3.207802E+01 | -2.887586E+02 |
| 10 | 1.977358E-03 | 1.726468E+00 | -1.036820E-01 | 4.467894E+01 | 3.139516E+01 | -1.988610E+02 | -9.907324E+01 | 2.724253E+02 | 9.384576E+01 | -8.086119E+01 |
| 15 | -1.424719E-02 | -8.542087E+00 | 3.061791E+00 | 6.886452E+02 | -1.405058E+02 | 2.247020E+02 | 3.732610E+03 | 3.055907E+03 | -3.858723E+03 | -2.066650E+03 |
| 25 | -2.098695E-02 | -1.402968E+01 | 3.346873E+00 | 1.437985E+02 | -7.573819E-01 | -4.856585E+02 | 9.718657E+01 | 8.701394E+02 | 7.064534E+01 | 0.000000E+00 |
| 35 | -3.847029E-02 | 7.173794E+00 | 4.074958E+00 | 6.829491E+01 | 2.416726E+02 | -2.057620E+02 | -3.965408E+02 | 1.116052E+03 | -1.977746E+02 | -2.084064E+03 |
| 50 | -5.914460E-02 | -1.910455E+01 | 1.356950E+01 | 1.289748E+02 | -1.593822E+02 | -1.973228E+02 | 9.293769E+01 | -1.387348E+03 | 4.801930E+03 | 1.160375E+04 |
| 75 | -1.661500E-01 | -1.415320E+01 | 3.192937E+01 | 1.145019E+02 | -3.027891E+02 | -5.504676E+02 | 8.217625E+02 | 1.072565E+03 | -3.161649E+02 | 0.000000E+00 |
| 100 | -1.244246E-01 | -4.216117E+01 | 3.554631E+01 | 8.057370E+02 | -9.341817E+02 | -5.792720E+03 | 1.243407E+04 | 2.692923E+04 | 3.126918E+03 | 0.000000E+00 |
| 150 | -1.431212E+00 | 7.204012E+01 | 2.007445E+02 | -1.137065E+03 | 1.971052E+03 | 1.084690E+04 | -1.543698E+04 | -4.080601E+04 | 3.187912E+04 | 5.973328E+04 |
| 200 | -7.282994E-01 | -1.225348E+01 | 1.694251E+02 | 1.560004E+02 | -1.642413E+03 | -1.021341E+03 | 5.109293E+03 | 2.417154E+03 | -2.425999E+03 | 1.144195E+03 |
| 300 | -1.235952E+01 | 2.248684E+02 | 1.763915E+03 | -4.401423E+03 | -5.885038E+02 | 4.801349E+04 | -1.103392E+05 | -2.621259E+05 | 4.029191E+05 | 5.529536E+05 |



### Curve Fit Coefficients for Figure 4A – Original
**PDF Page 105**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 + gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | -8.9588077E-04 | -1.0457970E+01 | 2.5061533E-01 | 4.3031174E+01 | 1.1824023E+00 | -5.2395915E+01 | -2.7046982E+01 | 1.7696115E+02 | 1.2691723E+02 | -4.0346310E+01 |
| 7.5 | -3.3140260E-03 | -2.1220032E+01 | 6.1100156E-01 | 1.2389299E+02 | -3.7332931E+00 | 6.6891240E+01 | -1.1638340E+02 | 4.9003857E+02 | 1.2555121E+03 | 6.6886838E+02 |
| 10 | -1.1648336E-02 | -1.4431293E+01 | 2.1639922E+00 | 7.1439732E+02 | -6.5047324E+01 | -1.4489682E+03 | 1.6405458E+03 | 3.2001690E+03 | -8.5424030E+02 | -2.1431786E+03 |
| 15 | 2.0637923E-03 | 1.7628487E+01 | -8.9435633E-02 | -3.5074928E+01 | 1.0285314E+02 | 4.1110651E+02 | 2.6541337E+01 | -8.8879784E+02 | 2.6936808E+02 | 9.8642922E+02 |
| 25 | -2.7228028E-02 | -1.2363871E+01 | 5.0597456E+00 | 9.9070478E+01 | -3.0140077E+01 | -9.6383083E+01 | 3.7715102E+02 | 2.2341567E+02 | 4.8679924E+02 | 1.9450443E+02 |
| 35 | -4.5336152E-02 | -6.0281082E+00 | 9.0094840E+00 | 9.5109514E+01 | -7.6383456E+00 | 1.8550518E+02 | 1.4383657E+03 | -6.6824710E+01 | 7.8227326E+02 | 8.4985885E+02 |
| 50 | 6.9545543E-03 | 2.1013063E+01 | -1.2520239E+00 | -1.2197355E+02 | 1.1081457E+03 | 3.6889967E+02 | -6.9319584E+03 | -1.5521239E+03 | 1.2001421E+04 | 3.3806300E+03 |
| 75 | -2.4044856E-01 | -1.2299088E+01 | 3.9096093E+01 | 9.2010582E+01 | -3.0031771E+02 | 8.6894638E+01 | 1.6416270E+03 | 3.1442550E+02 | 1.4725438E+04 | 4.3460455E+03 |
| 100 | 4.4165576E+01 | 7.5148226E+03 | -9.5857906E+03 | -1.3832738E+04 | 7.1082532E+05 | 2.0168647E+05 | -9.9722279E+05 | -3.8741927E+05 | -3.2653494E+05 | 8.6665726E+04 |
| 150 | -5.4249899E-01 | -1.3950711E+01 | 1.2479865E+02 | 1.0971178E+02 | -1.3365378E+03 | -3.3930352E+02 | 7.4189398E+03 | 1.0909387E+03 | -8.1851989E+03 | -9.7272639E+02 |
| 200 | -1.2159205E+00 | -1.4951902E+01 | 2.5720616E+02 | 7.0819294E+01 | -4.4129430E+03 | -1.3547617E+02 | 2.7292632E+04 | 2.2687676E+03 | -3.2082704E+04 | -2.9454074E+03 |
| 300 | -1.9533000E+00 | -1.1589980E+01 | 3.8412396E+02 | 1.4555168E+02 | -2.5265943E+03 | -6.8417326E+02 | 1.0045023E+04 | 1.9247450E+03 | -9.9041899E+03 | -1.5832995E+03 |



### Curve Fit Coefficients for Figure 1B – Original
**PDF Page 107**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 6.7346729E-02 | -1.0304106E+01 | -6.7080602E-01 | 3.9662080E+01 | 1.9691496E+00 | -1.0028727E+02 | -1.1519814E+00 | 2.3145574E+02 | -8.0407474E-01 | -2.1343726E+02 |
| 7.5 | 6.7785462E-02 | -1.2207286E+01 | -8.4426575E-01 | 5.5296135E+01 | 3.4129354E+00 | -1.3990200E+02 | -3.4788527E+00 | 3.9395313E+02 | -3.7948085E-01 | -4.4969821E+02 |
|  | 6.5076303E-02 | -1.2252920E+01 | -7.9628914E-01 | 6.0188924E+01 | 3.2595548E+00 | -1.8478396E+02 | -4.3587135E+00 | 4.6726283E+02 | 1.1704761E+00 | -4.9276520E+02 |
| 15 | 7.9235893E-02 | 1.0838337E+02 | 6.9803876E+00 | -3.7681102E+02 | -3.4844778E+01 | 9.1714034E+02 | 8.7037341E+01 | 8.3750795E+02 | -7.1642738E+01 | -8.1807757E+02 |
| 25 | 6.8438709E-02 | -3.0113589E+00 | -3.2828608E-01 | 2.1168129E+01 | 5.9679403E-01 | -1.1194936E+02 | 2.7902611E+00 | 7.2945425E+02 | -4.1043815E+00 | -6.5026339E+02 |
| 35 | 7.0096232E-02 | -5.3569529E+00 | -6.4453152E-01 | 5.3138336E+00 | 2.4622950E+00 | 4.7013907E+01 | -4.0754352E+00 | -7.3783255E+01 | 2.4166814E+00 | 0.0000000E+00 |
| 50 | 7.4896230E-02 | -4.8371935E+00 | -7.5277128E-01 | -3.6428907E+00 | 2.9001452E+00 | 1.0246171E+02 | -4.8284351E+00 | -3.9191833E+02 | 3.6058947E+00 | 8.5109523E+02 |
| 75 | 9.2558366E-02 | -1.5910132E+00 | -1.1759637E+00 | 1.9300596E+01 | 8.6279673E+00 | -2.3514276E+02 | -1.3843184E+01 | 5.2154638E+03 | 8.0808729E+00 | -3.9356219E+03 |
| 100 | 8.3380480E-02 | -4.7389274E+00 | -1.1523971E+00 | -6.6028603E+00 | 5.6904072E+00 | -9.4347058E+01 | -1.0888393E+01 | 9.4018557E+02 | 8.0262921E+00 | 0.0000000E+00 |
| 150 | 1.1849532E-01 | -3.5628704E+00 | -2.7821673E+00 | -1.6343151E+02 | 1.9783691E+01 | 8.2996586E+01 | -3.8477473E+01 | 1.0118889E+04 | 2.9918254E+01 | 6.3296747E-01 |
| 200 | 4.3235202E-02 | -2.3045068E+01 | -6.5225181E-01 | 3.6386395E+02 | 5.0620570E+00 | -2.4969181E+03 | -9.3822603E+00 | 1.2619560E+04 | 5.7136988E+00 | -1.2426850E+04 |
| 300 | 1.6058038E-01 | 3.4748089E+01 | -4.1652673E+00 | -1.2058674E+03 | 4.0994619E+01 | 1.0847777E+04 | -9.2486784E+01 | 1.5642334E+04 | 7.9169957E+01 | 0.0000000E+00 |



### Curve Fit Coefficients for Figure 1B – Extrapolated
**PDF Page 109**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 6.7346729E-02 | -1.0304106E+01 | -6.7080602E-01 | 3.9662080E+01 | 1.9691496E+00 | -1.0028727E+02 | -1.1519814E+00 | 2.3145574E+02 | -8.0407474E-01 | -2.1343726E+02 |
| 7.5 | 6.7327597E-02 | -1.2136439E+01 | -8.2397106E-01 | 5.4328170E+01 | 3.1494170E+00 | -1.4106910E+02 | -2.4238381E+00 | 4.1849953E+02 | -9.2540246E-01 | -4.2808947E+02 |
| 10 | 7.0051170E-02 | 4.0824550E+00 | 1.4245135E-01 | -2.6138191E+00 | 3.0876213E-02 | 5.4004929E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 15 | 7.9235893E-02 | 1.0838337E+02 | 6.9803876E+00 | -3.7681102E+02 | -3.4844778E+01 | 9.1714034E+02 | 8.7037341E+01 | 8.3750795E+02 | -7.1642738E+01 | -8.1807757E+02 |
| 25 | 7.1086471E-02 | -2.6133164E+00 | -4.2171083E-01 | 1.8268669E+00 | 1.3240460E+00 | 5.1974158E+01 | -1.0474314E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 35 | 7.5330789E-02 | -2.5312902E+00 | -6.5236623E-01 | -2.6441010E+01 | 2.6269218E+00 | 2.4148228E+02 | -4.8050250E+00 | -5.5268948E+02 | 3.1686605E+00 | 3.7868665E+02 |
| 50 | 7.4896230E-02 | -4.8371935E+00 | -7.5277128E-01 | -3.6428907E+00 | 2.9001452E+00 | 1.0246171E+02 | -4.8284351E+00 | -3.9191833E+02 | 3.6058947E+00 | 8.5109523E+02 |
| 75 | 7.8037920E-02 | -4.2340595E+00 | -8.9815789E-01 | -3.9729087E+00 | 4.2535241E+00 | 5.6707113E+01 | -7.8515827E+00 | 3.0425976E+02 | 5.5798011E+00 | 0.0000000E+00 |
| 100 | 8.3380480E-02 | -4.7389274E+00 | -1.1523971E+00 | -6.6028603E+00 | 5.6904072E+00 | -9.4347058E+01 | -1.0888393E+01 | 9.4018557E+02 | 8.0262921E+00 | 0.0000000E+00 |
| 150 | 7.4454426E-02 | 2.9096982E+00 | 9.4649360E-03 | 1.6353625E+02 | -1.2854676E-01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 200 | 7.0197103E-02 | -1.3647435E+01 | -1.0546870E+00 | 2.5668839E+02 | 6.0983801E+00 | -2.5687142E+03 | -1.0326721E+01 | 1.2787133E+04 | 5.6699439E+00 | -1.2916374E+04 |
| 300 | 1.6058038E-01 | 3.4748089E+01 | -4.1652673E+00 | -1.2058674E+03 | 4.0994619E+01 | 1.0847777E+04 | -9.2486784E+01 | 1.5642334E+04 | 7.9169957E+01 | 0.0000000E+00 |



### Curve Fit Coefficients for Figure 1B-1 – Original
**PDF Page 111**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 6.7540358E-02 | -1.0073935E+01 | -6.5300125E-01 | 3.7225306E+01 | 1.7106958E+00 | -8.0533969E+01 | 1.1823779E+00 | 2.6925297E+02 | -2.8623308E+00 | -2.4251520E+02 |
| 7.5 | 5.2958766E-02 | 4.2304665E+00 | 8.2890449E-01 | -5.5339846E+01 | -1.1769452E+01 | -6.5172435E+01 | 4.1486570E+01 | 9.8034696E+02 | -3.0066188E+01 | -2.1085294E+02 |
| 10 | -3.6165246E-02 | 1.5454716E+02 | 1.4894067E+01 | -9.0726060E+02 | -1.3535571E+02 | -2.2921300E+02 | 4.0715982E+02 | 7.7326131E+03 | -3.0718740E+02 | 0.0000000E+00 |
| 15 | 6.7459622E-02 | -8.5126887E+00 | -5.9035168E-01 | 3.5689518E+01 | 1.2621145E+00 | -1.5844262E+02 | 2.3121116E+00 | 6.1268695E+02 | -4.0542581E+00 | -4.8192098E+02 |
| 25 | 7.1880175E-02 | -5.1557898E+00 | -5.8915145E-01 | 5.8273093E+00 | 1.5863500E+00 | -1.1813564E+01 | -6.6441601E-01 | 1.6057605E+02 | 0.0000000E+00 | 0.0000000E+00 |
| 35 | 7.1251139E-02 | -6.4705842E+00 | -7.3882761E-01 | 8.4190069E+00 | 3.0639874E+00 | 5.6900609E+01 | -5.7733567E+00 | -2.1499319E+02 | 4.6096449E+00 | 3.3372292E+02 |
| 50 | 7.7093124E-02 | -3.6235623E+00 | -7.7114564E-01 | -1.7284037E+01 | 3.9415212E+00 | 3.5659809E+02 | -9.5604286E+00 | -1.3885618E+03 | 1.1019867E+01 | 2.3252497E+03 |
| 75 | 4.8614502E-02 | -1.3799919E+01 | -2.2367952E-01 | 2.3809872E+02 | 3.1689879E+00 | -9.2793377E+02 | -3.5470710E+00 | 4.2367750E+03 | 2.2553331E+00 | -3.6812632E+03 |
| 100 | 7.3067243E-02 | -1.2616203E+01 | -1.1587650E+00 | 1.1494056E+02 | 5.6988524E+00 | -1.2421645E+03 | -3.5847457E+00 | 7.4221371E+03 | -2.5256452E-01 | -6.5864228E+03 |
| 150 | -1.5485480E-01 | -1.0481001E+02 | 1.1621444E+00 | 1.2914763E+03 | 2.1339217E+01 | 2.1405037E-01 | -7.3653884E-01 | 3.5096703E+04 | 2.0154040E+01 | 6.9244932E-02 |
| 200 | 3.4017099E-02 | -2.7607907E+01 | -2.6317471E-01 | 5.4227611E+02 | -1.9488108E-01 | -4.6761408E+03 | 1.0887689E+01 | 1.9597847E+04 | -1.7344892E+01 | -2.2545267E+04 |
| 300 | 6.7985424E-02 | -1.8863335E+01 | -9.3937373E-01 | 5.7711933E+02 | 2.0831735E+00 | -8.1280342E+03 | 1.6826355E+01 | 4.3114120E+04 | -2.3189583E+01 | -4.3971072E+04 |



### Curve Fit Coefficients for Figure 1B-1 – Extrapolated
**PDF Page 113**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 6.7540358E-02 | -1.0073935E+01 | -6.5300125E-01 | 3.7225306E+01 | 1.7106958E+00 | -8.0533969E+01 | 1.1823779E+00 | 2.6925297E+02 | -2.8623308E+00 | -2.4251520E+02 |
| 7.5 | 6.7488336E-02 | 6.5013192E-01 | 4.7542333E-02 | 7.7185229E+00 | -6.2276577E-02 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 10 | 6.8718372E-02 | -1.0149472E+01 | -7.3541202E-01 | 4.0593761E+01 | 2.5798607E+00 | -1.1550596E+02 | -2.8247877E+00 | 3.0632982E+02 | 3.7474102E-01 | -3.1463198E+02 |
| 15 | 6.7459622E-02 | -8.5126887E+00 | -5.9035168E-01 | 3.5689518E+01 | 1.2621145E+00 | -1.5844262E+02 | 2.3121116E+00 | 6.1268695E+02 | -4.0542581E+00 | -4.8192098E+02 |
| 25 | 7.2103674E-02 | -4.8951860E+00 | -5.8225731E-01 | 3.8022214E+00 | 1.5959100E+00 | 3.2237125E+00 | -8.0721171E-01 | 1.1920616E+02 | 0.0000000E+00 | 0.0000000E+00 |
| 35 | 7.5568240E-02 | -5.2317781E+00 | -8.4008717E-01 | -2.0730136E+01 | 3.9605774E+00 | 3.0995815E+02 | -9.4154026E+00 | -1.1929807E+03 | 9.7775255E+00 | 1.6615170E+03 |
| 50 | 7.7093124E-02 | -3.6235623E+00 | -7.7114564E-01 | -1.7284037E+01 | 3.9415212E+00 | 3.5659809E+02 | -9.5604286E+00 | -1.3885618E+03 | 1.1019867E+01 | 2.3252497E+03 |
| 75 | 6.8752365E-02 | -1.1834356E+01 | -8.6947054E-01 | 1.2117911E+02 | 3.9623534E+00 | -9.1969733E+02 | -2.3214739E+00 | 4.3918748E+03 | -2.6826218E-01 | -3.8213956E+03 |
| 100 | 7.3067243E-02 | -1.2616203E+01 | -1.1587650E+00 | 1.1494056E+02 | 5.6988524E+00 | -1.2421645E+03 | -3.5847457E+00 | 7.4221371E+03 | -2.5256452E-01 | -6.5864228E+03 |
| 150 | 6.1745117E-02 | -1.9602952E+01 | -9.6974393E-01 | 3.2175569E+02 | 5.6759109E+00 | -2.9578817E+03 | 8.0895989E-01 | 1.7490089E+04 | -1.0518663E+01 | -2.0514595E+04 |
| 200 | 7.0265833E-02 | -1.3878784E+01 | -9.8709249E-01 | 3.0602144E+02 | 3.6185843E+00 | -3.9787170E+03 | 6.4472482E+00 | 2.1690461E+04 | -1.5777137E+01 | -2.5425818E+04 |
| 300 | 6.7985424E-02 | -1.8863335E+01 | -9.3937373E-01 | 5.7711933E+02 | 2.0831735E+00 | -8.1280342E+03 | 1.6826355E+01 | 4.3114120E+04 | -2.3189583E+01 | -4.3971072E+04 |



### Curve Fit Coefficients for Figure 2B – Original
**PDF Page 115**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.1658576E-01 | -2.5051939E+01 | -3.0454599E+00 | 2.0854791E+02 | 2.7530607E+01 | -6.2560941E+01 | -3.0750024E+01 | 2.3636494E+02 | 4.6958098E+00 | -3.9451083E+02 |
| 7.5 | 1.1419180E-01 | -1.2154459E+01 | -1.4644563E+00 | 4.3429791E+01 | 5.2165091E+00 | -6.7658812E+01 | -1.3732131E+00 | 3.1317482E+02 | -2.6286556E+00 | -2.6363148E+02 |
| 10 | 1.1212574E-01 | -1.0184612E+01 | -1.1899876E+00 | 3.1790390E+01 | 2.7412889E+00 | -9.5063947E+01 | 4.2591954E+00 | 4.5657719E+02 | -7.1331145E+00 | -3.7174632E+02 |
| 15 | 1.2638652E-01 | -1.5751596E+01 | -2.6912784E+00 | 2.2851791E+02 | 4.2749893E+01 | 8.7222219E+02 | -4.3800083E+01 | 3.6813502E+02 | -1.9874965E+00 | -4.7660384E+02 |
| 25 | -2.0640202E-01 | 2.0709260E+02 | 3.4570336E+01 | 6.7271049E+02 | -8.8393890E+01 | 6.0864665E+00 | 7.7479733E+01 | 5.4203210E+02 | -8.2799615E+00 | -1.0487543E+03 |
| 35 | 3.0658799E-02 | 5.6079471E+01 | 1.0418631E+01 | 4.3551660E+02 | -2.7485411E+01 | -2.7397038E+02 | 3.1007197E+01 | 1.4871644E+03 | -1.1629450E+01 | -1.5039618E+03 |
| 50 | 1.1191212E-01 | -1.1363210E+01 | -1.2437935E+00 | 1.0508600E+02 | 4.6770256E+00 | -6.9805877E+02 | -6.2085021E+00 | 2.1407812E+03 | 2.6690005E+00 | -1.9151024E+03 |
| 75 | 1.8127835E-01 | -2.9658102E+00 | -2.7785624E+00 | -4.9002941E+00 | 1.3467207E+01 | -7.8895204E+02 | -1.9188584E+01 | 5.5893320E+03 | 9.9189743E+00 | -4.7940846E+03 |
| 100 | 1.0897996E-01 | -1.6777152E+01 | -1.7207439E+00 | 2.3280982E+02 | 9.6011972E+00 | -2.2541494E+03 | -1.0946146E+01 | 1.1949662E+04 | 3.7890547E-01 | -1.2761571E+04 |
| 150 | 9.3834095E-02 | -1.9067495E+01 | -1.4369426E+00 | 3.0662864E+02 | 7.6021733E+00 | -2.8706759E+03 | -1.2628704E+01 | 1.2444056E+04 | 5.3946823E+00 | -1.4917977E+04 |
| 200 | 1.0699651E-01 | -1.8160468E+01 | -1.5647767E+00 | 3.8136443E+02 | 8.5074115E+00 | -3.6393879E+03 | -1.4971000E+01 | 1.5681487E+04 | 8.5519204E+00 | -1.6023887E+04 |
| 300 | 1.3818324E-01 | -8.6097453E+00 | -2.2811210E+00 | 4.1600202E+02 | 1.4361137E+01 | -5.8196421E+03 | -2.8561088E+01 | 3.2985475E+04 | 1.8251962E+01 | -3.7811598E+04 |



### Curve Fit Coefficients for Figure 2B – Extrapolated
**PDF Page 117**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.16585760E-01 | -2.50519390E+01 | -3.04545990E+00 | 2.08547910E+02 | 2.75306070E+01 | -6.25609410E+01 | -3.07500240E+01 | 2.36364940E+02 | 4.69580980E+00 | -3.94510830E+02 |
| 7.5 | 1.12511340E-01 | -1.17874430E+01 | -1.36068920E+00 | 4.18751020E+01 | 4.14709010E+00 | -8.77552660E+01 | 1.96006650E+00 | 4.11583890E+02 | -6.03639520E+00 | -3.84055470E+02 |
| 10 | 1.11942300E-01 | -1.02728370E+01 | -1.20467820E+00 | 3.70397390E+01 | 3.58562680E+00 | -1.02889330E+02 | 7.09866040E-02 | 3.94835410E+02 | -4.11573770E+00 | -3.86695960E+02 |
| 15 | 1.26386520E-01 | -1.57515960E+01 | -2.69127840E+00 | 2.28517910E+02 | 4.27498930E+01 | 8.72222190E+02 | -4.38000830E+01 | 3.68135020E+02 | -1.98749650E+00 | -4.76603840E+02 |
| 25 | 1.12614420E-01 | -7.40189140E+00 | -1.00933760E+00 | 6.75767690E+01 | 8.46194650E+00 | -2.71944590E+01 | -1.73766300E+01 | 2.81605160E+02 | 1.40423070E+01 | 0.00000000E+00 |
| 35 | 1.09657970E-01 | -8.38579160E+00 | -8.70063320E-01 | 1.16126430E+02 | 7.63756970E+00 | -3.61648820E+02 | -1.38185020E+01 | 1.83021920E+03 | 7.58216910E+00 | -2.00293390E+03 |
| 50 | 1.11912120E-01 | -1.13632100E+01 | -1.24379350E+00 | 1.05086000E+02 | 4.67702560E+00 | -6.98058770E+02 | -6.20850210E+00 | 2.14078120E+03 | 2.66900050E+00 | -1.91510240E+03 |
| 75 | 9.27877270E-02 | -4.69819100E+00 | 5.65098020E-01 | 2.15013920E+02 | -7.47258300E-01 | 0.00000000E+00 | 0.00000000E+00 | 0.00000000E+00 | 0.00000000E+00 | 0.00000000E+00 |
| 100 | 1.08979960E-01 | -1.67771520E+01 | -1.72074390E+00 | 2.32809820E+02 | 9.60119720E+00 | -2.25414940E+03 | -1.09461460E+01 | 1.19496620E+04 | 3.78905470E-01 | -1.27615710E+04 |
| 150 | 9.70974250E-02 | -1.85187910E+01 | -1.48686700E+00 | 3.01560570E+02 | 7.77060880E+00 | -2.88644680E+03 | -1.29204720E+01 | 1.24771400E+04 | 5.59127190E+00 | -1.49645460E+04 |
| 200 | 8.35486360E-02 | -2.29186020E+01 | -1.24300780E+00 | 4.25973730E+02 | 7.25814660E+00 | -3.74709690E+03 | -1.13387640E+01 | 1.69905250E+04 | 4.72150150E+00 | -1.70366340E+04 |
| 300 | 1.38183240E-01 | -8.60974530E+00 | -2.28112100E+00 | 4.16002020E+02 | 1.43611370E+01 | -5.81964210E+03 | -2.85610880E+01 | 3.29854750E+04 | 1.82519620E+01 | -3.78115980E+04 |



### Curve Fit Coefficients for Figure 2B-1 – Original
**PDF Page 119**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.0123714E-01 | 2.8998068E+01 | 3.8378637E+00 | 2.6540347E+01 | -6.1909603E+00 | 4.8105428E+01 | 2.4515777E+01 | 3.6140331E+02 | -2.9669235E+01 | -6.4424335E+02 |
| 7.5 | 1.1096668E-01 | -1.0029210E+01 | -1.1678894E+00 | 4.2923190E+01 | 4.8191890E+00 | -7.3456606E+01 | -4.7223813E+00 | 2.1121144E+02 | -2.2678151E+00 | -3.4367384E+02 |
| 10 | 1.2753829E-01 | -1.2471772E+01 | -2.0219045E+00 | 8.4051779E+01 | 1.6834262E+01 | 2.2876765E+02 | -8.4964091E+00 | 4.1489914E+02 | -7.0004262E+00 | -4.1358965E+02 |
| 15 | 1.1703035E-01 | -1.0329079E+01 | -1.3861493E+00 | 4.8925062E+01 | 6.6122794E+00 | -8.5219683E+01 | -7.0034434E+00 | 4.3181446E+02 | 1.0826428E+00 | -4.3207921E+02 |
| 25 | 9.4303126E-02 | 2.5640659E+00 | 9.3799595E-01 | 1.2423076E+02 | 2.5418576E+00 | 6.8922707E+01 | 1.4837240E+00 | 1.7958512E+02 | -9.3529046E+00 | -4.8085873E+02 |
| 35 | 9.9995849E-02 | -2.7301062E+00 | 3.3101907E-01 | 1.1718646E+02 | -4.7491318E+00 | -7.5732491E+02 | 1.9265978E+01 | 2.3861874E+03 | -1.9253359E+01 | -2.1370628E+03 |
| 50 | 1.3782476E-01 | -4.2166215E+00 | -2.0121769E+00 | -8.1163911E+01 | 1.5125192E+01 | 1.3894849E+03 | -3.9674044E+01 | -4.3839143E+03 | 4.1526585E+01 | 5.1558656E+03 |
| 75 | 1.9442973E-01 | 6.3696305E+00 | -3.0516706E+00 | -2.4695078E+02 | 2.0149622E+01 | 2.1943427E+03 | -5.8437823E+01 | -7.3302796E+03 | 6.4939931E+01 | 8.9479553E+03 |
| 100 | 1.1483769E-01 | -1.0697336E+01 | -1.5792381E+00 | 1.0297098E+02 | 1.0801728E+01 | -1.8576448E+02 | -3.7715197E+01 | -1.1431360E+03 | 6.3491193E+01 | 6.3609195E+03 |
| 150 | 9.5019645E-02 | -1.5310472E+01 | -1.4620391E+00 | 1.6771871E+02 | 1.0844657E+01 | -3.6398947E+02 | -3.9594626E+01 | -1.9935018E+03 | 5.7263745E+01 | 6.9897286E+03 |
| 200 | 3.2647527E-02 | -3.1718338E+01 | -3.4090924E-01 | 4.7416202E+02 | 3.8555242E+00 | -2.0605412E+03 | -1.8391578E+01 | 2.4385062E+03 | 3.1364099E+01 | 2.2446155E+03 |
| 300 | 1.2088872E-01 | -8.8461349E+00 | -1.7016322E+00 | 3.3336060E+02 | 1.7078437E+01 | 2.4075841E+02 | -7.1413948E+01 | -9.9440697E+03 | 1.1072960E+02 | 2.4864860E+04 |



### Curve Fit Coefficients for Figure 2B-1 – Extrapolated
**PDF Page 121**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.0123714E-01 | 2.8998068E+01 | 3.8378637E+00 | 2.6540347E+01 | -6.1909603E+00 | 4.8105428E+01 | 2.4515777E+01 | 3.6140331E+02 | -2.9669235E+01 | -6.4424335E+02 |
| 7.5 | 1.1486497E-01 | -1.0047536E+01 | -1.2865145E+00 | 3.3458060E+01 | 5.0707609E+00 | -3.6637248E+01 | -7.4990182E+00 | 3.6468690E+01 | 4.5588220E+00 | 0.0000000E+00 |
| 10 | 1.1489487E-01 | -1.1244590E+01 | -1.3847729E+00 | 4.3802996E+01 | 5.1190723E+00 | -1.1568066E+02 | -4.8191382E+00 | 3.7649094E+02 | -7.9590164E-01 | -4.4248426E+02 |
| 15 | 1.1703035E-01 | -1.0329079E+01 | -1.3861493E+00 | 4.8925062E+01 | 6.6122794E+00 | -8.5219683E+01 | -7.0034434E+00 | 4.3181446E+02 | 1.0826428E+00 | -4.3207921E+02 |
| 25 | 1.1506739E-01 | 3.0785023E-01 | -7.1024642E-02 | 3.7454421E+01 | 7.5831012E-01 | 1.5255140E+02 | 2.8161721E+01 | 1.4641336E+03 | -3.5665596E+01 | -1.4981279E+03 |
| 35 | 1.2445631E-01 | -4.7477282E-01 | -6.2098418E-01 | 2.9230583E+01 | 6.9633595E+00 | 5.0272736E+02 | 3.0479673E+00 | 2.4204448E+02 | -7.5002285E+00 | 0.0000000E+00 |
| 50 | 1.3782476E-01 | -4.2166215E+00 | -2.0121769E+00 | -8.1163911E+01 | 1.5125192E+01 | 1.3894849E+03 | -3.9674044E+01 | -4.3839143E+03 | 4.1526585E+01 | 5.1558656E+03 |
| 75 | 1.2303863E-01 | -4.6436945E+00 | -1.3818761E+00 | -2.2430957E+00 | 1.1688304E+01 | 1.2070655E+03 | -4.0276783E+01 | -5.5776135E+03 | 6.6508093E+01 | 1.0366662E+04 |
| 100 | 1.1483769E-01 | -1.0697336E+01 | -1.5792381E+00 | 1.0297098E+02 | 1.0801728E+01 | -1.8576448E+02 | -3.7715197E+01 | -1.1431360E+03 | 6.3491193E+01 | 6.3609195E+03 |
| 150 | 1.1325087E-01 | -1.1061693E+01 | -1.8069913E+00 | 9.1953655E+01 | 1.3223496E+01 | 1.1161123E+02 | -4.6919265E+01 | -3.2696681E+03 | 6.7913784E+01 | 8.9011590E+03 |
| 200 | 1.1584080E-01 | -5.3416948E+00 | -1.6456791E+00 | 1.1686466E+01 | 1.0764330E+01 | 7.2815813E+02 | -1.5998281E+01 | 3.3436221E+03 | 3.4555682E+01 | 0.0000000E+00 |
| 300 | 1.2088872E-01 | -8.8461349E+00 | -1.7016322E+00 | 3.3336060E+02 | 1.7078437E+01 | 2.4075841E+02 | -7.1413948E+01 | -9.9440697E+03 | 1.1072960E+02 | 2.4864860E+04 |



### Curve Fit Coefficients for Figure 3B – Original
**PDF Page 123**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | -1.8046414E-03 | -1.3047800E+01 | 5.3911241E-01 | 2.1197370E+02 | 1.0299271E+01 | -5.6120828E+02 | 4.4587655E+01 | 1.5154956E+03 | 7.7249267E+02 | 6.5354766E+02 |
| 7.5 | -1.6283846E-02 | -3.7050461E+01 | 3.7105594E+00 | 7.3859962E+02 | -1.3970474E+02 | -1.6152447E+03 | 2.4792607E+03 | 4.1934735E+03 | -1.0539926E+03 | 1.0348270E+03 |
| 10 | -5.8080923E-03 | -5.9425491E+00 | 2.7435465E+00 | 1.6668594E+01 | 2.6115878E+01 | 2.8597310E+01 | -2.4243606E+02 | -3.8308112E+02 | 4.6940203E+02 | 8.0098308E+02 |
| 15 | 2.0520647E-02 | 1.9654786E+01 | -1.5619681E+00 | -1.5934075E+02 | 4.4229568E+02 | 1.1373580E+03 | -2.2875393E+03 | -4.2342622E+03 | 3.6181437E+03 | 6.2125339E+03 |
| 25 | -5.9600769E-02 | -1.2258538E+01 | 1.5871266E+01 | 1.2497290E+02 | -6.7783948E+01 | -4.2188796E+02 | 8.5585441E+02 | 1.2916698E+03 | -6.5306502E+02 | -2.7188112E+02 |
| 35 | -3.6281033E-02 | -1.6165298E+01 | 2.5600578E+01 | 1.4494636E+02 | -1.9823873E+02 | -6.4637369E+02 | 6.3089431E+02 | 1.4312431E+03 | -5.3040954E+02 | -1.0053945E+03 |
| 50 | -1.9480375E-01 | -6.9719968E+00 | 6.2794774E+01 | -6.0866809E+01 | -4.5079079E+02 | 1.5381919E+03 | 1.4437528E+03 | -8.0447508E+03 | 7.1930553E+03 | 2.1420935E+04 |
| 75 | -1.1309418E+01 | 8.7684730E+02 | 1.5720639E+03 | -1.2796188E+04 | 2.4344726E+04 | 1.1928572E+05 | 1.6561793E+05 | -2.4660469E+05 | 1.4307190E+04 | 5.8684524E+05 |
| 100 | -3.1079939E+00 | 3.6273090E+02 | 7.4209428E+02 | -6.2740625E+03 | 2.8644278E+04 | 6.9232208E+04 | -1.5671922E+05 | -2.8234048E+05 | 3.8133890E+05 | 5.0198321E+05 |
| 150 | -2.1620295E+00 | -6.4729306E+00 | 5.8597152E+02 | -9.3099861E+01 | -1.0461387E+04 | 1.2940051E+03 | 5.8603429E+04 | -8.6081352E+03 | 4.5376981E+03 | 8.0563589E+04 |
| 200 | -2.1751363E-01 | -1.9845259E+01 | 3.7942092E+02 | 3.5900115E+02 | -1.4518432E+03 | -1.4845957E+03 | 6.9716534E+03 | 3.6225808E+03 | 3.2884197E+02 | 4.2443370E+03 |
| 300 | -6.0247762E+00 | 4.9236632E-01 | 1.4303933E+03 | 1.7041171E+02 | -6.4348844E+03 | 4.5229053E+02 | 7.7889345E+03 | -4.7376223E+03 | -1.1976759E+02 | 6.9016310E+03 |



### Curve Fit Coefficients for Figure 4B – Original
**PDF Page 125**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | -5.5763002E-04 | -2.5513106E+00 | 1.7792496E-01 | -8.8518243E+00 | 3.4643013E+00 | 3.8324360E+01 | -2.4467893E+01 | -9.8296380E+01 | 3.8081772E+01 | 1.6246706E+02 |
| 7.5 | -1.1483648E-03 | -9.7079380E+00 | 4.2589690E-01 | 6.0994538E+01 | 1.2353752E+00 | -2.0731179E+02 | -1.5606710E+01 | 3.7621930E+02 | 4.2597766E+01 | -1.7730612E+02 |
| 10 | -2.1265263E-03 | 2.4931550E+00 | 6.7204909E-01 | 1.0563244E+01 | 9.2252278E+00 | 2.4984945E+02 | 9.4716013E+01 | -6.5583214E+02 | -2.0855136E+02 | 2.5237044E+02 |
| 15 | -5.5586070E-03 | 6.5972354E+00 | 1.2075140E+00 | -7.3069135E+01 | 4.3744715E+01 | 3.1996840E+02 | -2.7127337E+02 | -9.3957712E+02 | 3.9835157E+02 | 1.1825691E+03 |
| 25 | -6.5690833E-03 | -1.2877315E+01 | 1.8434500E+00 | 1.5568417E+02 | 3.3677495E+01 | -5.2982426E+02 | -1.3326428E+01 | 8.7204182E+02 | 1.1358529E+02 | 0.0000000E+00 |
| 35 | -2.7555354E-02 | -4.2264695E+01 | 8.8371061E+00 | 1.1265725E+03 | -3.8264981E+02 | -3.1096007E+03 | 1.0297432E+04 | 1.5891935E+04 | -9.1696816E+03 | -4.4768412E+03 |
| 50 | -2.6735231E-02 | -1.4219882E+01 | 1.2187518E+01 | 1.5055382E+02 | -6.0333704E+01 | -6.5931240E+02 | 4.0952768E+02 | 1.7325533E+03 | -4.5523270E+02 | -1.4047016E+03 |
| 75 | -7.9350580E-02 | -8.5691614E+00 | 2.6467449E+01 | 9.2459058E+01 | -1.6492481E+01 | -2.9287790E+02 | -2.3580241E+02 | 2.5624001E+02 | 6.1776401E+02 | 5.3112226E+02 |
| 100 | -1.4136181E-01 | -1.1347005E+01 | 5.0688947E+01 | 8.8026710E+01 | -4.3184785E+02 | -2.5613518E+02 | 1.5251737E+03 | 1.3959839E+02 | -9.2829509E+02 | 1.7103589E+03 |
| 150 | -2.3846159E-01 | -2.2541853E+01 | 9.3206080E+01 | 2.7697151E+02 | -1.6474088E+03 | -2.2957949E+03 | 9.8473953E+03 | 1.0669788E+04 | -1.7298853E+04 | -1.7059185E+04 |
| 200 | -2.3139814E-01 | -2.8069009E+01 | 1.2830910E+02 | 4.3666287E+02 | -2.5561906E+03 | -4.1964272E+03 | 1.7610076E+04 | 2.1523236E+04 | -3.4851942E+04 | -3.7711601E+04 |
| 300 | -1.9803766E+00 | 3.4696828E+01 | 6.0704646E+02 | -7.4623867E+02 | -5.5288317E+03 | 7.3353506E+03 | 2.0108800E+04 | -3.0998282E+04 | -6.7557583E+03 | 6.6967598E+04 |



### Curve Fit Coefficients for Figure 4B – Extrapolated
**PDF Page 127**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | -5.5763002E-04 | -2.5513106E+00 | 1.7792496E-01 | -8.8518243E+00 | 3.4643013E+00 | 3.8324360E+01 | -2.4467893E+01 | -9.8296380E+01 | 3.8081772E+01 | 1.6246706E+02 |
| 7.5 | -1.1483648E-03 | -9.7079380E+00 | 4.2589690E-01 | 6.0994538E+01 | 1.2353752E+00 | -2.0731179E+02 | -1.5606710E+01 | 3.7621930E+02 | 4.2597766E+01 | -1.7730612E+02 |
| 10 | -2.1265263E-03 | 2.4931550E+00 | 6.7204909E-01 | 1.0563244E+01 | 9.2252278E+00 | 2.4984945E+02 | 9.4716013E+01 | -6.5583214E+02 | -2.0855136E+02 | 2.5237044E+02 |
| 15 | -5.5586070E-03 | 6.5972354E+00 | 1.2075140E+00 | -7.3069135E+01 | 4.3744715E+01 | 3.1996840E+02 | -2.7127337E+02 | -9.3957712E+02 | 3.9835157E+02 | 1.1825691E+03 |
| 25 | -6.5690833E-03 | -1.2877315E+01 | 1.8434500E+00 | 1.5568417E+02 | 3.3677495E+01 | -5.2982426E+02 | -1.3326428E+01 | 8.7204182E+02 | 1.1358529E+02 | 0.0000000E+00 |
| 35 | -2.7555354E-02 | -4.2264695E+01 | 8.8371061E+00 | 1.1265725E+03 | -3.8264981E+02 | -3.1096007E+03 | 1.0297432E+04 | 1.5891935E+04 | -9.1696816E+03 | -4.4768412E+03 |
| 50 | -2.6735231E-02 | -1.4219882E+01 | 1.2187518E+01 | 1.5055382E+02 | -6.0333704E+01 | -6.5931240E+02 | 4.0952768E+02 | 1.7325533E+03 | -4.5523270E+02 | -1.4047016E+03 |
| 75 | -8.3744182E-02 | -5.9605355E+00 | 2.6934785E+01 | 6.0433566E+01 | 2.4393605E+01 | 8.9999514E+01 | -1.1491888E+02 | -1.0766364E+03 | 9.4558757E+02 | 3.3495851E+03 |
| 100 | -1.4136181E-01 | -1.1347005E+01 | 5.0688947E+01 | 8.8026710E+01 | -4.3184785E+02 | -2.5613518E+02 | 1.5251737E+03 | 1.3959839E+02 | -9.2829509E+02 | 1.7103589E+03 |
| 150 | -2.6932926E-01 | -1.8582009E+01 | 9.7094536E+01 | 1.8335467E+02 | -1.5052950E+03 | -1.2549049E+03 | 7.1031042E+03 | 4.1320690E+03 | -6.5433486E+03 | 2.4373900E+01 |
| 200 | -3.2637701E-01 | -2.2120991E+01 | 1.4241135E+02 | 2.5510518E+02 | -2.5279247E+03 | -1.9113658E+03 | 1.3211283E+04 | 6.0343534E+03 | -1.0998627E+04 | 5.8198889E+03 |
| 300 | -1.9803766E+00 | 3.4696828E+01 | 6.0704646E+02 | -7.4623867E+02 | -5.5288317E+03 | 7.3353506E+03 | 2.0108800E+04 | -3.0998282E+04 | -6.7557583E+03 | 6.6967598E+04 |



### Curve Fit Coefficients for Figure 1C – Original
**PDF Page 129**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 4.592041E-01 | 5.501912E+00 | -3.259902E+00 | -8.856513E+01 | 9.505973E+00 | 4.121731E+02 | -1.337553E+01 | -9.139013E+02 | 1.931395E+01 | 1.179999E+03 |
| 7.5 | 3.982956E-01 | 1.369902E+00 | -2.945674E+00 | -4.823491E+01 | 1.131933E+00 | -4.487709E+01 | 2.074182E+01 | 6.727173E+02 | -8.661538E+00 | -3.126776E+01 |
| 10 | -2.430354E+01 | 1.660436E+04 | 8.572303E+03 | 4.161251E+05 | 3.020615E+04 | -2.954738E+05 | -1.480577E+05 | -2.247253E+04 | 1.601068E+05 | 3.274589E+04 |
| 15 | 3.999954E-01 | -1.467968E+01 | -1.105771E+01 | -7.340992E+01 | 1.058970E+02 | 2.343854E+03 | -2.463943E+02 | -3.955458E+03 | 2.277948E+02 | 3.225830E+03 |
| 25 | 2.888502E-01 | -1.612787E+01 | -6.386175E+00 | 6.406643E+01 | 4.490157E+01 | -1.340321E+02 | -3.676775E+01 | 5.937754E+03 | -6.841533E+01 | -1.150020E+04 |
| 35 | 4.790813E-01 | 9.819609E-01 | -1.314007E+01 | -5.541886E+02 | 1.076512E+02 | 6.362934E+03 | -6.219207E+01 | -7.061658E+03 | -2.410838E+02 | 0.000000E+00 |
| 50 | 3.970629E-01 | -1.384171E+01 | -1.470664E+01 | -2.813818E+02 | 2.253065E+02 | 1.054471E+04 | -8.904115E+02 | -4.341232E+04 | 1.165686E+03 | 5.753069E+04 |
| 75 | 3.327374E-01 | -2.050412E+01 | -1.303532E+01 | -2.071311E+02 | 1.623840E+02 | 5.492358E+03 | -7.591894E+02 | -2.494710E+04 | 9.379280E+02 | 0.000000E+00 |
| 100 | 6.106059E-01 | 3.562053E+01 | -1.862387E+01 | -1.338750E+03 | 3.932527E+02 | 3.487930E+04 | -2.937221E+03 | -2.769712E+05 | 8.320859E+03 | 8.287549E+05 |
| 150 | 8.288681E+00 | 1.715437E+03 | 7.234046E+01 | -2.484432E+03 | -4.032249E+02 | 1.043729E+04 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 200 | 5.697499E-01 | 8.043004E+01 | -1.351843E+00 | -3.449717E+02 | -8.357582E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 300 | 2.205550E+01 | 4.906612E+03 | 7.007318E+01 | -7.818864E+03 | -2.370807E+02 | 8.263393E+04 | -2.475360E+03 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |



### Curve Fit Coefficients for Figure 1C – Extrapolated
**PDF Page 131**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 4.582270E-01 | 5.945634E+00 | -3.036431E+00 | -1.016941E+02 | 1.974035E+00 | 3.250149E+02 | 1.389091E+01 | -4.688659E+02 | -2.694221E+00 | 8.825230E+02 |
| 7.5 | 4.207004E-01 | 1.510403E+01 | 1.581305E+00 | -3.103491E+01 | -2.453742E+01 | -3.171388E+02 | 5.948403E+01 | 7.262875E+02 | -2.131462E+01 | 5.502750E+02 |
| 10 | 3.816180E-01 | 4.523298E+01 | 1.621814E+01 | 8.837445E+02 | 9.259331E+01 | -6.151990E+01 | -4.159127E+02 | -2.192796E+03 | 4.484787E+02 | 2.261068E+03 |
| 15 | 4.080761E-01 | -3.924850E+00 | -7.485687E+00 | -1.398097E+02 | 4.669771E+01 | 1.347686E+03 | -3.824180E+01 | -2.726180E+02 | 0.000000E+00 | 0.000000E+00 |
| 25 | 4.115648E-01 | -2.101055E+01 | -1.563479E+01 | 8.617374E+01 | 2.615038E+02 | 6.200437E+03 | -9.988138E+02 | -2.263490E+04 | 1.489572E+03 | 4.166938E+04 |
| 35 | 3.859407E-01 | 6.798425E+00 | -3.924144E+00 | 1.228247E+02 | 8.954075E+01 | 2.298680E+03 | -3.296632E+02 | -5.234970E+03 | 4.272916E+02 | 2.278665E+03 |
| 50 | 3.968700E-01 | 2.580834E+01 | 1.098581E+00 | 7.378094E+01 | -1.762546E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 75 | 3.026954E-01 | 1.709219E+01 | 5.222633E+00 | 8.885274E+02 | 9.243128E+01 | 4.226790E+03 | -1.752356E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 100 | 3.564371E-01 | -3.674019E+01 | -2.115102E+01 | 6.030078E+01 | 5.167269E+02 | 2.635962E+04 | -2.725685E+03 | -1.272093E+05 | 4.635827E+03 | 1.657965E+05 |
| 150 | 4.245751E-01 | 1.486043E+01 | -1.055510E+01 | -7.373358E+02 | 7.462081E+01 | 5.026256E+03 | -1.051835E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 200 | 5.482515E-01 | 5.676207E+01 | -1.008116E+01 | -1.299505E+03 | 4.813893E+01 | 6.665867E+03 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 300 | 1.913899E-01 | -5.104412E+01 | -6.325633E+00 | 1.733490E+03 | 1.066215E+02 | -2.290056E+04 | 8.879816E+02 | 4.018972E+05 | 0.000000E+00 | 0.000000E+00 |



### Curve Fit Coefficients for Figure 1C-1 – Original
**PDF Page 133**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 4.517367E-01 | 5.192574E+00 | -2.715021E+00 | -7.248822E+01 | 1.804063E+00 | 1.586297E+02 | 1.242687E+01 | 7.063613E-01 | -1.251545E+01 | 0.000000E+00 |
| 7.5 | 4.186608E-01 | -7.724277E+00 | -7.389790E+00 | -7.400667E+01 | 3.981936E+01 | 7.172621E+02 | -4.910547E+01 | -5.439525E+02 | 1.954846E+01 | 0.000000E+00 |
| 10 | -7.719173E+00 | 1.024379E+04 | 4.359326E+03 | 1.096056E+05 | -3.456152E+03 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 15 | 4.256644E-01 | -2.430119E+01 | -1.585255E+01 | 2.239148E+02 | 2.807819E+02 | 7.453039E+03 | -2.677806E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 25 | 3.304192E-01 | -1.674973E+00 | -4.029073E+00 | -5.707889E+01 | 1.892740E+01 | 3.563050E+02 | -2.832513E+01 | -1.740556E+02 | 1.425430E+01 | 0.000000E+00 |
| 35 | 2.974847E+00 | 9.726975E+02 | 2.048642E+02 | 4.834287E+03 | -3.711770E+02 | 5.629210E+03 | 1.888550E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 50 | 3.889337E-01 | 6.508102E+00 | -5.445882E+00 | -1.054809E+02 | 4.929533E+01 | 1.536730E+03 | -1.153045E+02 | -1.470909E+03 | 8.437472E+01 | 0.000000E+00 |
| 75 | 3.213964E-01 | 9.792806E+00 | -2.088793E+00 | -3.522464E+01 | 6.035543E+00 | -2.141044E+01 | -4.944556E+00 | 4.815189E+02 | 0.000000E+00 | 0.000000E+00 |
| 100 | 1.474589E+00 | 5.574128E+02 | 1.187201E+02 | 6.129536E+03 | -3.961479E+02 | -8.038623E+03 | 3.345792E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 150 | 4.871399E-01 | 4.148437E+01 | -3.071165E+00 | -2.147145E+02 | 6.822400E+00 | 3.148886E+02 | -5.121609E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 200 | 3.842791E-01 | 3.635368E+01 | -2.202977E+00 | -1.610413E+02 | 4.093503E+00 | 1.749817E+02 | -2.386633E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 300 | 2.114371E+00 | 6.377731E+02 | 8.888538E+01 | 1.026265E+04 | -2.454726E+02 | -2.470237E+03 | 1.194422E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |



### Curve Fit Coefficients for Figure 1C-1 – Extrapolated
**PDF Page 135**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 4.675856E-01 | 1.271036E+01 | -3.019087E-01 | -9.136649E+01 | -1.925547E+01 | -2.558630E+01 | 6.455719E+01 | 5.713301E+02 | -4.097683E+01 | 0.000000E+00 |
| 7.5 | 4.305934E-01 | -9.235515E+00 | -8.643296E+00 | -8.991981E+01 | 5.281817E+01 | 1.099504E+03 | -5.321053E+01 | -6.825396E+02 | 1.366495E+01 | 0.000000E+00 |
| 10 | 7.182745E+00 | 7.484312E+03 | 2.730789E+03 | 6.388901E+04 | -2.335382E+03 | 1.207436E+03 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 15 | 4.263580E-01 | -2.088461E+01 | -1.497780E+01 | -3.454976E+01 | 1.873126E+02 | 5.456111E+03 | -1.217226E+02 | -2.801459E+01 | -7.911066E+01 | 0.000000E+00 |
| 25 | 5.300847E-01 | 4.951161E+01 | 1.987806E+00 | 4.366512E+00 | 9.877498E+01 | 4.734774E+03 | -1.087733E+02 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 35 | 5.115379E-01 | 6.556593E+01 | 9.842398E+00 | 2.197823E+02 | -1.654114E+01 | 4.620082E+02 | 7.311933E+00 | 0.000000E+00 | 0.000000E+00 | 0.000000E+00 |
| 50 | 3.889337E-01 | 6.508102E+00 | -5.445882E+00 | -1.054809E+02 | 4.929533E+01 | 1.536730E+03 | -1.153045E+02 | -1.470909E+03 | 8.437472E+01 | 0.000000E+00 |
| 75 | 6.218270E-01 | 3.148776E+02 | 8.725021E+01 | 4.050083E+03 | -2.851998E+02 | -7.046104E+03 | 2.479753E+02 | 4.404018E+03 | 0.000000E+00 | 0.000000E+00 |
| 100 | 3.548798E-01 | 4.564454E+01 | 1.047946E+01 | 1.281204E+03 | 7.390799E+01 | 2.965646E+03 | -2.856638E+02 | -5.364185E+01 | 2.374103E+02 | 0.000000E+00 |
| 150 | 3.424816E-01 | 1.982243E+01 | -7.766049E-01 | 1.542565E+02 | 3.975535E+00 | -6.481954E+02 | -5.721169E+00 | 2.043710E+03 | 0.000000E+00 | 0.000000E+00 |
| 200 | 5.794145E-01 | 1.313955E+02 | 2.277730E+01 | 2.780940E+03 | 1.771193E+01 | 2.646138E+03 | -2.612651E+02 | -3.553070E+03 | 2.830585E+02 | 0.000000E+00 |
| 300 | 9.221079E-01 | 2.277546E+02 | 2.811653E+01 | 3.417187E+03 | -1.072404E+02 | -5.784664E+03 | 9.926064E+01 | 4.053793E+03 | 0.000000E+00 | 0.000000E+00 |



### Curve Fit Coefficients for Figure 2C – Original
**PDF Page 137**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 4.9934005E-01 | 1.7182868E+01 | -3.1202047E+00 | 4.9074278E+01 | 1.1707317E+02 | 3.3893099E+03 | -1.2734137E+02 | -1.9624048E+03 | 4.9848113E+01 | 1.7089602E+03 |
| 7.5 | 3.8435973E-01 | -1.0129463E+00 | -4.5061635E+00 | -6.0586297E+01 | 1.7723108E+01 | 2.2539935E+02 | -2.3863369E+01 | 7.7891359E+01 | 9.4771168E+00 | -4.1509319E+02 |
| 10 | 3.5314605E-01 | 1.0523503E-01 | -3.7836220E+00 | -5.5535275E+01 | 1.1450207E+01 | 4.4287097E+01 | 2.8790157E+00 | 1.1713073E+03 | -2.3641947E+01 | -1.7053562E+03 |
| 15 | 5.6989838E+00 | 5.0293641E+03 | 1.3892636E+03 | 2.4889146E+04 | -5.3867101E+03 | 2.4659679E+04 | 1.1690110E+04 | -5.0991660E+02 | -8.9311542E+03 | 1.8297788E+05 |
| 25 | 2.8341674E-01 | -1.3191330E+01 | -6.7839296E+00 | -6.6605549E+00 | 5.7405193E+01 | 4.8211139E+02 | -1.7136167E+02 | 2.1903288E+03 | 1.5191190E+02 | -1.0841625E+04 |
| 35 | 2.3553036E-01 | -1.1880715E+01 | -4.5212698E+00 | 3.4895448E+01 | 2.6932907E+01 | -4.1925423E+02 | -4.9568547E+01 | 3.3221960E+03 | 3.8865768E+01 | 0.0000000E+00 |
| 50 | 4.0183953E-01 | 1.7053546E+01 | -1.1097211E+01 | -1.0069499E+02 | 3.8149924E+02 | 2.6784731E+04 | -9.1277732E+02 | 3.9211544E+02 | 5.1652792E+01 | 2.0361545E+02 |
| 75 | 1.3060875E-01 | 1.8174386E+01 | 1.0065613E+01 | 1.0339246E+03 | -3.0190192E+01 | 1.5669877E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 100 | 3.3092041E-01 | -1.8569257E+01 | -1.7610913E+01 | -3.3546775E+02 | 4.4823126E+02 | 2.9739148E+04 | -3.1197006E+03 | -1.4780848E+05 | 6.3967918E+03 | 0.0000000E+00 |
| 150 | -1.1377839E-01 | -2.9028365E+01 | 2.0040475E+01 | 3.4536465E+03 | -5.4302045E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 200 | 8.5905879E-02 | -2.0885727E+01 | 1.1241965E+00 | 7.0215648E+02 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 300 | 1.4744315E-01 | 9.3023437E+00 | 9.0255442E+00 | 2.6692267E+03 | -3.9153109E+01 | -4.7181616E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |



### Curve Fit Coefficients for Figure 2C – Extrapolated
**PDF Page 139**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.3576818E+00 | 5.4787199E+02 | 1.5669580E+02 | 1.2489260E+03 | -3.8333850E+02 | 4.6936495E+03 | 9.1880912E+02 | 1.4035135E+03 | -6.6364639E+02 | 4.3565758E+03 |
| 7.5 | 5.7968869E-01 | 2.8628065E+00 | -1.7367981E+01 | 4.2633202E+02 | 6.1270423E+02 | 2.2310762E+04 | -2.2799946E+02 | 1.5366852E+02 | -3.3320970E+02 | 6.7217444E+03 |
| 10 | 6.3075752E-01 | 3.7640663E+01 | -8.2169082E+00 | 9.2569165E+02 | 6.9748757E+02 | 2.6774603E+04 | -7.0822746E+02 | -1.5047302E+03 | 0.0000000E+00 | 0.0000000E+00 |
| 15 | 5.1805237E+00 | 4.5271099E+03 | 1.2488783E+03 | 2.2587775E+04 | -4.7526203E+03 | 2.4818315E+04 | 1.0245359E+04 | -4.0180925E+02 | -7.6288914E+03 | 1.7249065E+05 |
| 25 | 3.9751894E-01 | -5.7364551E+00 | -1.1798295E+01 | -2.4670058E+02 | 1.4949912E+02 | 5.2714449E+03 | -5.6177695E+02 | -1.2773771E+04 | 6.4751692E+02 | 0.0000000E+00 |
| 35 | 3.5481871E-01 | -9.2187169E+00 | -1.1374846E+01 | -2.7941316E+02 | 1.3548867E+02 | 5.1693772E+03 | -5.5808510E+02 | -1.6096157E+04 | 7.7580311E+02 | 1.1922813E+04 |
| 50 | 3.6260194E-01 | -2.7926458E+01 | -2.0480329E+01 | 4.5890934E+02 | 6.4327216E+02 | 3.8162115E+04 | -1.3489610E+03 | 4.3146668E+00 | 3.6842022E+03 | 7.9477885E+05 |
| 75 | 3.1539841E-01 | 1.2071082E+01 | -3.8831961E+00 | -7.7788436E+01 | 3.3669531E+01 | 1.4570494E+03 | 5.9627646E+01 | 1.6287582E+04 | -3.6858073E+02 | 0.0000000E+00 |
| 100 | 3.3450869E-01 | -1.2896112E+01 | -1.6606359E+01 | -8.3796599E+02 | 3.0153596E+02 | 2.3700865E+04 | -1.7996647E+03 | -1.2477447E+05 | 3.5998856E+03 | 2.1207072E+05 |
| 150 | 2.5592411E-01 | 1.8569161E+01 | 2.5826210E-01 | 3.9844192E+02 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 200 | 2.3984499E-01 | 1.1898124E+01 | -9.4837114E-01 | 3.3643788E+02 | 3.9113077E+00 | -2.0222230E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 300 | 2.3022480E-01 | -1.0667348E+01 | -8.7041910E+00 | -1.3401146E+02 | 1.5392238E+02 | 1.0781276E+04 | -7.1082648E+02 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |



### Curve Fit Coefficients for Figure 2C-1 – Original
**PDF Page 141**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3+iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 3.8457667E+00 | 1.5305546E+03 | 4.3428722E+02 | 4.5364275E+03 | -4.5932432E+02 | 2.3779797E+04 | 1.0976000E+03 | -4.3281845E+03 | -8.4362475E+02 | 1.4605436E+03 |
| 7.5 | 3.9581011E-01 | 5.6242425E-01 | -4.3113618E+00 | -6.6010440E+01 | 1.7527239E+01 | 3.0582367E+02 | -2.9124836E+01 | -4.4172959E+02 | 2.2414804E+01 | 5.2836556E+02 |
| 10 | 3.8403371E-01 | 8.7941658E-02 | -5.1109460E+00 | -9.8172319E+01 | 2.3829009E+01 | 5.0639295E+02 | -4.0512281E+01 | -4.9172025E+02 | 2.2089189E+01 | -1.3950820E+02 |
| 15 | 6.8753930E-01 | 1.3367194E+02 | 1.9876612E+01 | 1.0864444E+03 | 4.0759131E+02 | 1.9962206E+04 | -7.8792780E+02 | 2.4978488E+03 | 5.0304930E+02 | -2.6050189E+01 |
| 25 | 2.7344147E-01 | 1.3360341E-01 | -2.4549902E+00 | -4.6269619E+00 | 8.5198436E+00 | -1.1428876E+02 | -1.1796029E+01 | 6.9615671E+02 | 5.1923515E+00 | -8.3883798E+02 |
| 35 | 2.2981263E-01 | 3.8619369E+00 | -2.1954306E-01 | 9.2191433E+01 | -8.7583721E-01 | -3.0341598E+02 | 7.1468138E+00 | 1.5960807E+03 | -8.1398435E+00 | -1.4209551E+03 |
| 50 | 2.7056772E-01 | -9.2790357E+00 | -5.9796990E+00 | -3.0193561E+01 | 4.0222743E+01 | -4.4654144E+02 | -6.3917967E+01 | 8.7189374E+03 | 4.5075601E+01 | 7.2879253E+00 |
| 75 | 1.6214014E-01 | -1.0600236E+01 | -7.0050779E-01 | 3.4399168E+02 | 7.0088005E+00 | -1.8783290E+03 | -1.3823235E+01 | 9.3297298E+03 | 8.1956533E+00 | -1.0035993E+04 |
| 100 | 3.6054777E-01 | 2.1889592E+01 | -5.9010748E+00 | -3.9337145E+02 | 3.9402927E+01 | 2.3519035E+03 | -7.0861006E+01 | 3.2242272E+01 | 5.5624326E+01 | 2.3569128E+04 |
| 150 | 8.0768032E-01 | 1.1010116E+02 | -1.7478068E+01 | -2.2082413E+03 | 1.4628588E+02 | 1.3474207E+04 | -3.4659288E+02 | 1.4933536E+04 | 2.8560564E+02 | 0.0000000E+00 |
| 200 | 3.2458807E-01 | 1.6262970E+01 | -5.1294997E+00 | 8.9433647E+01 | 4.0042347E+01 | -3.1100062E+03 | -9.0926572E+01 | 3.9635572E+04 | 5.6893697E+01 | -6.4495766E+04 |
| 300 | 3.0282663E-01 | 4.1870302E+01 | 2.6505819E+00 | 1.4131985E+03 | -1.2142996E+01 | -4.9326461E+02 | 1.3413750E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |



### Curve Fit Coefficients for Figure 2C-1 – Extrapolated
**PDF Page 143**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 5.4642781E-01 | 1.5619835E+01 | -5.3652516E+00 | 2.0541462E+02 | 2.2205716E+02 | 5.4426658E+03 | -4.3462830E+02 | -8.1879588E+03 | 4.5752602E+02 | 1.4146288E+04 |
| 7.5 | 5.1587095E-01 | 1.2054492E+02 | 3.8517488E+01 | 1.0852120E+03 | 7.0915324E+00 | 1.4734603E+03 | -2.7286182E+02 | -8.1284234E+03 | 3.1015326E+02 | 6.5114790E+03 |
| 10 | 4.9657145E-01 | 1.1964924E+02 | 3.6131643E+01 | 1.1383145E+03 | -3.9209634E+01 | 2.5141226E+01 | -7.0080076E+01 | -1.6761174E+03 | 8.3433852E+01 | -1.3384655E+02 |
| 15 | 6.8753930E-01 | 1.3367194E+02 | 1.9876612E+01 | 1.0864444E+03 | 4.0759131E+02 | 1.9962206E+04 | -7.8792780E+02 | 2.4978488E+03 | 5.0304930E+02 | -2.6050189E+01 |
| 25 | 4.0971718E-01 | -4.2784003E+00 | -1.1306382E+01 | -2.7162180E+02 | 1.1651116E+02 | 3.9070079E+03 | -2.8257838E+02 | -1.4546596E+03 | 2.6206675E+02 | 5.7233882E+03 |
| 35 | 3.9224915E-01 | 3.2062015E+00 | -9.6302388E+00 | -3.2806353E+02 | 1.0158372E+02 | 4.1336910E+03 | -2.5872530E+02 | 1.1212901E+02 | 2.3204134E+02 | 0.0000000E+00 |
| 50 | 4.5264014E-01 | 6.4050764E+01 | 2.2999009E+00 | -2.9745785E+02 | -7.5262360E+00 | 4.4665161E+03 | 6.9769069E+00 | -1.2140502E+04 | 7.6318069E+00 | 1.5241750E+04 |
| 75 | 4.0233923E-01 | 2.7561830E+01 | -6.4291062E+00 | -5.4423317E+02 | 5.5283299E+01 | 5.2336538E+03 | -1.4378135E+02 | -8.8344218E+03 | 1.3823393E+02 | 1.7610243E+04 |
| 100 | 3.6054777E-01 | 2.1889592E+01 | -5.9010748E+00 | -3.9337145E+02 | 3.9402927E+01 | 2.3519035E+03 | -7.0861006E+01 | 3.2242272E+01 | 5.5624326E+01 | 2.3569128E+04 |
| 150 | 3.4974480E-01 | 3.1974942E+01 | -4.0656889E+00 | -2.0370172E+02 | 3.7400078E+01 | 2.3752821E+03 | -7.2834636E+01 | 1.4418117E+04 | 4.7306737E+01 | -3.9463799E+01 |
| 200 | 2.6939808E-01 | 1.4310934E+01 | -1.1283420E+00 | 4.6080480E+02 | 3.0042647E+00 | -2.2310759E+03 | -1.5995230E+00 | 6.3850799E+03 | 0.0000000E+00 | 0.0000000E+00 |
| 300 | 2.9550436E-01 | 2.8819415E+01 | -1.9560412E+00 | 6.3890237E+02 | 1.3163020E+01 | -4.1811108E+03 | -1.3465882E+01 | 2.8344040E+04 | 0.0000000E+00 | 0.0000000E+00 |



### Curve Fit Coefficients for Figure 3C - Original
**PDF Page 145**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Coefficients | Shell parameter, γ |  |  |  |  |
|  | 5 | 15 | 50 | 100 | 300 |
| a | 1.0668159E+00 | 3.2716946E+00 | 1.0725713E+01 | 2.6559650E+01 | 6.9016340E+01 |
| b | 7.9140838E+00 | -6.8671908E+00 | -8.7045111E+00 | -6.6035045E+00 | -5.0165736E-01 |
| c | 8.1102336E+00 | -2.6080638E+01 | -1.1564288E+02 | -3.4270231E+02 | -8.0228302E+02 |
| d | -1.1292007E+01 | 3.7761033E+01 | 4.5466193E+01 | 3.3102767E+02 | -1.1449330E+01 |
| e | -1.7945788E+01 | 1.4888992E+02 | 4.9970582E+02 | 8.1447614E+03 | 3.2495591E+03 |
| f | 2.5026002E+01 | 1.1065997E+02 | -2.0206256E+02 | -6.3558069E+02 | 2.0054329E+02 |
| g | 2.9977255E+01 | 1.4204463E+02 | -7.3399644E+02 | -1.4188404E+04 | -4.0534207E+03 |
| h | 3.0439283E+01 | 8.8783918E+01 | 8.8277266E+02 | 2.3841677E+04 | -3.8275519E+03 |
| i | 0 | -9.5444149E+00 | 2.2297605E+02 | 2.5758084E+03 | 1.0927190E+04 |
| j | 0 | 7.2789772E+02 | -1.2132245E+03 | -3.9978723E+04 | 2.4203492E+04 |



### Curve Fit Coefficients for Figure 4C – Original
**PDF Page 147**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.0714090E+00 | 1.5777386E+01 | 1.7904195E+01 | -2.4523177E+01 | -4.5034971E+01 | -1.8674439E+01 | 1.2509478E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 7.5 | 1.6798782E+00 | 1.1084092E+01 | 1.4241928E+01 | 6.3377070E+01 | 1.4465339E+02 | -5.3777978E+00 | -5.0613043E+02 | -5.6968685E+02 | 4.0576902E+02 | 6.6333775E+02 |
| 10 | 2.0520772E+00 | 1.1695315E+01 | 2.6148580E+01 | 1.9200946E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 15 | 3.1178423E+00 | -1.5499057E+01 | -4.9052641E+01 | 1.7300848E+02 | 5.6293177E+02 | -2.9026605E+02 | -1.2947755E+03 | 8.1614779E+01 | 8.2230278E+02 | 0.0000000E+00 |
| 25 | 5.0010457E+00 | -1.2662995E+01 | -6.2523614E+01 | 3.4966185E+01 | 1.1026272E+02 | -3.5755172E+01 | 6.5663090E+02 | 6.1069925E+02 | 0.0000000E+00 | 0.0000000E+00 |
| 35 | 6.9384691E+00 | -5.4029030E+00 | -3.9925729E+01 | 1.2863333E+01 | 7.9210534E+01 | 8.0932678E+01 | 5.7989137E+02 | 6.7363579E+01 | 4.0053870E+01 | 4.6138534E+02 |
| 50 | 1.0212743E+01 | -9.3034484E+00 | -1.0595838E+02 | 1.6951637E+01 | 2.5912539E+02 | 1.0039460E+02 | 7.9744920E+02 | -5.8059851E+01 | 1.4068024E+02 | 1.0569986E+03 |
| 75 | 1.5498799E+01 | -8.0730463E+00 | -1.9594321E+02 | 1.1617655E+02 | 3.1051608E+03 | 7.9741421E+02 | 8.4403279E+01 | -1.2123917E+02 | -9.0209727E+02 | 1.9046733E+03 |
| 100 | 2.0392676E+01 | -3.2390035E+01 | -6.6089284E+02 | 1.0870729E+03 | 2.0892936E+04 | 3.3533750E+03 | 6.9651951E+04 | 2.4188155E+04 | -1.0083734E+05 | -1.3389026E+04 |
| 150 | 3.0200187E+01 | -5.0563303E+00 | -2.5111565E+02 | 1.0630310E-01 | 5.9142762E+02 | 5.0885789E+00 | -2.0039550E+02 | 3.7200049E+01 | -1.2344451E+02 | 9.7817887E+01 |
| 200 | 3.9172725E+01 | 2.8577693E+01 | 1.0838885E+03 | -8.7878063E+01 | -9.2928964E+03 | -2.4076816E+02 | 2.2427779E+04 | 3.3574449E+02 | -1.5442791E+04 | 1.1687576E+03 |
| 300 | 6.4747022E+01 | -4.3715310E+00 | -7.2315542E+02 | -4.3897890E+01 | 2.1027138E+03 | 2.8891863E+02 | 3.5568226E+02 | -6.3621902E+02 | -1.1000655E+03 | 1.7788488E+03 |



### Curve Fit Coefficients for Figure 4C – Extrapolated
**PDF Page 149**

$$Y = \left( \frac{a + c \beta + e \beta^2 + g \beta^3 + i \beta^4}{1 + b \beta + d \beta^2 + f \beta^3 + h \beta^4 + j \beta^5} \right)$$

| Shell Parameter γ | Y =(a+cβ+eβ2 +gβ3 +iβ4) (1+bβ+dβ2 + fβ3 +hβ4 + jβ5) |  |  |  |  |  |  |  |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Coefficients |  |  |  |  |  |  |  |  |  |
|  | a | b | c | d | e | f | g | h | i | j |
| 5 | 1.0714090E+00 | 1.5777386E+01 | 1.7904195E+01 | -2.4523177E+01 | -4.5034971E+01 | -1.8674439E+01 | 1.2509478E+01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 7.5 | 1.5876477E+00 | 2.6290834E+00 | 4.6882603E+00 | -1.3816879E+01 | -4.1302604E+01 | -1.4711587E+01 | 5.2331471E+01 | 4.9951995E+01 | 0.0000000E+00 | 0.0000000E+00 |
| 10 | 2.0344452E+00 | 1.2123997E+01 | 2.7813957E+01 | -5.3377126E+00 | -6.3975107E+01 | -4.6002973E+01 | 1.8150146E-01 | 0.0000000E+00 | 0.0000000E+00 | 0.0000000E+00 |
| 15 | 3.1178423E+00 | -1.5499057E+01 | -4.9052641E+01 | 1.7300848E+02 | 5.6293177E+02 | -2.9026605E+02 | -1.2947755E+03 | 8.1614779E+01 | 8.2230278E+02 | 0.0000000E+00 |
| 25 | 4.9389931E+00 | -1.1963174E+01 | -5.6542606E+01 | 3.1514300E+01 | 5.7807976E+01 | -5.1248762E+01 | 7.7028466E+02 | 6.7802390E+02 | 0.0000000E+00 | 0.0000000E+00 |
| 35 | 6.7437473E+00 | -4.9525764E+00 | -2.8153832E+01 | 1.3636145E+01 | -5.0341276E+01 | -2.8931644E+01 | 6.7171247E+02 | 2.7697420E+02 | -3.4912735E+02 | 0.0000000E+00 |
| 50 | 1.0212743E+01 | -9.3034484E+00 | -1.0595838E+02 | 1.6951637E+01 | 2.5912539E+02 | 1.0039460E+02 | 7.9744920E+02 | -5.8059851E+01 | 1.4068024E+02 | 1.0569986E+03 |
| 75 | 1.4300933E+01 | -1.0238461E+01 | -1.5972372E+02 | 7.8284862E+01 | 1.2740550E+03 | 1.1865514E+02 | 8.9357441E+02 | 6.7568855E+02 | -1.6472958E+03 | -2.4135017E+01 |
| 100 | 2.0392676E+01 | -3.2390035E+01 | -6.6089284E+02 | 1.0870729E+03 | 2.0892936E+04 | 3.3533750E+03 | 6.9651951E+04 | 2.4188155E+04 | -1.0083734E+05 | -1.3389026E+04 |
| 150 | 3.1078625E+01 | 9.5842178E+00 | 1.4936754E+02 | -9.8958595E+01 | -3.0762438E+03 | 2.0744212E+02 | 9.7753397E+03 | -5.4613410E+02 | -6.2629587E+03 | 2.0910257E+03 |
| 200 | 4.2335090E+01 | -4.5808198E+01 | -2.1433891E+03 | 8.2117846E+02 | 4.4332905E+04 | 1.6341411E+03 | -1.2017511E+05 | -3.5311808E+03 | 9.2031607E+04 | 0.0000000E+00 |
| 300 | 6.4747022E+01 | -4.3715310E+00 | -7.2315542E+02 | -4.3897890E+01 | 2.1027138E+03 | 2.8891863E+02 | 3.5568226E+02 | -6.3621902E+02 | -1.1000655E+03 | 1.7788488E+03 |




---

## Section 9 (Appendix A): Basis for Corrections & Test Benchmark Data
Appendix A documents the experimental and analytical verification of Bijlaard's theory, identifying regions where modifications and conservative extensions were established.

### Table A-1 – Parameters for Model Vessels Tested With External Loads on Nozzles
**PDF Page 160**

| Spherical Shell Models | D /T m | d /D i i | r /R m m | ρ* =T /t | γ* =r /t m | r u* =1.82 m R /T R m m | r m R /T R m m | Fillet Radius,×T |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| West WN-50A | 51.0 | 0.50 | 0.50 | 2.0 | 25.5 | 4.59 | 2.52 | 0.80 |
| West WN-50B | 51.0 | 0.27 | 0.2745 | 2.0 | 14.0 | 2.52 | 1.38 | 0.80 |
| West WN-50C | 51.0 | 0.27 | 0.269 | 4.0 | 27.5 | 2.475 | 1.36 | 0.80 |
| West WN-50D | 51.0 | 0.129 | 0.131 | 4.0 | 13.4 | 1.205 | 0.662 | 0.80 |
| IITRI S-1 | 236.0 | 0.496 | 0.498 | 1.01 | 59.5 | 9.87 | 5.41 | ~1.39 |
| Cylindrical Shell Models | D /T m | d /D i i | r /R m m | t /T | s /S | r β* =0.875 0 R m | Fillet Radius,×T | r m R /T R m m |
| Penn St. "L” | 19.0 | 0.32 | 0.325 | 0.43 | 0.754 | 0.305 | 1.0 | 1.005 |
| Penn St. "R" | 19.0 | 0.63 | 0.634 | 0.687 | 0.926 | 0.585 | 0.75 | 1.95 |
| Penn St. "S” | 19.0 | 1.00 | 1.00 | 1.00 | 1.00 | … | 0.75 | … |
| IITRI "C-1" | 230.0 | 0.496 | 0.4975 | 0.98 | 0.508 | 0.439 | ~1.35 | 5.3 |
| *Bijlaard’s Parameters |  |  |  |  |  |  |  |  |



### Table A-2 – Comparison of Calculated and Measured Stresses in Spherical Models Under External Nozzle Loadings
**PDF Page 161**

| Load and Model | Calculated Stresses(1), ksi |  |  | Measured Stresses(1), ksi |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Biljaard |  | Penny | σ y | σ x | Adjusted |
|  | σ y | σ x |  |  |  | σ x |
| Moment loading |  |  |  |  |  |  |
| WN-50A | 2.72 | 2.13 | 3.64 | 4.81 | 6.05 | 5.03(2) |
| WN-50B | 3.18 | 2.51 | 3.37 | 4.59 | 5.73 | 4.78(2) |
| WN-50C | 2.40 | 0.554 | 2.52 | 3.83 | 4.45 | 3.97(3) |
| WN-50D | 2.11 | 0.447 | 2.09 | 2.73 | 3.15 | 2.81(3) |
| S-1 | … | … | 14.5 | 9.95 | 14.4 | 11.8(4) |
| Direct axial load (6000 lb pull) |  |  |  |  |  |  |
| S-1 | … | … | 23.4 | 16.56(5) | 20.66(5) | 17.0 (4) |
|  |  |  |  | 18.3(6) | 23.5(6) | 19.3 (4) |
| Notes: 4) Stresses due to moment loading are reported as a ratio of the stress in question to the calculated bending stress in the nozzle, as was reported by Westinghouse for the photoelastic models. These "base" nozzle stresses are as follows: WN-50A - 0.00398Mb; WN-50B - 0.0135Mb; WN-50C - 0.0274Mb; WN-50D - 0.118Mb; S-1 - 0.0903Mb, where Mb is the applied moment. 5) Based on local SCF of 1.20. 6) Based on local SCF of 1.12. 7) Based on local SCF of 1.22. 8) Average of eight separate measurements around nozzle. 9) Maximum of eight separate measurements around nozzle. |  |  |  |  |  |  |



### Table A-3 – Comparison of Calculated and Measured Stresses in Thick Walled Cylindrical Vessels with External Loads on Nozzles
**PDF Page 162**

| Model and Load | Stress Components | Calculated stresses, ksi |  |  | Maximum Measured Stresses, ksi |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  |  | Membrane | Bending | Total | Gross | Adjusted |
| Model "L" |  |  |  |  |  |  |
| Longitudinal moment (250,000 in-lb) | σ φ | 10.45 | 17.1 | 27.55 | 20.5 | 20.5 |
|  | σ x | 3.36 | 26.9 | 30.26 | 35.4 | 27.2(4) |
| Transverse moment (250,000 in-lb) | σ φ | 3.41 | 45.4 | 48.8 | 44.7 | 34.4(4) |
|  | σ x | 6.37 | 24.7 | 31.1 | 21.2 | 21.2(1) |
| Model "R" |  |  |  |  |  |  |
| Longitudinal moment (500,000 in-lb) | σ φ | 7.58 | 5.37 | 12.95 | 14.6 | 14.6 |
|  | σ x | 3.60 | 8.03 | 11.63 | 23.7 | 16.9(2) |
| Transverse moment (500,000 in-lb) | σ φ | 4.16 | 31.5 | 35.66 | 57.1 | 40.7(2) |
|  | σ x | 10.0 | 15.0 | 25.0 | 26.9 | 26.9 |
| Radial load (30,000 lb pull) |  |  |  |  |  |  |
| Longitudinal axis | σ   | 3.55 | 3.24 | 6.79 | 1.4 | 1.4 |
|  | σ x | 2.08 | 5.78 | 7.86 | 2.2 | 1.57(1) |
| Transverse axis | σ' φ | 2.08 | 5.78 | 7.86 | 14.4 | 10.3(1) |
|  | σ x | 3.55 | 3.24 | 6.79 | 8 2 | 8.2 |
| Model "S" |  |  |  |  |  |  |
| Longitudinal moment (500,000 in-lb) | σ φ | … | … | … | 4.8 | 4.8 |
|  | σ x | … | … | … | 9.7 | 6.9(2) |
| Transverse moment (500,000 in-lb) | σ φ | … | … | … | 9.8 60° axis | 8.15(3) |
|  | σ x | … | .. | … | 3.3 60° axis | 3.3 |
| Notes: 10) Based on S.C.F. of 1.30 11) Based on local SCF of 1.40. 12) Based on local SCF of 1.20. 13) Based on local SCF of 1.15. |  |  |  |  |  |  |



### Table A-4 – Comparison of Calculated and Measured Stresses in Thin Walled Cylindrical Vessel (IITRI Model C-1) with External Loads on Nozzles
**PDF Page 163**

| Load and Stress Components | Calculated stresses, ksi |  |  | Measured Stresses, ksi |  |
| :--- | :--- | :--- | :--- | :--- | :--- |
|  | Membrane | Bending | Total | Gross | Adjusted |
| Longitudinal moment (18,000 in-lb) |  |  |  |  |  |
| Longitudinal Axis σ φ | 5.74 | 0.72 | 6.46 | 11.8 | 11.8 |
| Longitudinal Axis σ x | 4.02 | 0.93 | 4.95 | 12.6 | 10.3(1) |
| Maximum(2) σ n | … | … | … | 15.9 | 15.9 |
| Maximum(2) σ t | … | … | … | 29.5 | 24.15 |
| Transverse moment (3,000 in-lb) |  |  |  |  |  |
| Transverse axis σ φ | 0.62 | 6.54 | 7.16 | 23.85 | 19.5 (1) |
| Transverse axis σ x | 3.97 | 2.30 | 6.27 | 10.5 | 10.5 |
| Radial Load (1,000 lb pull) |  |  |  |  |  |
| Longitudinal axis σ φ | 4.16 | 1.44 | 5.60 | 2.7 | 2.7 |
| Longitudinal axis σ x | 1.12 | 3.66 | 4.78 | 3.0 | 2.46(1) |
| Transverse axis σ φ | 1.12 | 3.66 | 4.78 | 26.1 | 21.4 (1) |
| Transverse axis σ x | 4.16 | 1.44 | 5.60 | 15.3 | 15.3 |
| Notes: 14) Based on local S.C.F. of 1.22. 15) Maximum stresses were located 60-70° off the longitudinal axis. These stresses are derived from strain gage measurements oriented radially and circumferentially with respect to the nozzle (or the hole in the shell). The maximum principal stress at this location may be somewhat higher (but by definition cannot be lower) than indicated by these measurements. σ designates the stress normal to a plane at this n section (= circumferential with respect to the nozzle) and σ , the stress in the plane of such a section t (axial with respect to the nozzle). Therefore, on the longitudinal axis, σ =σ and σ =σ ; on the n φ t x transverse axis, σ =σ and σ =σ n x t φ |  |  |  |  |  |



### Table A-5 – Comparison of Measured Stresses on Opposite Sides of IITRI Cylindrical Vessel Model C-1
**PDF Page 164**

| Stress Components | Maximum Measured Stresses, ksi |  |  |  |
| :--- | :--- | :--- | :--- | :--- |
|  | 0° | 180° | 90° | 270° |
| Longitudinal moment (18,000 in-lb) |  |  |  |  |
| σ φ | 11.65 | 12.0 | … | … |
| σ x | 12.3 | 12.9 | … | … |
| Transverse moment (3,000 in-lb) |  |  |  |  |
| σ φ | … | … | 24.35 | 23.35 |
| σ x | … | … | 11.1 | 9.95 |
| Radial Load (1,000 lb pull) |  |  |  |  |
| σ φ | 2.75 | 2.65 | 27.35 | 24.9 |
| σ x | 3.15 | 2.9 | 15.65 | 14.85 |

| Stress Components | Calculated Stresses, ksi |  |  | Measured(2) Stresses, ksi |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Membrane | Bending | Total | Membrane | Bending | Total |
| Transverse Axis |  |  |  |  |  |  |
| σ φ | 5.74 | 26.4 | 32.14 | 3.71 | 27.6 | 31.3 |
| σ x | 6.7 | 17.9 | 24.6 | 5.3 | 16.8 | 22.1 |
| Longitudinal Axis |  |  |  |  |  |  |
| σ φ | 5.74 | 26.4 | 32.14 | 4.95 | 10.4 | 15.35 |
| σ x | 6.7 | 17.9 | 24.6 | 3.18 | 13.6 | 16.78 |
| Notes: 16) Model Parameters: D /T =78;d /D =0.126;t T =0.448;(d /D ) D /T =1.14;γ=39.0; β=0.119 m i i m m m 17) Tabulated stresses at edge of attachment were obtained by extrapolation of measured values from strain gages located 11/16 in. away (outside the edge of weld fillet). |  |  |  |  |  |  |



### Table A-6 – Summary of Calculated and Measured Stresses for Cornell Attachment No. 2 Under Radial Load (Pull) of 17,700 Lb
**PDF Page 164**

| Stress Components | Maximum Measured Stresses, ksi |  |  |  |
| :--- | :--- | :--- | :--- | :--- |
|  | 0° | 180° | 90° | 270° |
| Longitudinal moment (18,000 in-lb) |  |  |  |  |
| σ φ | 11.65 | 12.0 | … | … |
| σ x | 12.3 | 12.9 | … | … |
| Transverse moment (3,000 in-lb) |  |  |  |  |
| σ φ | … | … | 24.35 | 23.35 |
| σ x | … | … | 11.1 | 9.95 |
| Radial Load (1,000 lb pull) |  |  |  |  |
| σ φ | 2.75 | 2.65 | 27.35 | 24.9 |
| σ x | 3.15 | 2.9 | 15.65 | 14.85 |

| Stress Components | Calculated Stresses, ksi |  |  | Measured(2) Stresses, ksi |  |  |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
|  | Membrane | Bending | Total | Membrane | Bending | Total |
| Transverse Axis |  |  |  |  |  |  |
| σ φ | 5.74 | 26.4 | 32.14 | 3.71 | 27.6 | 31.3 |
| σ x | 6.7 | 17.9 | 24.6 | 5.3 | 16.8 | 22.1 |
| Longitudinal Axis |  |  |  |  |  |  |
| σ φ | 5.74 | 26.4 | 32.14 | 4.95 | 10.4 | 15.35 |
| σ x | 6.7 | 17.9 | 24.6 | 3.18 | 13.6 | 16.78 |
| Notes: 16) Model Parameters: D /T =78;d /D =0.126;t T =0.448;(d /D ) D /T =1.14;γ=39.0; β=0.119 m i i m m m 17) Tabulated stresses at edge of attachment were obtained by extrapolation of measured values from strain gages located 11/16 in. away (outside the edge of weld fillet). |  |  |  |  |  |  |



### Appendix A Figures & Benchmark Charts
- **Figure A-1 (Page 165):** Relation of Spherical Test Models to Bijlaard's 'applicability limits'
- **Figure A-2 (Page 166):** Measured Stresses in Fillet of IITRI Model C-1 Tested Under Internal Pressure (30 psi)
- **Figure A-3 (Page 167):** Measured Stresses in Outside Fillet of IITRI Cylindrical Shell Model C-1 Under Longitudinal Moment (18,000 in-lb)
- **Figure A-4 (Page 168):** Measured Stresses in Outside Fillet of IITRI Cylindrical Shell Model C-1 Under Transverse Moment (3,000 in-lb)
- **Figure A-5 (Page 169):** Measured Stresses in Outside Fillet of IITRI Cylindrical Shell Model C-1 Under a Radial Load (1,000 lb pull)
- **Figure A-6 (Page 170):** Development of Critically Stressed Membrane Area at Edge of Hole in Cylindrical Shell Under Internal Pressure
- **Figure A-7 (Page 171):** Circumferential Stress Distribution Around Nozzle Junction
- **Figure A-8 (Page 172):** Moment Distribution in Cylindrical Shell Due to Internal Pressure
- **Figure A-9 (Page 173):** Membrane Force Distribution Around Attachment Junction
- **Figure A-10 (Page 174):** Moment Variations Along Longitudinal and Transverse Meridians
- **Figure A-11 (Page 175):** Moment Distribution Comparisons (Theoretical vs Experimental)
- **Figure A-12 (Page 176):** Membrane Force Comparisons for Cylindrical Vessel Models
- **Figure A-13 (Page 177):** Moment Curves for Thin-Walled Shell Geometries
- **Figure A-14 (Page 178):** Location of Maximum Stress in Cylinder Under Internal Pressure (Eringen's and Van Dyke's Solutions)
- **Figure A-15 (Page 179):** Moment Distribution Across Varying Diameter Ratios d/D
- **Figure A-16 (Page 180):** Bending Moment Variation Along Cylinder Circumference
- **Figure A-17 (Page 181):** Bending Moment Correlation Curves for Modified Bijlaard Model
- **Figure A-18 (Page 182):** Bending Moment Comparison Between Bijlaard and Modified Empirical Curves


---

## Section 10 (Appendix B): Stress Concentration Factors for Stresses Due to External Loads
Appendix B defines stress concentration factors ($K_n, K_b$) at nozzle-to-shell fillet junctures and pipe transitions.

### Appendix B Governing Equations
#### 1. Stepped Bar / Shoulder Concentration Factors (Heywood & Peterson Formulations):
- **Tension Case (Eq. B.53):**
  $$K_T = 1 + \left[ \frac{1}{\frac{r}{h} \cdot 5.6} \right]^{0.65}$$
- **Bending Case (Eq. B.54):**
  $$K_B = 1 + \left[ \frac{1}{\frac{r}{h} \cdot 10.74} \right]^{0.85}$$
- **Alternate Conservative Bending Formula (Eq. B.56):**
  $$K_B = 1 + \left[ \frac{1}{\frac{r}{h} \cdot 9.4} \right]^{0.80}$$

#### 2. Tapered / Inclined Shoulder Effect (Eq. B.57, B.58):
Where $\theta$ is the angle between the tapered shoulder and the square shoulder:
- If $r < (t_n - t)$:
  $$\frac{K^* - 1}{K_0 - 1} = 1 - \left( \frac{\theta}{90^\circ} \right)^{1 + \frac{r}{2.4(t_n - t)}}$$
- If $r \ge (t_n - t)$:
  $$\frac{K^* - 1}{K_0 - 1} = 1 - \left( \frac{\theta}{90^\circ} \right)^{\alpha}$$
  where $\alpha = 1 - \frac{1 - \sin\theta}{\frac{r}{t_n - t}}$

#### 3. Combined Peak Stress Formulation at Fillet Juncture (Eq. B.61):
$$\sigma_i = K_n \left( \frac{N_i}{T} \right) \pm K_b \left( \frac{6 M_i}{T^2} \right)$$
Where $K_n$ is obtained from Figure B-2 for tension, and $K_b$ from Figure B-2 for bending, using the fillet radius-to-thickness ratio $r_A / T$.

### Appendix B Figures
- **Figure B-1 (Page 187):** Stepped Bar Geometry and Dimensions (H, h, r, theta)
- **Figure B-2 (Page 188):** Stress Concentration Factors K_n and K_b for D/d >> 1 vs r/h
- **Figure B-3 (Page 189):** Effect of Tapered Shoulder: (K* - 1)/(K0 - 1) vs Angle theta
- **Figure B-4 (Page 190):** Nozzle Configuration with Fillet Radii r_A (Shell Juncture) and r_B (Pipe Juncture)
- **Figure B-5 (Page 191):** Special Tapered Nozzle Configuration Details
- **Figure B-6 (Page 192):** Structural Attachment Configuration and Critical Points A and C