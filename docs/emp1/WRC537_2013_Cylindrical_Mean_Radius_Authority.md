# WRC 537 cylindrical radius / diameter-basis authority — EMP1-33

## Status

`BLOCKED_PARTIAL_PRIMARY_4_2_1_MID_RADIUS_QUALIFIED_ASSESSMENT_GEOMETRY_BASIS_UNQUALIFIED`

## Decision

The cylindrical physical meaning of `R_m` is no longer unresolved.

A directly readable 2013 WRC 537 document rendering was observed on 2026-08-27. In the cylindrical nomenclature, `R_m` is identified as the mean radius of the cylindrical shell and `T` as cylindrical shell wall thickness. Section 4.2.1 then defines the shell parameter using the shell **mid-radius** divided by shell thickness, `gamma = R_m/T` (Eq. 25). Section 4.2.2.1 uses the same `R_m` for round-attachment `beta`, and §4.5 continues using `R_m` for the cylindrical length/radius applicability relations.

Source rendering used for this direct text observation:

`https://studylib.net/doc/25312294/wrc-537-`

Observed locators:

```text
§1.3   Nomenclature Applicable to Cylindrical Shells
§4.2.1 Shell Parameter, Eq. (25)
§4.2.2.1 Round Attachment, Eq. (26)
§4.5   Limits On Application
```

The rendering identifies the document as WRC 537, *Local Stresses in Spherical and Cylindrical Shells Due to External Loading*, copyright 2013 Welding Research Council.

## Source-custody limitation

The repository-controlled source remains:

```text
docs/emp1/WRC537_2013.pdf
raw SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
Git blob SHA-1 = ce861233928154145a9257efbbf8dbef3f5a17d1
```

The connected GitHub interface still cannot expose the pinned PDF bytes/pages directly. Therefore:

```text
primary binary page re-observation = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
external rendering byte identity with pinned PDF = UNPROVEN
```

The observed external rendering is used to qualify the **textual WRC semantics** listed above. It is not represented as byte-for-byte re-observation of the pinned PDF and does not alter the controlled source hash.

## What is now source-qualified

The combined primary-text observation and retained Table-5 evidence support:

- cylindrical source symbol `R_m`;
- physical meaning: cylindrical shell mean/mid-radius;
- shell thickness symbol `T`;
- `gamma = R_m/T`;
- round-attachment `beta = 0.875*r_o/R_m`;
- use of the same cylindrical `R_m` identity in the §4.5 `l/R_m` and `0.5 R_m` applicability relations;
- Table-5 `Vessel Radius R_m` as the same cylindrical radius parameter.

This resolves the earlier legacy-extraction ambiguity that used `R_c`. The legacy document remains `NOT_READY_FOR_IMPLEMENTATION`; its old notation no longer controls cylindrical `R_m` semantics.

## Elementary geometry versus WRC policy

For one concentric circular cylindrical wall, elementary geometry gives:

```text
R_m = D_m / 2
    = (D_o + D_i) / 4
    = D_o/2 - T/2
    = D_i/2 + T/2
```

That identity is not a special WRC corrosion rule. It is valid only when `D_o`, `D_i` and `T` describe the **same physical wall state**.

Current production derives:

```text
outerRadius = pipeOutsideDiameter / 2
innerRadius = outerRadius - assessmentPipeThickness
meanRadius  = outerRadius - assessmentPipeThickness / 2
```

The upstream LAFEA.2 section calculation and the WRC source-custody path are therefore geometrically consistent with WRC's mid-radius definition **provided** the retained outside diameter and assessment thickness refer to the same current physical cylindrical wall.

This increment does not establish that policy condition for every source document or corrosion state.

## Remaining blocker

WRC 537 defines the radius quantity used by the method; it does not appear in the observed sections to prescribe a universal asset-integrity policy for choosing nominal, corroded, measured, minimum or locally thinned geometry.

Still unqualified for professional source custody:

- whether a retained nominal outside diameter may be combined with a corroded/remaining wall thickness without an explicit physical-geometry policy;
- internal versus external versus two-sided corrosion geometry treatment;
- local measured diameter versus nominal shell-course diameter;
- ovality/out-of-roundness treatment;
- local thinning where one concentric annulus no longer describes the attachment station;
- locally thickened shell, insert plate, taper or transition treatment;
- deterministic rejection when OD/thickness declarations describe incompatible physical states.

The remaining #1377 problem is therefore **assessment-geometry consistency**, not the definition of WRC cylindrical `R_m` itself.

## Current production trace

`src/core/local-attachment-screening/section-properties.js` constructs an assessed annulus from retained outside diameter and assessment thickness and rejects invalid annular geometry. `src/core/local-attachment-correlation/geometry-evidence.js` retains both quantities and their source references. `src/core/emp1/emp1-wrc537-source-custody.js` then calculates `R_m = D_o/2 - T/2` and uses that value consistently for gamma, beta and §4.5.

No numerical production code is changed by this source-governance increment.

## Authority split

```text
THIS SOURCE RECORD
cylindrical R_m symbol                           = qualified
mean/mid-radius physical meaning                 = qualified
same R_m used in gamma, beta and §4.5            = qualified
concentric same-state OD/T -> mid-radius geometry = conditionally valid elementary geometry
assessment/corrosion geometry policy             = blocked
ovality/local/nonuniform geometry policy          = blocked
engineering use granted by this record            = false
production use granted by this record             = false

CURRENT BOUNDED RUNTIME
bounded route authorized                          = true
registry registered                               = true
bounded engineering/production use                = true
global EMP.1.C                                    = false
code compliance                                   = false
release qualified                                 = false
```

Governing invariant:

`PRIMARY_RM_MID_RADIUS_SEMANTICS_DO_NOT_AUTHORIZE_UNPROVEN_ASSESSMENT_OR_CORROSION_GEOMETRY_POLICY`

## Closure still required

Issue #1377 remains open. Full closure requires a controlled engineering-source policy proving that the OD and assessment thickness supplied to WRC describe the same physical shell wall state, together with explicit handling/rejection of corrosion, measured/local, oval and modified geometries. Direct page re-observation of the pinned PDF should also be retained when binary access becomes available.
