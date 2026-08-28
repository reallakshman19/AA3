# WRC 537 elastic material and shell-theory authority — EMP1-34

## Decision

Issue #1379 has advanced beyond Table-5 input silence, but it is **not closed**.

Current source disposition:

`BLOCKED_PARTIAL_PRIMARY_CYLINDRICAL_FLEXIBLE_LOADING_SURFACE_AND_NONLINEAR_EXTENSION_BOUNDARY_QUALIFIED_MATERIAL_DETAILS_UNRESOLVED`

Two additional WRC primary-source facts are now qualified for the retained cylindrical method:

1. the original theoretical solutions used simplifying assumptions including **flexible loading surfaces for cylindrical vessels**;
2. WRC's historical extension plan identifies **large-deflection theory and other nonlinear effects** as later shell-theory/Bijlaard-method extension work, not as already-qualified content of the retained original basis.

These facts narrow the shell-theory boundary. They do **not** prove universal material independence, absolute-`E` cancellation, a Poisson-ratio rule, homogeneous/isotropic material applicability, attachment-material equivalence, or plastic/creep/composite applicability.

## Controlled source custody

```text
Document      = WRC 537 (2013)
Pinned path   = docs/emp1/WRC537_2013.pdf
Git blob      = ce861233928154145a9257efbbf8dbef3f5a17d1
Raw SHA-256   = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Pinned-PDF direct-page observation in the connected binary transport remains:

`NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

A directly readable WRC 537 primary-document text rendering was inspected. Its byte identity to the pinned repository PDF is **UNPROVEN** and is not represented as source-byte custody.

### Primary text locator A — cylindrical theoretical assumption

WRC 537 (2013), **Foreword to WRC Bulletin 107, August 1965 Original Version**, roman page vii:

- development of the theoretical solutions used simplifying assumptions;
- the cylindrical-vessel assumption explicitly identified there is **flexible loading surfaces**;
- the same discussion connects those assumptions to limitations in the useful diameter-ratio range and warns about larger loading surfaces.

Bounded authority created by that observation:

`CYLINDRICAL_THEORY_FLEXIBLE_LOADING_SURFACE_ASSUMPTION_QUALIFIED`

This does not prove the attachment material, wall thickness, rigidity class, or constitutive law.

### Primary text locator B — nonlinear extension boundary

WRC 537 (2013), **Foreword to WRC Bulletin 107, March 1979 Update of August 1965 Original Version**, roman page vi:

- long-range plans call for review of shell theory and Bijlaard's method;
- the planned extension expressly includes **large-deflection theory and other nonlinear effects**.

The bounded conclusion is not that WRC supplies a complete nonlinear exclusion catalog. It is only that those large-deflection/nonlinear extensions are not treated as already-qualified content of the retained original theory basis.

## Retained Table-5 authority

The previously qualified Table-5 facts remain unchanged:

```text
explicit E input absent                          = qualified
explicit Poisson-ratio input absent              = qualified
displayed cylindrical equations explicit-E-free = qualified
displayed equations explicit-nu-free             = qualified
```

Retained transcription:

```text
path       = docs/emp1/WRC537_2013_Tables_and_Charts.md
table      = Table 5 — Computation Sheet for Local Stresses in Cylindrical Shells
PDF pages  = 41–42
```

This qualification boundary remains:

`TABLE5_COMPUTATION_SHEET_EXPLICIT_INPUT_AND_DISPLAYED_EQUATION_CONTENT_ONLY`

## Current authority map

```text
Table-5 explicit E/nu input non-use                        = qualified
Table-5 displayed stress equation explicit E/nu non-use   = qualified
cylindrical flexible-loading-surface theory assumption     = qualified
large-deflection/nonlinear later-extension boundary        = qualified

exact role of E in derivation                              = unresolved
absolute E cancellation                                    = unresolved
Poisson-ratio treatment                                    = unresolved
homogeneous/isotropic linear-elastic assumption            = unresolved
thin-shell/small-deformation rule for cylindrical method   = unresolved beyond the bounded source statements above
host-shell / attachment material relationship              = unresolved
temperature-dependent modulus                              = unresolved
plasticity / creep applicability                           = unresolved
anisotropy / orthotropy / composites                       = unresolved
material discontinuity / lined or clad shell treatment     = unresolved

engineering use granted by this source record              = false
production use granted by this source record               = false
```

## Critical distinctions

Do not infer:

```text
Table 5 does not ask for E
    => absolute E is irrelevant to derivation or applicability
```

Do not infer:

```text
cylindrical theory assumes a flexible loading surface
    => any attachment material/stiffness/geometry is acceptable
```

Do not infer:

```text
large-deflection/nonlinear effects were later extension work
    => every nonlinear/plastic/creep/composite material class has been explicitly source-excluded
```

The source statements narrow the theory boundary but do not answer every material question listed in Issue #1379.

## Current software observation

`src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` does not consume:

```text
E
nu
yield/allowable stress
material class
constitutive law
temperature-dependent modulus
```

That software fact remains observational only. It cannot create engineering material authority.

## Current bounded runtime remains separate

```text
bounded gamma5 / zero-dp route authorized = true
registry registered                       = true
bounded engineering use                   = true
bounded production use                    = true
global EMP.1.C                            = false
code compliance                           = false
release qualified                         = false
professional release ready                = false
```

Governing invariant:

`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_ELASTIC_MATERIAL_OR_SHELL_THEORY_SOURCE_AUTHORITY`

## Remaining primary closure

Before #1379 can be closed, repository evidence must still establish:

1. exact role of shell modulus `E` in the WRC derivation and cylindrical method;
2. whether absolute `E` cancels from final coefficients and under which assumptions;
3. Poisson-ratio treatment or embedded assumption;
4. constitutive assumptions beyond the now-qualified flexible-loading-surface/nonlinear-extension boundary;
5. host-shell versus attachment material requirements;
6. temperature/material-class restrictions;
7. exact primary-source locators for every retained positive material/theory rule.

## Protected authority boundary

This source-governance increment does not:

- add material fields or constitutive behavior to production;
- change WRC coefficients, gamma/beta, pressure, SCF, stress recovery, route or registry;
- change the P0 aggregate/current-state in this PR;
- alter source bytes, benchmarks, oracle, tolerance, evidence 01-12, workflows or UI;
- grant code, global EMP.1.C, release or deployment authority.

A downstream #1389 aggregate/current-state reconciliation is required **after merge** if this new #1379 status becomes current-main authority.
