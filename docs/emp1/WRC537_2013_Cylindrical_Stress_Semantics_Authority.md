# WRC 537 cylindrical stress-semantics authority — current bounded-route reconciliation

## Status

`BLOCKED_CURRENT_ROUTE_AUTHORIZED_STRESS_SEMANTICS_SOURCE_GATES_UNQUALIFIED`

This document reconciles Issues #1383 and #1385 against the current bounded WRC 537 gamma=5 / zero-differential-pressure route state. It does not add source authority and it does not change production numerics.

The key current-state rule is:

> Bounded route authorization does not back-propagate into WRC stress-reconstruction, physical surface/common-point, plane-stress / sigma3 / Tresca, envelope, or code-acceptance authority.

## Current bounded route state

On the current reconciled production route:

```text
bounded WRC route authorized      = true
registry registered               = true
bounded engineering use           = true
bounded production use            = true
global EMP.1.C route authority    = false
code compliance authority         = false
release qualified                 = false
professional release ready        = false
```

The route is therefore usable only inside its separately authorized bounded runtime contract. That runtime authorization does not prove unresolved source semantics.

## Retained source authority already qualified

### Issue #1385 — sign/reversal subset

The retained Table-5 source-validation chain qualifies the algebraic sign placement for the six load families used by the cylindrical computation sheet and reversal of applicable signs for opposite load direction.

That does **not** establish:

- physical meaning of `u/l`;
- physical A/B/C/D location identity;
- physical inner/outer surface reconstruction from membrane and bending terms;
- proof that all load-family terms have been reconstructed at one common physical point before stress intensity is evaluated.

### Issue #1383 — Combined Stress Intensity subset

The retained Table-5 text qualifies that a `COMBINED STRESS INTENSITY` post-processing step follows algebraic stress-component formation and uses combined `sigma_phi`, `sigma_x`, and `tau`, with retained like-sign, unlike-sign, and zero-shear cases.

That does **not** establish an explicit WRC primary-source statement for:

- plane stress;
- `sigma3 = 0`;
- the principal-stress equations used by the current implementation;
- the exact definition of stress intensity as twice maximum shear / maximum principal-stress difference;
- a von-Mises alternative policy;
- the physical surface/common-point timing of the reconstruction;
- an eight-point envelope as a WRC-defined global maximum;
- code acceptance.

## Current implementation versus source authority

The production Table-5 implementation remains numerically unchanged. It evaluates the eight retained Table-5 locations and its current `planeStressTresca()` implementation is internally reproducible.

That mathematical implementation is not a substitute for source authority. In particular:

```text
implementation uses sigma3 = 0
!=
primary WRC source explicitly qualifies sigma3 = 0
```

and:

```text
implementation returns a Tresca-style maximum principal difference
!=
primary WRC source definition and downstream code acceptance are proven
```

Likewise, array identities such as `Au`, `Al`, `Bu`, `Bl`, `Cu`, `Cl`, `Du`, `Dl` are not sufficient by themselves to prove physical `upper/lower`, inside/outside, or A/B/C/D orientation semantics.

## Authority matrix

| Question | Current state |
|---|---|
| Table-5 sign placement / reversal | Qualified retained-source subset |
| Table-5 combined-stress-intensity calculation order | Qualified retained-source subset |
| Physical `u/l` surface meaning | **BLOCKED** |
| Physical A/B/C/D location mapping | **BLOCKED** |
| Membrane ± bending physical surface reconstruction | **BLOCKED** |
| Common physical point superposition | **BLOCKED** |
| Explicit WRC plane-stress statement | **BLOCKED** |
| Explicit WRC `sigma3=0` statement | **BLOCKED** |
| Exact WRC principal-stress reconstruction | **BLOCKED** |
| Exact WRC Tresca/twice-maximum-shear definition | **BLOCKED** |
| von-Mises alternative authority | **BLOCKED** |
| WRC-defined eight-point/global envelope meaning | **BLOCKED** |
| Code acceptance implication | **BLOCKED** |

## Fail-closed rules

Until direct or separately provenance-qualified primary authority closes the relevant item:

1. Do not infer physical surfaces from `u/l` labels.
2. Do not infer physical A/B/C/D orientation from array ordering or secondary summaries.
3. Do not assert a physical membrane-plus/minus-bending reconstruction without primary authority.
4. Do not assume common-point superposition merely because the numerical arrays can be added.
5. Do not claim explicit WRC plane-stress or `sigma3=0` authority because the implementation uses those mathematics.
6. Do not replace Tresca with von Mises, or claim either as source-authorized beyond the retained Table-5 wording.
7. Do not call the maximum over eight evaluated Table-5 points a continuous/global absolute maximum.
8. Do not infer code acceptance from a WRC stress-intensity result.
9. Do not use bounded route authorization to widen any of the source gates above.

## Source custody

```text
Document: WRC 537
Edition: 2013
Raw PDF SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
Git blob: ce861233928154145a9257efbbf8dbef3f5a17d1
Retained Table-5 transcription: docs/emp1/WRC537_2013_Tables_and_Charts.md
Retained pages: 41-42
Direct primary-page observation in this connected environment: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

## Closure requirements

The remaining source-semantic gate requires direct or separately proven primary authority for physical surface/location identity, physical stress reconstruction/common-point semantics, and the exact stress-intensity theory statements being claimed. Any code-compliance decision remains a separate downstream authority and must be qualified independently.

This reconciliation changes no production Table-5 evaluator, route/registry state, aggregate P0 release gate, benchmark/oracle/tolerance, workflow, global EMP.1.C authority, code authority, or release authority.
