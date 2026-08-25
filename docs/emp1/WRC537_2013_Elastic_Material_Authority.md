# WRC 537 elastic material and shell-theory authority — EMP1-34

## Decision

The retained WRC 537 Table 5 cylindrical computation sheet provides one bounded source fact that can now be separated from the broader unresolved material/theory questions:

> The Table-5 calculation sheet explicitly lists loads, geometry, geometric parameters and stress-concentration factors, and its displayed cylindrical stress equations do not contain an explicit shell modulus `E` or Poisson-ratio `nu` input.

This is **not** authority that WRC 537 is universally independent of material properties. It does not establish the derivation-level role of `E`, the Poisson-ratio assumption, the constitutive model, the shell-theory assumptions, or applicability to arbitrary materials.

Current disposition therefore remains:

`BLOCKED_PRIMARY_ELASTIC_MATERIAL_AND_SHELL_THEORY_AUTHORITY_UNRESOLVED`

## Retained primary-source transcription

Controlled WRC identity:

```text
Document      = WRC 537 (2013)
Git blob      = ce861233928154145a9257efbbf8dbef3f5a17d1
Raw SHA-256   = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
Transcription = docs/emp1/WRC537_2013_Tables_and_Charts.md
Table         = Table 5 — Computation Sheet for Local Stresses in Cylindrical Shells
PDF pages     = 41–42
```

Direct current-turn rendering of the binary PDF remains:

`NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

The retained Table-5 transcription explicitly presents these input groups:

```text
Applied loads:
P, Mc, Ml, Mt, Vc, Vl

Geometry:
T, r0, Rm

Geometric parameters:
gamma = Rm/T
beta  = 0.875 r0/Rm

Stress-concentration factors:
Kn, Kb
```

The retained membrane, bending and shear expressions shown on Table 5 use loads, `Rm`, `r0`, `T`, `beta`, `Kn` and `Kb`. The combined-stress-intensity section then consumes the reconstructed stress components.

No explicit `E` input and no explicit Poisson-ratio input is present on this retained Table-5 computation sheet or in those displayed final cylindrical stress expressions.

## What is now source-qualified

For the **retained Table-5 computation sheet only**:

- an explicit shell modulus input is absent;
- an explicit Poisson-ratio input is absent;
- the displayed final cylindrical membrane/bending/shear stress expressions contain no explicit `E` term;
- the displayed final expressions contain no explicit Poisson-ratio term.

The qualification boundary is intentionally narrow:

`TABLE5_COMPUTATION_SHEET_EXPLICIT_INPUT_AND_DISPLAYED_EQUATION_CONTENT_ONLY`

## What this does not prove

The following inferences remain prohibited:

```text
Table 5 has no explicit E input
    => absolute E is irrelevant to WRC derivation/applicability
```

```text
Table 5 has no explicit nu input
    => Poisson ratio is irrelevant or unconstrained
```

```text
final displayed stress equations do not show material fields
    => arbitrary nonlinear/plastic/creep/composite/anisotropic materials are covered
```

The source may embed material/theory assumptions in derivation, fitted curves, underlying shell solutions, or applicability statements without requiring those quantities as runtime inputs on Table 5. The retained computation sheet alone cannot resolve that question.

## Legacy nomenclature context

`docs/01_WRC537_METHOD_DEFINITION.md` remains explicitly `NOT_READY_FOR_IMPLEMENTATION`. It retains the candidate §4.1 nomenclature statement:

```text
E = modulus of elasticity of shell material
```

That legacy extraction is useful as an unresolved extraction target, but it is not promoted here into primary-source authority for the exact role of `E`.

## Current software observation

`src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` does not consume:

```text
E
nu
Sy / allowable stress
material class
constitutive law
temperature-dependent modulus
```

This software non-use is consistent with the retained Table-5 explicit-input structure, but consistency is not a substitute for material/theory authority.

## Still-required primary closure

Before material/theory applicability is promoted, source work must still establish:

1. exact role of shell modulus `E` in the WRC derivation and cylindrical method;
2. whether absolute `E` cancels from final coefficients and under what assumptions;
3. whether Poisson ratio is explicit, fixed, embedded, approximated or otherwise treated;
4. whether homogeneous isotropic linear elasticity is assumed;
5. whether thin-shell/small-deformation theory is the method basis and how applicability is bounded;
6. whether host-shell and attachment material/stiffness relationships affect standard cylindrical curves;
7. temperature-dependent modulus treatment;
8. applicability to local yielding, elastic-plastic response, creep, viscoelasticity, anisotropy, orthotropy and composites;
9. treatment of clad/lined shells or material discontinuities near the attachment;
10. whether yield strength/allowable stress belongs only to a separate code-acceptance layer;
11. exact primary-source locators for every retained material/theory applicability statement.

## Protected authority boundary

This source-governance increment changes no production mechanics. It does not:

- add material fields to the WRC adapter;
- change WRC coefficients or Table-5 stress equations;
- change gamma/beta equations or domains;
- add a Poisson-ratio or modulus correction;
- add nonlinear or temperature-dependent constitutive behavior;
- change attachment-class, thickness, radius, pressure, SCF, off-axis, spherical, non-round or interaction authority;
- change the aggregate P0 source-semantics gate;
- grant code-compliance, global EMP.1.C or release authority.

## Reopen gate

A production/material-custody change is admissible only after the pinned primary source establishes the exact material/theory assumptions and identifies whether any material quantity must become an explicit canonical input or whether final stress evaluation is source-qualified as independent of those quantities within a bounded elastic domain.
