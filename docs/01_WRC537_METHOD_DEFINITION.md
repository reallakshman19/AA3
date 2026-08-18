# 01 — WRC 537 Method Definition

> **EXTRACTION STATUS: NOT_READY_FOR_IMPLEMENTATION**
>
> This document is a source-qualified extraction framework populated from publicly accessible copies of WRC Bulletin 537 (Studocu-hosted OCR of the bulletin content, CEI engineering practice guide citing specific page/equation references, official WRC errata) and secondary engineering sources. The licensed WRC 537 PDF was **not** available to the extractor. Every datum that could not be verified against the primary source is marked **UNRESOLVED**. Page numbers cited from the CEI guide refer to the **3rd Edition (March 2022, ISSN 2372-1057)**. Page numbers from the Studocu/OCR copy correspond to the **1st Edition (December 2010) / 2013 reprint (188/193 pages, ISSN 0043-2326)**. **These editions may have different pagination.**

---

## 4.1 Exact Method Identity

| Field | Value | Source Locator |
|---|---|---|
| Method title | Precision Equations and Enhanced Diagrams for Local Stresses in Spherical and Cylindrical Shells Due to External Loadings for Implementation of WRC Bulletin 107 | Bulletin cover/title page [Studocu:33] |
| Bulletin number | WRC Bulletin 537 | Bulletin cover [Studocu:33] |
| Edition (current known) | 3rd Edition, March 2022 (per CEI guide citations) | CEI guide footnotes citing "3rd ed., March 2022, ISSN 2372-1057" [web:34] |
| Edition (original) | 1st Edition, December 2010 (ISBN 1-58145-544-5, 188 pages) | Google Sites reference [web:30] |
| Earlier printing observed | Copyright © 2013 copy on Studocu (193 pages, ISSN 0043-2326) | Studocu-hosted copy [Studocu:33] |
| Errata | Three errata issued: April 2011, June 27 2011, August 19 2011 (3rd errata cumulative) | WRC errata document [Studocu:33][web:40] |
| Original WRC 107 authors | K.R. Wichman, A.G. Hopper, J.L. Mershon | Bulletin title page [Studocu:33] |
| Implementation team | D.A. Osage, M.E. Buchheim, D.E. Amos, T.C. Shaughnessy (née Chiasson), D.A. Samodell, M. Straub — The Equity Engineering Group, Inc. | Bulletin title page [Studocu:33] |
| Executive Director (WRC) | Dr. Martin Prager | Bulletin foreword [Studocu:33] |
| Publisher | Welding Research Council, 20600 Chagrin Blvd, Suite 1200, Shaker Heights, OH 44122 | Bulletin [Studocu:33] |
| ISSN (original) | 0043-2326 | Bulletin [Studocu:33] |
| ISSN (3rd ed.) | 2372-1057 | CEI guide [web:34] |
| Library of Congress Catalog Number | 85-647116 | Bulletin [Studocu:33] |
| Superseded editions | WRC Bulletin 107 (August 1965 original; March 1979 revision; October 2002 editorial update). WRC states: "WRC will no longer deliver WRC 107 when requested for purchase." | Bulletin foreword [Studocu:33] |
| Relationship to WRC 107 | "It is not an update or a revision of 107. It is the 2010 printing of WRC 107." WRC 537 provides "exactly the same content in a more useful and clear format." | Bulletin foreword [Studocu:33][web:30] |
| Relationship to WRC 297 | Separate bulletin. WRC 297 supplements WRC 107/537 for cylinder-on-cylinder connections and provides nozzle stresses. WRC 107 and 297 "should be considered (and purchased) as an integral set." | WRC 107 foreword (reprinted in 537) [Studocu:33] |
| Self-contained for implementation? | **PARTIALLY SELF-CONTAINED.** WRC 537 contains all curve-fit equations and coefficients (a–j) for shell stress calculation. It does NOT include: (a) nozzle/branch stresses (requires WRC 297), (b) pressure stresses (requires WRC 368 or ASME VIII Div 2 §4.5), (c) stress acceptability criteria (designer/code responsibility). | Bulletin foreword and text [Studocu:33][web:31] |
| Code recognition | Explicitly listed in ASME Section VIII, Division 2, Part 4.5.12 as an approved method for assessing nozzle loadings | CEI guide [web:34][web:6] |

### Missing without secondary publications

1. **Nozzle stresses** — WRC 537 computes shell stresses only. For nozzle neck stresses, WRC 297 is required.
2. **Pressure stresses** — Internal pressure is explicitly excluded. WRC 368 or ASME VIII Div 2 §4.5 rules must be applied separately and superposed.
3. **Stress concentration factors (Kn, Kb)** — Provided in Appendix B but derived from Peterson (1953) and Heywood (1952) external references, not original WRC analysis.

---

## 5. Geometry Definitions

> **Source caveat:** The nomenclature below is transcribed from the Studocu-hosted OCR copy of the bulletin [Studocu:33] and the CEI guide [web:34]. OCR errors may exist. All definitions should be verified against the licensed PDF.

### 5.1 General Nomenclature (Bulletin §4.1)

| Symbol | Source Notation | Plain-Language Meaning | Physical Location | Radius/Diameter Convention | Inside/Mean/Outside | Thickness Definition | Units/Dimension | Positive Requirement | Source Locator |
|---|---|---|---|---|---|---|---|---|---|
| σᵢ | σᵢ | Normal stress in the i-direction on the surface of the shell | Shell surface at attachment juncture | N/A | Both inside and outside | N/A | Stress (force/area) | Tensile (+) | §4.1, Nomenclature, p.1 (Studocu) [Studocu:33] |
| τᵢⱼ | τᵢⱼ | Shear stress on the i-face in the j-direction | Shell surface at attachment juncture | N/A | N/A | N/A | Stress (force/area) | N/A | §4.1 [Studocu:33] |
| S | S | Stress intensity = twice maximum shear stress | Shell surface | N/A | N/A | N/A | Stress (force/area) | N/A | §4.1 [Studocu:33] |
| Nᵢ | Nᵢ | Membrane force per unit length in the i-direction | Shell wall at juncture | N/A | Through-wall (membrane) | N/A | Force/length | N/A | §4.1 [Studocu:33] |
| Mᵢ | Mᵢ | Bending moment per unit length in the i-direction | Shell wall at juncture | N/A | Through-wall (bending) | N/A | Moment/length | N/A | §4.1 [Studocu:33] |
| Kₙ | Kₙ | Membrane stress concentration factor (pure tension/compression) | Fillet/transition region | N/A | N/A | N/A | Dimensionless | ≥1 | §4.1; Appendix B [Studocu:33] |
| K_b | K_b | Bending stress concentration factor | Fillet/transition region | N/A | N/A | N/A | Dimensionless | ≥1 | §4.1; Appendix B [Studocu:33] |
| θ | θ | Angle around attachment, degrees | Around attachment perimeter | N/A | N/A | N/A | Degrees | 0° at reference axis | §4.1; Figs 1 & 2 [Studocu:33] |
| E | E | Modulus of elasticity | Shell material | N/A | N/A | N/A | Stress | N/A | §4.1 [Studocu:33] |

### 5.2 Spherical Shell Nomenclature (Bulletin §3.2, §4.2)

| Symbol | Meaning | Exact Geometric Definition | Dimension | Source Locator |
|---|---|---|---|---|
| R_m | Mean radius of spherical shell | **CONFIRMED: R_m = R_i + T/2 = (R_o + R_i)/2** (mid-surface radius). CEI guide example: hemisphere ID=100, T=2 → R_m=51, confirming R_m = inside radius + T/2. | Length | §3.2, §4.2 [Studocu:33]; CEI guide: "Section 1.2, p.2" [web:34] |
| T | Thickness of spherical shell | **UNRESOLVED — nominal vs corroded not defined by bulletin.** CEI guide notes: "Typically, it is considered conservative to use dimensions after corrosion allowances, forming allowances, and under tolerances have been removed." | Length | §4.2 [Studocu:33] |
| r₀ | Outside radius of cylindrical attachment | Outside radius of nozzle/attachment at shell juncture | Length | §4.2 [Studocu:33] |
| r_m | Mean radius of hollow cylindrical attachment | **CONFIRMED: r_m = r_i + t/2 = (r_o + r_i)/2** (mid-surface radius). CEI guide example: nozzle ID=10, t=0.75 → r_m=5.375, confirming r_m = inside radius + t/2. | Length | §4.2 [Studocu:33] |
| t | Thickness of hollow cylindrical attachment (nozzle) | Nozzle wall thickness | Length | §4.2 [Studocu:33] |
| d_i, d_m | Inside/mean diameter of nozzle | 2×(r₀−t), 2×r_m respectively | Length | §4.1 [Studocu:33] |
| D_i, D_m | Inside/mean diameter of shell | 2×(R_m−T/2), 2×R_m respectively | Length | §4.1 [Studocu:33] |
| N_φ | Membrane force in shell wall — radial direction | Force per unit length | Force/length | §4.2; Fig 1 [Studocu:33] |
| N_θ | Membrane force in shell wall — circumferential direction | Force per unit length | Force/length | §4.2; Fig 1 [Studocu:33] |
| M_φ | Bending moment in shell wall — radial direction | Moment per unit length | Moment/length | §4.2; Fig 1 [Studocu:33] |
| M_θ | Bending moment in shell wall — circumferential direction | Moment per unit length | Moment/length | §4.2; Fig 1 [Studocu:33] |
| σ_φ | Normal stress — radial direction | At shell surface | Stress | §4.2; Fig 1 [Studocu:33] |
| σ_θ | Normal stress — circumferential direction | At shell surface | Stress | §4.2; Fig 1 [Studocu:33] |

### 5.3 Cylindrical Shell Nomenclature (Bulletin §4.3)

| Symbol | Meaning | Exact Geometric Definition | Dimension | Source Locator |
|---|---|---|---|---|
| R_c | Mean radius of cylindrical shell | **UNRESOLVED — exact definition not OCR-readable** | Length | §4.3 [Studocu:33] |
| L | Length of cylindrical shell | Shell length | Length | §4.3 [Studocu:33] |
| r₀ | Outside radius of cylindrical attachment | Attachment outside radius | Length | §4.3 [Studocu:33] |
| C₁ | Half length of rectangular loading — circumferential direction | Half-width of rectangular attachment footprint (circumferential) | Length | §4.3 [Studocu:33] |
| C₂ | Half length of rectangular loading — longitudinal direction | Half-length of rectangular attachment footprint (longitudinal) | Length | §4.3 [Studocu:33] |
| T | Wall thickness of cylindrical shell | Shell wall thickness | Length | §4.3 [Studocu:33] |
| x | Coordinate in longitudinal direction of shell | Longitudinal axis | Length | §4.3 [Studocu:33] |
| φ | Coordinate in circumferential direction of shell | Circumferential angle | Degrees | §4.3 [Studocu:33] |
| θ | Cylindrical coordinate in circumferential direction | Same as φ? **UNRESOLVED** | Degrees | §4.3 [Studocu:33] |
| N_x | Membrane forces in shell wall — longitudinal direction | Force per unit length | Force/length | §4.3 [Studocu:33] |
| N_φ | Membrane forces in shell wall — circumferential direction | Force per unit length | Force/length | §4.3 [Studocu:33] |
| M_x | Bending moments in shell wall — longitudinal direction | Moment per unit length | Moment/length | §4.3 [Studocu:33] |
| M_φ | Bending moments in shell wall — circumferential direction | Moment per unit length | Moment/length | §4.3 [Studocu:33] |
| σ_x | Normal stress — longitudinal direction | At shell surface | Stress | §4.3 [Studocu:33] |
| σ_φ | Normal stress — circumferential direction | At shell surface | Stress | §4.3 [Studocu:33] |

---

## 6. Dimensionless Parameters

### 6.1 Spherical Shell Parameters

```json
{
  "parameterId": "SPHERE_U",
  "sourceSymbol": "U",
  "equation": "U = r0 / sqrt(Rm * T)",
  "inputs": ["r0", "Rm", "T"],
  "minimum": null,
  "maximum": null,
  "minimumInclusive": null,
  "maximumInclusive": null,
  "purpose": "Shell parameter — ratio of attachment outside radius to characteristic shell length sqrt(Rm*T)",
  "source": {
    "document": "WRC Bulletin 537",
    "edition": "3rd ed., March 2022 (per CEI guide citation)",
    "section": "3.2.1",
    "equation": "Eq. 2",
    "page": "6 (per CEI guide)",
    "note": "OCR from Studocu shows Eq. (2) at section 3.2.1. For square attachment: U ≈ 0.875*r0/sqrt(Rm*T) [Eq. 3]"
  }
}
```

```json
{
  "parameterId": "SPHERE_GAMMA",
  "sourceSymbol": "γ (gamma)",
  "equation": "γ = r_m / t",
  "inputs": ["r_m", "t"],
  "minimum": 5,
  "maximum": 50,
  "minimumInclusive": "UNRESOLVED",
  "maximumInclusive": "UNRESOLVED",
  "purpose": "Nozzle slenderness ratio for hollow attachments",
  "source": {
    "document": "WRC Bulletin 537",
    "section": "3.2.2.2",
    "equation": "Eq. 4",
    "page": "7 (per CEI guide)",
    "note": "CEI guide example: r_m=5.375, t=0.75 gives γ=7.1667. Discrete tabulated values: γ = 5, 15, 50."
  }
}
```

```json
{
  "parameterId": "SPHERE_RHO",
  "sourceSymbol": "ρ (rho)",
  "equation": "ρ = T / t",
  "inputs": ["T", "t"],
  "minimum": 0.25,
  "maximum": 10,
  "minimumInclusive": "UNRESOLVED",
  "maximumInclusive": "UNRESOLVED",
  "purpose": "Attachment parameter for hollow cylindrical attachments (nozzles). Range depends on γ: for γ=5, ρ∈[0.25,4]; for γ=15, ρ∈[1,10]; for γ=50, ρ∈[4,10]",
  "source": {
    "document": "WRC Bulletin 537",
    "section": "3.2.2.2",
    "equation": "Eq. 4",
    "page": "7 (per CEI guide)",
    "note": "CEI guide example: T=2, t=0.75 gives ρ=2.6667. Tabulated (γ,ρ) pairs: (5,0.25),(5,1),(5,2),(5,4),(15,1),(15,2),(15,4),(15,10),(50,4),(50,10)"
  }
}
```

### 6.2 Cylindrical Shell Parameters

```json
{
  "parameterId": "CYL_LAMBDA",
  "sourceSymbol": "λ (lambda)",
  "equation": "UNRESOLVED — exact equation not readable from OCR. Listed in §4.2.1 as 'Shell Parameter (λ)'",
  "inputs": ["UNRESOLVED"],
  "minimum": null,
  "maximum": null,
  "purpose": "Shell parameter for cylindrical shells",
  "source": {
    "document": "WRC Bulletin 537",
    "section": "4.2.1",
    "equation": "UNRESOLVED",
    "page": "UNRESOLVED"
  }
}
```

```json
{
  "parameterId": "CYL_DELTA",
  "sourceSymbol": "δ (delta)",
  "equation": "UNRESOLVED — listed in §4.2.2 as 'Attachment Parameter (δ)'",
  "inputs": ["UNRESOLVED"],
  "minimum": null,
  "maximum": null,
  "purpose": "Attachment parameter for cylindrical shells",
  "source": {
    "document": "WRC Bulletin 537",
    "section": "4.2.2",
    "equation": "UNRESOLVED",
    "page": "UNRESOLVED"
  }
}
```

### 6.3 WRC Source Parameter → LAFEA Canonical Parameter Mapping

| WRC Source Parameter | LAFEA Canonical Parameter | Mapping Status |
|---|---|---|
| U (spherical) | UNRESOLVED | PENDING_LAFEA_DEFINITION |
| γ (spherical) | UNRESOLVED | PENDING_LAFEA_DEFINITION |
| ρ (spherical) | UNRESOLVED | PENDING_LAFEA_DEFINITION |
| λ (cylindrical) | UNRESOLVED | PENDING_LAFEA_DEFINITION |
| δ (cylindrical) | UNRESOLVED | PENDING_LAFEA_DEFINITION |

---

## 7. Physical Applicability

### Spherical Shells

```json
{
  "conditionId": "SPHERE_HOST_SHELL",
  "classification": "SUPPORTED",
  "allowedValues": ["spherical", "hemispherical heads", "ellipsoidal heads (approximate)"],
  "explanation": "Method applicable to spherical shells. Ellipsoidal heads may be analyzed with Rm taken as mean shell radius at nozzle juncture (§3.5.3). Industry practice: Rm = 0.9D for 2:1 ellipsoidal heads.",
  "source": {"section": "3.5.3", "document": "WRC Bulletin 537", "note": "CEI guide notes §3.5.3 is 'vague'"}
}
```

```json
{
  "conditionId": "SPHERE_ATTACHMENT_ROUND_HOLLOW",
  "classification": "SUPPORTED",
  "allowedValues": ["hollow cylindrical nozzle"],
  "explanation": "Nozzles (hollow cylindrical attachments) on spherical shells are supported. Requires parameters γ and ρ in addition to U.",
  "source": {"section": "3.2.2.2", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "SPHERE_ATTACHMENT_ROUND_SOLID",
  "classification": "SUPPORTED",
  "allowedValues": ["rigid plug / solid cylindrical attachment"],
  "explanation": "Rigid (solid) attachments supported. No attachment parameter required (γ and ρ not needed).",
  "source": {"section": "3.2.2.1", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "SPHERE_ATTACHMENT_SQUARE_HOLLOW",
  "classification": "SUPPORTED",
  "allowedValues": ["hollow square attachment (box beam)"],
  "explanation": "Hollow square attachments supported with approximate parameters.",
  "source": {"section": "3.2.2.3", "equation": "Eq. 5", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "SPHERE_ATTACHMENT_SQUARE_SOLID",
  "classification": "SUPPORTED",
  "allowedValues": ["rigid square attachment"],
  "explanation": "Rigid square attachments supported. U approximated as 0.875*r0/sqrt(Rm*T).",
  "source": {"section": "3.2.1", "equation": "Eq. 3", "document": "WRC Bulletin 537"}
}
```

### Cylindrical Shells

```json
{
  "conditionId": "CYL_HOST_SHELL",
  "classification": "SUPPORTED",
  "allowedValues": ["cylindrical shells"],
  "explanation": "Method applicable to cylindrical shells with external loadings.",
  "source": {"section": "4", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "CYL_ATTACHMENT_SOLID_ROUND",
  "classification": "SUPPORTED",
  "allowedValues": ["rigid cylindrical attachment"],
  "explanation": "WRC 107/537 drops the solid/hollow distinction for attachments to cylindrical shells.",
  "source": {"section": "4", "document": "WRC Bulletin 537", "note": "Per secondary source [web:31]"}
}
```

```json
{
  "conditionId": "CYL_ATTACHMENT_RECTANGULAR",
  "classification": "SUPPORTED",
  "allowedValues": ["rectangular attachment"],
  "explanation": "Rectangular attachments on cylindrical shells supported. Uses C1, C2 half-dimensions.",
  "source": {"section": "4.3", "document": "WRC Bulletin 537"}
}
```

### General Conditions

```json
{
  "conditionId": "INTERSECTION_ANGLE",
  "classification": "SUPPORTED",
  "allowedValues": ["radial (perpendicular) only"],
  "explanation": "Both bulletins assume the nozzle/attachment axis is normal (perpendicular) to the vessel.",
  "source": {"document": "WRC Bulletin 537", "note": "Secondary source [web:31]"}
}
```

```json
{
  "conditionId": "SHELL_CURVATURE",
  "classification": "CONDITIONALLY_SUPPORTED",
  "allowedValues": ["thin shells"],
  "explanation": "Based on shallow shell theory (Bijlaard). Applicable to relatively small attachments on large shells.",
  "source": {"section": "3.5", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "NOZZLE_STRESS",
  "classification": "NOT_SUPPORTED",
  "allowedValues": [],
  "explanation": "WRC 537 computes shell stresses only, not nozzle stresses. WRC 297 required for nozzle stresses.",
  "source": {"section": "3.5.1", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "PRESSURE_STRESS",
  "classification": "NOT_SUPPORTED",
  "allowedValues": [],
  "explanation": "Evaluation of stresses resulting from internal pressure has been omitted from the WRC method.",
  "source": {"section": "3.3.5 and 4.3.6", "document": "WRC Bulletin 537"}
}
```

```json
{
  "conditionId": "FATIGUE",
  "classification": "NOT_SUPPORTED",
  "allowedValues": [],
  "explanation": "WRC 537 does not provide rules for fatigue evaluation. Stress concentration factors (Kn, Kb) in Appendix B could be used in fatigue analysis but are not part of the core method.",
  "source": {"section": "Appendix B", "document": "WRC Bulletin 537", "note": "CEI guide [web:34]"}
}
```

```json
{
  "conditionId": "MULTIPLE_ATTACHMENTS",
  "classification": "NOT_SUPPORTED",
  "allowedValues": [],
  "explanation": "Method addresses single isolated attachments only.",
  "source": {"document": "WRC Bulletin 537", "note": "Secondary source [web:31]: 'Nozzle must be isolated'"}
}
```

```json
{
  "conditionId": "CORROSION_THICKNESS",
  "classification": "NOT_STATED",
  "allowedValues": [],
  "explanation": "WRC 537 does not define whether thickness should be nominal, corroded, or effective. CEI guide advises: 'Typically, it is considered conservative to use dimensions after corrosion allowances, forming allowances, and under tolerances have been removed.' This is a project-level engineering policy, not a WRC claim.",
  "source": {"document": "WRC Bulletin 537", "note": "SOURCE DOES NOT DEFINE PROJECT THICKNESS CUSTODY"}
}
```

---

## 8. Explicit Exclusions

```json
{
  "exclusionId": "EXCL_001",
  "statement": "The foregoing procedure provides one with a tool to find stresses in the shell, but not in the nozzle. In some instances, stresses will be higher in the nozzle wall than they are in the vessel wall.",
  "consequence": "METHOD_NOT_APPLICABLE",
  "source": {"section": "3.5.1", "document": "WRC Bulletin 537"}
}
```

```json
{
  "exclusionId": "EXCL_002",
  "statement": "Evaluation of stresses resulting from internal pressure has been omitted.",
  "consequence": "REQUIRES_ENGINEERING_JUDGMENT",
  "source": {"section": "3.3.5 / 4.3.6", "document": "WRC Bulletin 537"}
}
```

```json
{
  "exclusionId": "EXCL_003",
  "statement": "In the case of rectangular attachments, torsional moment produces a complex stress field in the shell. Acceptable methods of analyzing this situation are not available at this time.",
  "consequence": "METHOD_NOT_APPLICABLE",
  "source": {"section": "3.3.3", "document": "WRC Bulletin 537"}
}
```

```json
{
  "exclusionId": "EXCL_004",
  "statement": "In the general case of arbitrary loading, one has no assurance that the absolute maximum stress intensity in the shell will be located at one of the eight points considered.",
  "consequence": "REQUIRES_ENGINEERING_JUDGMENT",
  "source": {"section": "3.3.5", "document": "WRC Bulletin 537"}
}
```

```json
{
  "exclusionId": "EXCL_005",
  "statement": "Where relatively large attachments are considered, or when situations are encountered that deviate considerably from the idealized cases presented herein, the designer should refer to Appendix A or original references.",
  "consequence": "REQUIRES_ENGINEERING_JUDGMENT",
  "source": {"section": "3.5", "document": "WRC Bulletin 537"}
}
```

```json
{
  "exclusionId": "EXCL_006",
  "statement": "It has been found in some cases that certain of the stress components (e.g., Nφ or Mφ) may peak at points slightly removed from the attachment.",
  "consequence": "REQUIRES_ENGINEERING_JUDGMENT",
  "source": {"section": "3.5.2", "document": "WRC Bulletin 537"}
}
```

```json
{
  "exclusionId": "EXCL_007",
  "statement": "The values for these large loading surfaces were computed on request... It should be remembered, however, that they actually apply to flexible loading surfaces and, for radial load, to the center of the loading surface. It should be understood that using these values for the edge of the attachment, as was recommended for small loading surfaces, may be unconservative. (Bijlaard's warning for large d/D ratios)",
  "consequence": "REQUIRES_ENGINEERING_JUDGMENT",
  "source": {"section": "Foreword (August 1965)", "document": "WRC Bulletin 537 (reprinted)"}
}
```

```json
{
  "exclusionId": "EXCL_008",
  "statement": "WRC 537 does not provide guidance on the categorization of the stresses or for the allowable limits of the stress in those categories.",
  "consequence": "REQUIRES_ENGINEERING_JUDGMENT",
  "source": {"section": "General", "document": "WRC Bulletin 537", "note": "CEI guide [web:34]"}
}
```

---

## 9. Coordinate System and Load Conventions

### 9.1 Spherical Shell Coordinate System

The local coordinate system for spherical shells uses two orthogonal directions at the attachment-to-shell juncture:

- **x (radial direction)**: Radial with respect to an axis normal to the shell through the center of the attachment (see Figure 1 in bulletin)
- **y (tangential direction)**: Tangential/circumferential with respect to the same axis

Points A, B, C, D are at 90° increments around the attachment. Each point has an outer surface (U) and inner surface (L) designation, yielding eight recovery points: **AU, AL, BU, BL, CU, CL, DU, DL**.

### 9.2 Cylindrical Shell Coordinate System

- **x**: Longitudinal direction of shell
- **φ (circumferential)**: Circumferential direction with respect to shell axis
- θ is measured from the longitudinal axis (θ = 0°)

### 9.3 Load Mapping: LAFEA → WRC

#### Spherical Shells

| LAFEA | WRC Symbol | Physical Direction | Positive Sign | Load Application Point | Source |
|---|---|---|---|---|---|
| FZ (radial) | P | Radial load (inward/outward normal to shell) | Positive when directed **inward** toward vessel | At attachment-shell juncture | §3.3.1; CEI guide [web:34] |
| FX (shear 1) | V₁ | Shear in 1-1 direction | Positive traveling from **B to A** | At attachment-shell juncture | §3.3.4; CEI guide [web:34] |
| FY (shear 2) | V₂ | Shear in 2-2 direction | Positive traveling from **D to C** | At attachment-shell juncture | §3.3.4; CEI guide [web:34] |
| MX (moment 1) | M₁ | Overturning moment in 1-1 direction | Positive traveling from **D to C** | At attachment-shell juncture | §3.3.2; CEI guide [web:34] |
| MY (moment 2) | M₂ | Overturning moment in 2-2 direction | Positive traveling from **B to A** | At attachment-shell juncture | §3.3.2; CEI guide [web:34] |
| MZ (torsion) | Mₜ | Torsional moment | **UNRESOLVED** — positive direction not explicitly stated in available sources | At attachment centreline | §3.3.3 [Studocu:33] |

**Note:** The LAFEA-to-WRC axis mapping above is tentative. The user must verify that LAFEA's FX/FY/FZ/MX/MY/MZ correspond to the WRC directions as labeled. The mapping is marked **UNRESOLVED** until LAFEA's own coordinate convention is confirmed.

#### Cylindrical Shells

| LAFEA | WRC Symbol | Physical Direction | Positive Sign | Load Application Point | Source |
|---|---|---|---|---|---|
| FZ (radial) | P | Radial load | Inward causes compressive membrane | At attachment-shell juncture | §4.3.1 [Studocu:33] |
| FX (circ. shear) | V_C | Shear in circumferential direction | **UNRESOLVED** | At attachment-shell juncture | §4.3.5 [Studocu:33] |
| FY (long. shear) | V_L | Shear in longitudinal direction | **UNRESOLVED** | At attachment-shell juncture | §4.3.5 [Studocu:33] |
| MX (circ. moment) | M_C | Overturning moment — circumferential | **UNRESOLVED** | At attachment-shell juncture | §4.3.2 [Studocu:33] |
| MY (long. moment) | M_L | Overturning moment — longitudinal | **UNRESOLVED** | At attachment-shell juncture | §4.3.3 [Studocu:33] |
| MZ (torsion) | Mₜ | Torsional moment | **UNRESOLVED** | At attachment centreline | §4.3.4 [Studocu:33] |

---

## 10. Load-Reference Point

```json
{
  "loadReferenceConvention": "Loads and moments are defined at the attachment-to-shell juncture (interface). The bulletin resolves all loads 'at the attachment-shell interface' per §3.3.5.",
  "momentTransferRequired": true,
  "referenceGeometry": "Attachment-shell juncture on the vessel wall. For nozzles, loads act at the shell surface at the nozzle-vessel intersection.",
  "source": {
    "section": "3.3.5",
    "document": "WRC Bulletin 537",
    "note": "CEI guide confirms loads are at attachment-shell interface [web:34]"
  }
}
```

If loads originate from a remote point (e.g., piping analysis nozzle node), the implementer must translate:
**M_interface = M_remote + r × F**
This translation is a **software/piping policy**, NOT a WRC 537 source requirement.

---

## 11. Stress Quantities Calculated

### Source Stress Terminology → LAFEA Mapping

| Source Stress (Spherical) | Source Stress (Cylindrical) | LAFEA Mapping | Classification | Source |
|---|---|---|---|---|
| σ_φ (radial) | σ_x (longitudinal) | UNRESOLVED | Membrane + Bending | §3.3, §4.3 [Studocu:33] |
| σ_θ (circumferential) | σ_φ (circumferential) | UNRESOLVED | Membrane + Bending | §3.3, §4.3 [Studocu:33] |
| τ (shear) | τ (shear) | UNRESOLVED | Shear | §3.3.3, §3.3.4 [Studocu:33] |
| S (stress intensity) | S (stress intensity) | UNRESOLVED | Derived (Tresca/Max Shear) | §3.3.5; Table 3/5 [Studocu:33] |

**Stress components produced by the method:**
- Membrane stress = Nᵢ / T (force per unit length divided by thickness)
- Bending stress = 6Mᵢ / T² (moment per unit length, through-wall bending)
- Shear stress (from V and Mₜ)
- Combined surface stress = membrane ± bending (with sign from Table 1/4)
- Stress intensity S (Maximum Shear Theory / Tresca)

**Inside/outside surface convention:**
- σ_outer = σ_membrane + σ_bending (tensile bending on outside)
- σ_inner = σ_membrane − σ_bending
- **UNRESOLVED**: The exact sign reconstruction formula must be verified from the bulletin's General Equation (§2) and Table 1 (spherical) / Table 4 (cylindrical). The CEI guide provides a sign multiplier matrix (see §19 below) but the user should verify against the actual bulletin tables.

---

## 12. Stress Recovery Locations

| Location ID | Source Name | Angular Coordinate | Physical Meaning | Surface | Shell/Nozzle | Membrane/Bending | Source |
|---|---|---|---|---|---|---|---|
| AU | Point A, outer | 0° (reference) | Reference axis on attachment | Outside (U) | Shell | Both | Table 3/5, Fig 1/2 [Studocu:33] |
| AL | Point A, inner | 0° (reference) | Reference axis on attachment | Inside (L) | Shell | Both | Table 3/5 [Studocu:33] |
| BU | Point B, outer | 90° | Quadrant point | Outside (U) | Shell | Both | Table 3/5 [Studocu:33] |
| BL | Point B, inner | 90° | Quadrant point | Inside (L) | Shell | Both | Table 3/5 [Studocu:33] |
| CU | Point C, outer | 180° | Opposite reference | Outside (U) | Shell | Both | Table 3/5 [Studocu:33] |
| CL | Point C, inner | 180° | Opposite reference | Inside (L) | Shell | Both | Table 3/5 [Studocu:33] |
| DU | Point D, outer | 270° | Quadrant point | Outside (U) | Shell | Both | Table 3/5 [Studocu:33] |
| DL | Point D, inner | 270° | Quadrant point | Inside (L) | Shell | Both | Table 3/5 [Studocu:33] |

**Note:** For cylindrical shells, the angular reference is θ = 0° at the longitudinal axis. Points C and D are at 0° and 180° respectively (or as shown in Figure 2).

---

## 13. Coefficient/Equation Inventory

### Spherical Shell Coefficient Families

| Coefficient ID | Source Symbol | Load Component | Stress Component | Stress Class | Target Location | Dependent Parameters | Source Form | Source Locator |
|---|---|---|---|---|---|---|---|---|
| SP_NX | NₓT/P | P (radial) | σ_x (radial) | Membrane | All 8 points | U, γ, ρ | TABLE (curve-fit) | SP-1 to SP-10 tables [Studocu:33] |
| SP_NY | N_yT/P | P (radial) | σ_y (tangential) | Membrane | All 8 points | U, γ, ρ | TABLE | SP-1 to SP-10 [Studocu:33] |
| SP_MX | Mₓ/P | P (radial) | σ_x (radial) | Bending | All 8 points | U, γ, ρ | TABLE | SP-1 to SP-10 [Studocu:33] |
| SP_MY | M_y/P | P (radial) | σ_y (tangential) | Bending | All 8 points | U, γ, ρ | TABLE | SP-1 to SP-10 [Studocu:33] |
| SM_NX | NₓT√(RmT)/M | M₁ or M₂ | σ_x (radial) | Membrane | All 8 points | U, γ, ρ | TABLE | SM-1 to SM-10 [Studocu:33] |
| SM_NY | N_yT√(RmT)/M | M₁ or M₂ | σ_y (tangential) | Membrane | All 8 points | U, γ, ρ | TABLE | SM-1 to SM-10 [Studocu:33] |
| SM_MX | Mₓ√(RmT)/M | M₁ or M₂ | σ_x (radial) | Bending | All 8 points | U, γ, ρ | TABLE | SM-1 to SM-10 [Studocu:33] |
| SM_MY | M_y√(RmT)/M | M₁ or M₂ | σ_y (tangential) | Bending | All 8 points | U, γ, ρ | TABLE | SM-1 to SM-10 [Studocu:33] |
| SP_NX_MAX | Nₓ(max) | P (radial) | σ_x (radial) | Membrane (max) | Off-juncture | U, γ, ρ | TABLE | Selected SP tables [web:34] |
| SP_MX_MAX | Mₓ(max) | P (radial) | σ_x (radial) | Bending (max) | Off-juncture | U, γ, ρ | TABLE | Selected SP tables [web:34] |

### Cylindrical Shell Coefficient Families

| Coefficient ID | Source Symbol | Load Component | Stress Component | Source Form | Source Locator |
|---|---|---|---|---|---|
| CYL_COEFF_A | UNRESOLVED | P, M_C, M_L | σ_x, σ_φ | TABLE/CHART | Figures/Tables 1A to 4C [web:28] |

**Note:** The cylindrical shell coefficient family uses Figures/Tables 1A through 4C, but the exact coefficient naming and structure is **UNRESOLVED** from available sources.

---

## 14. Governing Equations

### General Stress Equation (§2)

```
σ = N_i / T ± 6 * M_i / T²
```

- Membrane stress: σ_membrane = N_i / T
- Bending stress: σ_bending = 6 * M_i / T²
- Combined with sign selection per Table 1 (spherical) or Table 4 (cylindrical)

**Source:** §2, General Equation [Studocu:33]

### Spherical Shell — Radial Load P (§3.3.1)

**Membrane stress:**
```
σ_membrane = (N_φ / P) × (P / T)
```
Machine expression: `coefficient_Nφ * P / T`

**Bending stress:**
```
σ_bending = (M_φ / P) × (6 * P / T²)
```
Machine expression: `coefficient_Mφ * 6 * P / (T * T)`

**Source:** §3.3.1, Eqs. 6–8 [Studocu:33]

### Spherical Shell — Overturning Moment M (§3.3.2)

**Membrane stress:**
```
σ_membrane = (N_φ × √(Rm×T) / M) × (M / (T × √(Rm×T)))
```
Machine expression: `coefficient_Nφ * M / (T * sqrt(Rm * T))`

**Bending stress:**
```
σ_bending = (M_φ × √(Rm×T) / M) × (6 * M / (T² × √(Rm×T)))
```
Machine expression: `coefficient_Mφ * 6 * M / (T * T * sqrt(Rm * T))`

**Source:** §3.3.2, Eqs. 12–14 [Studocu:33]

### Spherical Shell — Torsional Moment Mₜ (§3.3.3)

```
τ = Mₜ / (2 × π × r₀² × T)
```
Machine expression: `Mt / (2 * pi * r0**2 * T)`

**Source:** §3.3.3, Eq. 18 [Studocu:33]
**Note:** Applicable to round attachments only.

### Spherical Shell — Shear Load V (§3.3.4)

**Round attachment:**
```
τ = V × sin(θ) / (π × r₀ × T)
```
Machine expression: `V * sin(theta) / (pi * r0 * T)`

**Square attachment:**
```
τ = V / (π × C₁ × C₂)    at θ = 90° and 270°
```

**Source:** §3.3.4, Eqs. 19–20 [Studocu:33]

### Curve-Fit Equation Y (all SP and SM tables)

```
Y = a + b·U + c·U² + d·U³ + e·U⁴ + f·U⁵ + g·U⁶ + h·U⁷ + i·U⁸ + j·U⁹
```

Where U is the independent variable (shell parameter), and a, b, c, d, e, f, g, h, i, j are the 10 curve-fit coefficients specific to each curve (each stress component, each chart). This equation is printed in every SP and SM table header.

**Source:** All SP and SM tables [Studocu:33][web:34]

### Abridged Maximum Stress — Rigid Attachment (§3.6)

**Radial load P:**
```
σ = Kₙ × (σ_T² / P) × (coefficient from Fig SR-1)
```
**Source:** §3.6.1, Eq. 21 [Studocu:33]

**Overturning moment M:**
```
σ = K_b × (σ × √(Rm×T) / M) × (M / (T² × √(Rm×T)))
```
**Source:** §3.6.2, Eq. 23 [Studocu:33]

**Combined P and M:**
```
σ_total = σ_P + σ_M
```
**Source:** §3.6.3, Eq. 24 [Studocu:33]

### Stress Concentration Factors (Appendix B)

```
Kₙ = 1 + (0.65 / (r/(2T))^5.6)          [Eq. B.3, Peterson]
K_b = 1 + (0.85 / (r/(2T))^10.75)       [Eq. B.4, Heywood]
K_b = 1 + (0.80 / (r/(2T))^9.4)         [Eq. B.5, Peterson — preferred]
```
For nozzle evaluation, replace 2T with 2r₀ (dn = 2r₀).

**Source:** Appendix B, Eqs. B.3–B.5, p.176 (per CEI guide) [web:34]

---

## 15. Coefficient Numerical Data

> **PARTIALLY RESOLVED:** The exact mathematical form of the curve-fit equation Y is now confirmed (9th-order polynomial in U with 10 coefficients a–j). The table structure is confirmed: 10 SP charts (radial load) + 10 SM charts (moment) for spherical shells, each with 6 curves (Nx, Ny, Mx, My, Nx(max), Mx(max)) × 10 coefficients = 600 coefficients for spherical shells. The cylindrical shell charts (1A–4C) have a parallel structure but exact inventory is **UNRESOLVED**.

The actual numerical coefficient values (a through j for each of the 600+ curves) are contained in the licensed WRC 537 document. The Studocu OCR shows the tables but the values are too garbled for reliable extraction. The file `04_WRC537_NUMERICAL_TABLES.csv` contains the complete table structure and chart inventory but **no coefficient values** — these must be transcribed from the licensed PDF.

### Available Chart/Table Inventory (Spherical Shells)

| Chart ID | γ | ρ | Load Type | Table Page (per Studocu OCR) |
|---|---|---|---|---|
| SP-1 | 5 | 0.25 | Radial (P) | 51 |
| SP-2 | 5 | 1.00 | Radial (P) | 52 |
| SP-3 | 5 | 2.00 | Radial (P) | 54 |
| SP-4 | 5 | 4.00 | Radial (P) | 56 |
| SP-5 | 15 | 1.00 | Radial (P) | 58 |
| SP-6 | 15 | 2.00 | Radial (P) | 60 |
| SP-7 | 15 | 4.00 | Radial (P) | 62 |
| SP-8 | 15 | 10.00 | Radial (P) | 64 |
| SP-9 | 50 | 4.00 | Radial (P) | 66 |
| SP-10 | 50 | 10.00 | Radial (P) | 68 |
| SM-1 | 5 | 0.25 | Moment (M) | 70 |
| SM-2 | 5 | 1.00 | Moment (M) | 71 |
| SM-3 | 5 | 2.00 | Moment (M) | 74 |
| SM-4 | 5 | 4.00 | Moment (M) | 76 |
| SM-5 | 15 | 1.00 | Moment (M) | 78 |
| SM-6 | 15 | 2.00 | Moment (M) | 80 |
| SM-7 | 15 | 4.00 | Moment (M) | 82 |
| SM-8 | 15 | 10.00 | Moment (M) | 84 |
| SM-9 | 50 | 4.00 | Moment (M) | 86 |
| SM-10 | 50 | 10.00 | Moment (M) | 89 |

### Cylindrical Shell Charts: Figures/Tables 1A to 4C [web:28]

**UNRESOLVED** — Complete inventory of cylindrical shell charts not extractable from available sources. Errata references Figures 1C-1, 3B, 4A, 4B, Table 5.

---

## 16. Numerical Precision

When the licensed PDF is obtained, each coefficient must preserve source precision exactly:

```json
{
  "displayedValue": "1.23",
  "numericValue": 1.23,
  "decimalPlaces": 2
}
```

The CEI guide example provides intermediate values in scientific notation (e.g., "6.64E-02"), suggesting the bulletin or the curve-fit output uses this format. **UNRESOLVED** — exact source precision format must be verified.

---

## 17. Interpolation

```json
{
  "interpolationAuthorized": true,
  "interpretation": "SOURCE_STATED",
  "method": "Linear interpolation on Y values (NOT on coefficients)",
  "procedure": "1. Compute Y for each bracketing (γ,ρ) chart using that chart's coefficients. 2. Interpolate linearly on ρ. 3. Interpolate linearly on γ.",
  "order": "1D linear, applied sequentially (first ρ, then γ)",
  "warning": "DO NOT interpolate coefficient values. Interpolate the Y results.",
  "source": {
    "document": "WRC Bulletin 537",
    "note": "CEI guide [web:34] states: 'it is generally accepted to interpolate between the figures as necessary' and 'DO NOT interpolate the coefficient values. Instead, determine the values of Y assuming a certain γ and ρ value and then interpolate between the Y values based on ρ and then on γ.'"
  }
}
```

**Is interpolation explicitly authorized by the bulletin?** The foreword states the objective includes facilitating "proper interpolation and extrapolation." **PARTIALLY STATED** — the foreword mentions interpolation but the exact algorithm (linear, order of axes) comes from the CEI guide's interpretation.

---

## 18. Extrapolation

```json
{
  "extrapolationAuthorized": "PARTIALLY",
  "interpretation": "EXTRAPOLATED_CURVES_PROVIDED",
  "conditions": [
    "WRC 537 provides extrapolated curve alternatives with corresponding fits for several cylindrical host curves",
    "Original and extrapolated curves are clearly labeled for ease of use",
    "The foreword mentions facilitating 'proper interpolation and extrapolation'",
    "CAESAR II and PV Elite do NOT extrapolate beyond chart limits (software policy)"
  ],
  "source": {
    "document": "WRC Bulletin 537",
    "note": "CEI guide [web:6]; CAESAR II documentation [web:31]"
  }
}
```

**LAFEA policy:** No-extrapolation unless engineering approval establishes otherwise. Use only the explicitly provided extrapolated curves where they exist, never extrapolate beyond those.

---

## 19. Stress Sign and Surface Reconstruction

### Sign Multiplier Matrix (Spherical Shells, derived from Table 3)

From the CEI guide [web:34], the following sign multipliers apply when assigning stress components to each of the eight points:

| Stress Component | AU | AL | BU | BL | CU | CL | DU | DL |
|---|---|---|---|---|---|---|---|---|
| Membrane from P | −1 | −1 | −1 | −1 | −1 | −1 | −1 | −1 |
| Bending from P | −1 | +1 | −1 | +1 | −1 | +1 | −1 | +1 |
| Membrane from M₁ | 0 | 0 | 0 | 0 | −1 | −1 | +1 | +1 |
| Bending from M₁ | 0 | 0 | 0 | 0 | −1 | +1 | +1 | −1 |
| Membrane from M₂ | −1 | −1 | +1 | +1 | 0 | 0 | 0 | 0 |
| Bending from M₂ | −1 | +1 | +1 | −1 | 0 | 0 | 0 | 0 |
| Shear from V₁ | 0 | 0 | 0 | 0 | −1 | −1 | +1 | +1 |
| Shear from V₂ | +1 | +1 | −1 | −1 | 0 | 0 | 0 | 0 |
| Shear from Mₜ | +1 | +1 | +1 | +1 | +1 | +1 | +1 | +1 |

**Surface reconstruction:**
- σ_x at each point = Σ(multiplier × stress_component_x)
- σ_y at each point = Σ(multiplier × stress_component_y)
- τ at each point = Σ(multiplier × shear_component)
- Inside surface (L) vs outside surface (U) distinction is embedded in the bending sign

**Source:** Table 3 (spherical), p.29 per CEI guide [web:34]

**UNRESOLVED:** This matrix is derived from the CEI guide's interpretation of Table 3. It must be verified against the actual bulletin Table 3 before implementation.

---

## 20. Combination of Simultaneous Loads

```json
{
  "combinationMethod": "LINEAR_SUPERPOSITION",
  "classification": "SOURCE_STATED",
  "explanation": "The bulletin resolves all loads into components P, V1, V2, M1, M2, Mt at the attachment-shell interface, evaluates stresses from each, and combines them using the sign multiplier table. §3.3.5 states: 'In the general case, all applied loads and moments must be resolved at the attachment-shell interface... membrane, bending and shear stresses can be evaluated at eight distinct points.'",
  "pressureCombination": "NOT_INCLUDED — pressure stresses omitted from the method. Designer must independently calculate and superpose.",
  "source": {"section": "3.3.5", "document": "WRC Bulletin 537"}
}
```

---

## 21. Internal-Pressure Stresses

```json
{
  "pressureTreatment": "EXCLUDED",
  "pressureStressEquationsProvided": false,
  "pressureCombinationRule": "NOT_PROVIDED_BY_WRC — designer responsibility. Industry practice: use WRC 368 for pressure stress at nozzle-cylinder junctions, or ASME VIII Div 2 §4.5 for local membrane stress from pressure, then superpose with WRC 537 external load stresses.",
  "source": {
    "section": "3.3.5 / 4.3.6",
    "document": "WRC Bulletin 537",
    "note": "Bulletin explicitly states: 'evaluation of stresses resulting from internal pressure has been omitted'"
  }
}
```

---

## 22. Derived Stress Quantities

| Quantity | Classification | Source |
|---|---|---|
| Principal stresses | POST_PROCESSING (derivable from σ_x, σ_y, τ) | N/A |
| von Mises stress | POST_PROCESSING | N/A |
| Tresca / Stress intensity S | SOURCE_METHOD (Maximum Shear Theory) | §3.3.5; Table 3/5 [Studocu:33] |
| Code stress category (Pl, Pb, Q) | POST_PROCESSING (designer responsibility) | CEI guide [web:34] |
| Allowable utilization | NOT_SUPPORTED | N/A |
| Fatigue usage | NOT_SUPPORTED (Kn, Kb available in Appendix B for designer use) | Appendix B [web:34] |

**Stress intensity equations (from Table 3, per CEI guide [web:34]):**

```
Si1 = sqrt(0.5 * [(σx + σy) + sqrt((σx - σy)² + 4τ²)])
Si2 = sqrt(0.5 * [(σx + σy) - sqrt((σx - σy)² + 4τ²)])
Si3 = sqrt((σx - σy)² + 4τ²)
S = max(Si1, Si2, Si3)
```

---

## 23–36. See companion files for source ledger, dataset JSON, numerical tables, qualification cases, and open issues.

---

## 35. Mandatory Extraction Completeness Matrix

| Area | Extracted | Source Verified | Machine Readable | Implementation Ready |
|---|---|---|---|---|
| Method identity | YES | YES | YES | YES |
| Geometry definitions | PARTIAL | PARTIAL | YES | NO |
| Applicability | PARTIAL | PARTIAL | YES | NO |
| Dimensionless parameters | YES (γ, ρ, U confirmed) | YES (γ=rm/t, ρ=T/t, U=r0/√(RmT)) | YES | PARTIAL |
| Load axes | PARTIAL | PARTIAL | YES | NO |
| Load reference | YES | YES | YES | YES |
| Stress definitions | PARTIAL | PARTIAL | YES | NO |
| Recovery locations | YES | YES | YES | YES |
| Coefficient families | YES | YES | YES | PARTIAL |
| Coefficient numerical data | NO | NO | NO | **NO — BLOCKING** |
| Equations | YES (curve-fit Eq. Y confirmed) | YES | YES | PARTIAL |
| Interpolation | YES | PARTIAL | YES | PARTIAL |
| Extrapolation | PARTIAL | PARTIAL | YES | PARTIAL |
| Pressure treatment | YES | YES | YES | YES |
| Load combination | YES | YES | YES | YES |
| Published examples | PARTIAL (CEI guide example only) | NO (not from bulletin directly) | YES | NO |
| Numerical precision | NO | NO | NO | NO |
| Exclusions | YES | YES | YES | YES |
| LAFEA mapping | NO | NO | NO | NO |

---

## 36. Required Final Engineering Verdict

**WRC537_EXTRACTION_STATUS = NOT_READY_FOR_IMPLEMENTATION**

### Blocking Items

1. **Numerical coefficient values (a–j)** — The 10 coefficients for each of the 20+ SP/SM tables (spherical) and the cylindrical shell tables (1A–4C) are contained only in the licensed document. No coefficients can be extracted without it. (The equation form Y = a + bU + ... + jU⁹ is now confirmed.)

2. **Cylindrical shell parameters (λ, δ)** — Exact equations and ranges for cylindrical shell parameters not extractable from available sources.

3. **Sign convention tables** — Table 1 (spherical) and Table 4 (cylindrical) sign tables not directly verified; only the CEI guide's derived multiplier matrix is available.

4. **Published numerical examples from the bulletin** — The bulletin's own worked examples (if any) are not available; only a CEI guide example citing the bulletin is available.

5. **Edition/page reconciliation** — Available sources reference at least two editions (2010/2013 with ISSN 0043-2326; 3rd ed. March 2022 with ISSN 2372-1057) with potentially different pagination.

6. **Errata application** — The August 2011 cumulative errata corrects multiple figures and tables; these corrections must be applied to whichever edition is used.

7. **LAFEA canonical mapping** — Cannot be completed until LAFEA's own geometry and load conventions are defined and cross-referenced with WRC definitions.
