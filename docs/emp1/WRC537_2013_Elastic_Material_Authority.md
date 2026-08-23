# WRC 537 elastic material and shell-theory authority — EMP1-34

## Decision

The current bounded cylindrical WRC route does **not** consume shell modulus, Poisson ratio, yield strength or a constitutive model. That is a software-interface fact only. It is not source authority that WRC 537 is valid for arbitrary materials or constitutive states.

The retained legacy extraction `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`, but its §4.1 nomenclature records:

```text
E = modulus of elasticity of shell material
```

The exact role of `E`, any Poisson-ratio assumption, and the source-qualified shell-theory/material applicability basis remain unresolved in the currently controlled repository evidence.

## Current software observation

`src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` consumes:

- WRC geometry;
- gamma/beta domain authority;
- six-component load custody;
- source curve/dataset authority;
- §4.5 applicability authority;
- stress-concentration authority.

It does not consume:

```text
E
nu
Sy / allowable stress
material class
constitutive law
temperature-dependent modulus
```

This may be mathematically legitimate for final load-to-stress equations under a particular elastic shell theory, but that conclusion must come from source qualification rather than from the current API shape.

## Required primary-source closure

Before material/theory applicability is promoted, primary source custody must resolve:

1. the exact role of shell modulus `E` in the cylindrical method;
2. whether absolute `E` cancels from final shell stress coefficients and under what assumptions;
3. whether Poisson ratio is explicit, fixed, embedded in published curves, approximated or otherwise treated;
4. whether homogeneous isotropic linear elasticity is assumed;
5. whether small-deformation/thin-shell theory is an explicit method basis and how its applicability is bounded;
6. whether host shell and attachment material/stiffness relationships affect standard cylindrical curves;
7. temperature-dependent modulus treatment;
8. applicability to elastic-plastic response, local yielding, creep, viscoelasticity, anisotropy, orthotropy and composites;
9. treatment of clad/lined shells or material discontinuities near the attachment;
10. whether yield strength/allowable stress belongs only to a separate code-acceptance layer;
11. exact source locators for every retained statement.

## Protected inference boundary

These inferences are prohibited:

```text
current code does not request E
    => WRC is universally independent of material properties
```

```text
published stress coefficients can be evaluated numerically
    => nonlinear / creep / composite / anisotropic material states are covered
```

```text
WRC output is elastic shell stress
    => code allowable or yield acceptance is included
```

No Poisson ratio, modulus correction or material adjustment may be invented to fill the source gap.

## Relationship to adjacent authority

EMP1-30 keeps attachment rigidity/hollow-solid applicability source-gated. Material/stiffness assumptions may interact with that question but must not be silently imported from it.

EMP1-32 and EMP1-33 separately gate shell thickness and cylindrical radius physical basis. Material/theory closure does not widen those geometry authorities.

Code-compliance and release authority remain separate and false.

## Authority effect

This source phase changes no production mechanics. It does not:

- add material fields to the WRC adapter;
- change WRC coefficients or stress equations;
- change gamma/beta domains;
- add a Poisson-ratio or modulus correction;
- add nonlinear or temperature-dependent constitutive behavior;
- change pressure, SCF, off-axis, spherical, non-round, interaction, code or release authority.

Current disposition:

`BLOCKED_PRIMARY_ELASTIC_MATERIAL_AND_SHELL_THEORY_AUTHORITY_UNRESOLVED`

## Reopen gate

A production/material-custody change is admissible only after the pinned primary source establishes the exact material/theory assumptions and identifies whether any material quantity must become an explicit canonical input or whether final stress evaluation is source-qualified as independent of those quantities within a bounded elastic domain.
