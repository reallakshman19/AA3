# WRC 537 cylindrical radius / diameter-basis authority — EMP1-33

## Status

`BLOCKED_PARTIAL_TABLE5_RM_SYMBOL_AND_PARAMETER_ROLE_PHYSICAL_RADIUS_DEFINITION_UNQUALIFIED`

## Current authority split

This source-qualification record and the bounded runtime route answer different questions and must not be collapsed into one boolean.

Current branch/live bounded state is:

```text
bounded gamma5 / zero-dp route authorized = true
registry registered                       = true
bounded engineering use                  = true
bounded production use                   = true
global EMP.1.C authority                 = false
code compliance                          = false
release qualified                        = false
```

This **does not** close the cylindrical physical-radius source question. The governing invariant is:

`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CYLINDRICAL_RM_PHYSICAL_DEFINITION_SOURCE_AUTHORITY`

Accordingly, `engineeringUseAuthorized=false` and `productionUseAuthorized=false` in the source-qualification record mean **authority granted by this source record itself**, not the current state of the separately governed bounded route.

## Retained Table-5 source fact now reconciled

The retained WRC 537 transcription at:

`docs/emp1/WRC537_2013_Tables_and_Charts.md`

contains **Table 5 — Computation Sheet for Local Stresses in Cylindrical Shells, pp. 41–42**. Its cylindrical geometry block states:

```text
Vessel Thickness   T
Attachment Radius  r_o
Vessel Radius      R_m
```

and immediately defines the cylindrical geometric parameters using the same `R_m`:

```text
gamma = R_m / T
beta  = 0.875 * r_o / R_m
```

Accordingly, this reconciliation recognizes the retained Table-5 source-text facts that:

- the cylindrical Table-5 vessel-radius symbol is `R_m`;
- `R_m` is the vessel-radius geometry input consumed by Table 5;
- the retained Table-5 parameterization uses that `R_m` in both `gamma` and `beta`.

This corrects the older legacy extraction's cylindrical notation `R_c` for the **Table-5 symbol/role only**. The legacy extraction remains `NOT_READY_FOR_IMPLEMENTATION` and is not used to invent the missing physical definition.

## What this does not prove

Table 5 labels the quantity `Vessel Radius R_m`; it does **not**, in the retained evidence qualified here, define how that physical radius is constructed from OD, ID and thickness or what corrosion/assessment state governs it.

Therefore the following remain unqualified:

- whether `R_m` is explicitly a midsurface/mean radius in the physical-definition sense;
- exact relation among OD, ID, `T` and `R_m`;
- whether nominal, corroded, assessment or measured geometry is required;
- whether the same physical `T` basis must be used to construct `R_m`;
- internal, external or two-sided corrosion geometry treatment;
- local station diameter versus nominal shell-course diameter;
- ovality/out-of-roundness treatment;
- locally thickened shell, insert plate, taper or transition treatment;
- whether the same `R_m` identity governs every §4.5 applicability ratio.

## Current production trace

Current source custody derives:

```text
outerRadius = pipeOutsideDiameter / 2
meanRadius  = outerRadius - assessmentPipeThickness / 2
```

then passes that value to the bounded cylindrical geometry adapter, which computes:

```text
gamma = meanRadius / shellThickness
beta  = 0.875 * attachmentOutsideRadius / meanRadius
```

The same `meanRadius` is also supplied to the cylindrical §4.5 applicability evaluator and to the Table-5 calculation geometry.

This path is deterministic software behavior. It does not make:

`OD/2 - assessmentThickness/2`

into a universal WRC physical-radius construction rule. No production geometry transformation or numerical mechanism is changed by this reconciliation.

## Source-custody boundary

Controlled WRC source identity remains:

- document: WRC 537 (2013)
- raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob SHA-1: `ce861233928154145a9257efbbf8dbef3f5a17d1`

Direct binary page re-observation in this increment remains:

`NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

The exact blob is reachable through authenticated GitHub, but the connected interface cannot expose the PDF bytes for direct page inspection. The retained Table-5 transcription is therefore used only for the bounded symbol/role reconciliation above; it is not stretched into a missing physical construction rule.

## Protected inference boundary

Do not infer:

```text
Table 5 uses R_m
    => R_m is proven to equal OD/2 - T/2 for every assessment basis
```

Do not infer:

```text
software field is named meanRadius
    => WRC primary source has qualified the physical midsurface/mean-radius construction
```

Do not infer:

```text
bounded route is authorized
    => the unresolved physical R_m construction has become primary-source qualified
```

Do not import spherical-shell radius definitions into the cylindrical route.

## Authority effect

This source-governance increment changes no:

- production `meanRadius` calculation;
- `gamma` or `beta` production equations;
- WRC §4.5 applicability implementation;
- Table-5 numerical evaluator;
- route/registry authority;
- oracle, tolerance or benchmark;
- aggregate P0 release gate;
- code/release/global authority;
- workflow.

Current authority is therefore represented as two orthogonal layers:

```text
THIS SOURCE RECORD
Table-5 cylindrical R_m symbol/role     = qualified retained source text
physical R_m construction               = blocked
engineering use granted by this record  = false
production use granted by this record   = false

CURRENT BOUNDED RUNTIME
bounded route authorized                = true
registry registered                     = true
bounded engineering/production use      = true
global EMP.1.C                           = false
code compliance                          = false
release qualified                        = false
```

## Closure evidence still required

Issue #1377 can be fully closed only when primary evidence establishes:

1. the exact physical definition of cylindrical `R_m`;
2. the exact OD/ID/`T` relationship;
3. the compatible shell-thickness/corrosion geometry basis;
4. the source identity of the radius used in §4.5 applicability ratios;
5. behavior for nominal, measured, oval, corroded and locally modified geometry.

Until those are proven, the #1377 physical-radius source gate remains blocked. Bounded route authorization is not accepted as substitute source evidence.
