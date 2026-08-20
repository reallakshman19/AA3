# ASME Section VIII Division 3 Article KD-2 — Elastic Stress Field & Stress-Intensity Authority Package

**Controlled Standard Reference:** ASME Boiler & Pressure Vessel Code, Section VIII, Division 3: *Alternative Rules for Construction of High Pressure Vessels*, Part KD, Article KD-2: *Basic Design Requirements*.  
**Controlled Source PDF:** `ilide.info-asme-sec-viii-d3-art-kd-2-pr_a7181b037b53d68c9b5f980d0bacce40.pdf`  
**Controlled Source SHA-256:** `36259fabfb83e451e02779dbe82b3885b1a7e506d47991c5297144f3f50a15a7`  
**Governing Paragraphs:** KD-200, KD-210, KD-220, KD-230, KD-240, KD-250, KD-251.1, KD-260.

---

## 1. Geometry & Coordinate System Definitions

### 1.1 Cylindrical Shell Geometry Parameters
* **Outside Diameter:** $D_O$ (Outside Radius $R_O = D_O / 2$)
* **Inside Diameter (Bore):** $D_I$ (Inside Radius $R_I = D_I / 2$)
* **Wall Thickness:** $T = (D_O - D_I) / 2 = R_O - R_I$
* **Corroded Inside Diameter:** $D_{I,\text{corroded}} = D_I + 2 c_{\text{corr}}$
* **Diameter Ratio ($Y$):**
  $$Y = \frac{D_O}{D_I}$$
* **Local Diameter Ratio at Arbitrary Diameter $D$ ($Z$):**
  $$Z = \frac{D_O}{D} \quad (1.0 \le Z \le Y)$$
  * At outside surface ($D = D_O$): $Z = 1.0$
  * At bore / inside surface ($D = D_I$): $Z = Y$

### 1.2 Coordinate System & Stress Tensor Orientation
Triaxial orthogonal cylindrical coordinates $(r, \theta, z)$:
* **Radial Direction ($r$):** Normal to pipe wall ($\sigma_r$)
* **Tangential / Hoop Direction ($\theta$ or $t$):** Circumferential around circumference ($\sigma_t$ or $\sigma_\theta$)
* **Longitudinal / Axial Direction ($z$ or $l$):** Along pipe centerline ($\sigma_l$ or $\sigma_z$)

---

## 2. Thick-Walled Monobloc Elastic Stress Equations (Paragraph KD-260)

For a monobloc hollow circular cylinder of uniform wall thickness remote from discontinuities and without initial residual stresses, the elastic stress components under internal pressure $P$ are:

### 2.1 Tangential (Hoop) Stress ($\sigma_t$):
$$\sigma_t(D) = \frac{P}{Y^2 - 1} \left( 1 + Z^2 \right) = \frac{P}{Y^2 - 1} \left( 1 + \frac{D_O^2}{D^2} \right) \quad \text{[KD-260 Eq. 1]}$$

### 2.2 Radial Stress ($\sigma_r$):
$$\sigma_r(D) = \frac{P}{Y^2 - 1} \left( 1 - Z^2 \right) = \frac{P}{Y^2 - 1} \left( 1 - \frac{D_O^2}{D^2} \right) \quad \text{[KD-260 Eq. 2]}$$

### 2.3 Longitudinal (Axial) Stress ($\sigma_l$) — Closed End Condition:
$$\sigma_l = \frac{P}{Y^2 - 1} = \frac{P}{\frac{D_O^2 - D_I^2}{D_I^2}} = \frac{P \cdot D_I^2}{D_O^2 - D_I^2} \quad \text{[KD-260 Eq. 3]}$$

---

## 3. Stress State Evaluation Across the Wall

### 3.1 Bore Surface ($D = D_I, \; Z = Y$) — Peak Stress Location:
$$\sigma_t(D_I) = +P \left( \frac{Y^2 + 1}{Y^2 - 1} \right) \quad \text{(Maximum Tensile Stress)}$$
$$\sigma_r(D_I) = -P \quad \text{(Compressive Pressure Normal to Bore)}$$
$$\sigma_l(D_I) = +\frac{P}{Y^2 - 1} \quad \text{(Tensile Axial Stress)}$$

#### Principal Stress Ordering at Bore:
$$\sigma_1 = \sigma_t = +P \left( \frac{Y^2 + 1}{Y^2 - 1} \right)$$
$$\sigma_2 = \sigma_l = +\frac{P}{Y^2 - 1}$$
$$\sigma_3 = \sigma_r = -P$$

#### Principal Stress Differences at Bore:
$$S_{12} = \sigma_1 - \sigma_2 = P \left( \frac{Y^2 + 1}{Y^2 - 1} \right) - \frac{P}{Y^2 - 1} = P$$
$$S_{23} = \sigma_2 - \sigma_3 = \frac{P}{Y^2 - 1} - (-P) = P \left( \frac{Y^2}{Y^2 - 1} \right)$$
$$S_{31} = \sigma_3 - \sigma_1 = -P - P \left( \frac{Y^2 + 1}{Y^2 - 1} \right) = -P \left( \frac{2Y^2}{Y^2 - 1} \right)$$

#### Maximum Stress Intensity at Bore ($S$):
$$S = \max(|S_{12}|, |S_{23}|, |S_{31}|) = \sigma_1 - \sigma_3 = \sigma_t - \sigma_r = P \left( \frac{2Y^2}{Y^2 - 1} \right) \quad \text{[KD-260 Eq. 4]}$$

---

### 3.2 Outside Surface ($D = D_O, \; Z = 1.0$):
$$\sigma_t(D_O) = +\frac{2P}{Y^2 - 1}$$
$$\sigma_r(D_O) = 0$$
$$\sigma_l(D_O) = +\frac{P}{Y^2 - 1}$$

#### Principal Stress Differences at OD:
$$S_{12} = \sigma_t - \sigma_l = \frac{P}{Y^2 - 1}$$
$$S_{23} = \sigma_l - \sigma_r = \frac{P}{Y^2 - 1}$$
$$S_{31} = \sigma_r - \sigma_t = -\frac{2P}{Y^2 - 1}$$
$$S(D_O) = \sigma_t - \sigma_r = \frac{2P}{Y^2 - 1}$$

---

## 4. Static Plastic Collapse Limit (Paragraph KD-251.1)

To ensure adequate safety margin against gross plastic collapse, the design pressure $P_D$ of a monobloc cylindrical shell remote from discontinuities shall satisfy:
$$P_D \le \frac{1}{\sqrt{3}} S_y \cdot \ln(Y) = \frac{S_y \cdot \ln(Y)}{1.732} \quad \text{[KD-251.1]}$$
where $S_y$ is the yield strength at design temperature from Section II Part D / Table Y-1.

---

## 5. Complete Stress-State Handoff to Article KD-3

For any operational transient state $k$ (e.g. State A, State B), KD-2 exports the full 3D stress state to KD-3:

```text
TRANSIENT STATE k EXPORT PACKAGE:
- Pressure: P_k
- Radial Coordinate: r (e.g. r = R_I for bore, r = R_O for OD)
- Stress Tensor: [ sigma_r,k,  sigma_t,k,  sigma_l,k,  tau_rt,k=0,  tau_tz,k=0,  tau_zr,k=0 ]
- Principal Stresses:
    sigma_1,k = sigma_t,k
    sigma_2,k = sigma_l,k
    sigma_3,k = sigma_r,k
- Normal Stresses on Principal Shear Planes:
    sigma_n12,k = 0.5 * (sigma_1,k + sigma_2,k)
    sigma_n23,k = 0.5 * (sigma_2,k + sigma_3,k)
    sigma_n31,k = 0.5 * (sigma_3,k + sigma_1,k)
- Principal Stress Differences:
    S_12,k = sigma_1,k - sigma_2,k
    S_23,k = sigma_2,k - sigma_3,k
    S_31,k = sigma_3,k - sigma_1,k
```
