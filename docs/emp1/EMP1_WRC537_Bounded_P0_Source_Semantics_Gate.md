# EMP.1 bounded WRC 537 P0 source-semantics gate

Status: `BLOCKED_P0_SOURCE_SEMANTICS`

This record is the Issue #1389 aggregate reconciliation layer for the bounded WRC 537 (2013) professional release. It does not replace individual source-qualification artifacts and it does not itself grant route, engineering, production, deployment, global EMP.1.C, code-compliance or release authority.

## Current result

Two statements remain simultaneously true on current `main`:

```text
bounded gamma=5 / zero-dp route authorized = true
professional P0 source-semantics readiness  = false
```

Current route/runtime authority remains independently owned by the production route and bounded registry:

```text
bounded route authorized          = true
bounded engineering use           = true
bounded production use            = true
registry registered               = true
global EMP.1.C authority          = false
release qualified                 = false
code compliance                   = NOT ASSESSED / false
```

The P0 aggregate remains blocked because all nine professional source/acceptance gates remain `BLOCKED_*`:

1. cylindrical recovery surface and sign semantics — #1385;
2. stress-intensity reconstruction semantics — #1383;
3. shell-thickness basis — #1375;
4. cylindrical mean-radius / assessment-geometry basis — #1377;
5. elastic material / shell-theory applicability — #1379;
6. physical attachment-axis normality — #1368;
7. cylindrical attachment class — #1370;
8. nearby-attachment / discontinuity isolation — #1373;
9. WRC-versus-code-acceptance boundary — #1381.

The controlling invariant remains:

`BOUNDED_ROUTE_AUTHORIZATION_DOES_NOT_CLOSE_P0_SOURCE_SEMANTICS_OR_PROFESSIONAL_RELEASE_GATES`

## Current #1377 reconciliation after PR #1497

PR #1497 merged to `main` at `e6c76ac02e6ed2052e9c87e0691bb728f2031f5b` and advanced the #1377 source record.

The cylindrical physical meaning of `R_m` is no longer unresolved. Directly readable 2013 WRC 537 text identifies `R_m` as cylindrical shell mean radius and §4.2.1 describes the shell parameter as shell mid-radius divided by shell thickness. The same cylindrical `R_m` is used in round-attachment beta and the retained §4.5 radius-based applicability relations.

The #1377 aggregate status is therefore now:

`BLOCKED_PARTIAL_PRIMARY_4_2_1_MID_RADIUS_QUALIFIED_ASSESSMENT_GEOMETRY_BASIS_UNQUALIFIED`

This is still a blocker. What remains unresolved is not the definition of WRC cylindrical `R_m`, but the engineering/source custody needed to prove that retained diameter and thickness values represent one compatible physical wall state. Nominal/corroded/measured/local geometry, ovality, local thinning and modified-shell geometry remain outside qualified source policy.

No blocker is removed and `blockerCount` remains exactly 9.

## Source-custody distinction

The controlled source identity remains:

`WRC537_2013 raw PDF SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

The #1497 source record distinguishes:

```text
external primary-document text observation           = PASS_TEXT_OBSERVED
external-rendering byte identity with pinned PDF      = UNPROVEN
pinned PDF direct-page re-observation                 = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

The aggregate does not convert that external text observation into byte-for-byte custody of the pinned PDF.

## Machine-readable state

Aggregate authority map:

`validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`

Reconciler:

`scripts/emp1-professional-p0-source-semantics-check.mjs`

The checker remains data-driven: each aggregate row must exactly match the corresponding individual source artifact status, each source artifact must remain bound to the controlled WRC source hash, and all nine rows must remain blocked until their own source/acceptance closure occurs.

## Current source-record statuses

```text
#1385 BLOCKED_PARTIAL_TABLE5_SIGN_AUTHORITY_PHYSICAL_SURFACE_SEMANTICS_UNQUALIFIED
#1383 BLOCKED_PARTIAL_TABLE5_STRESS_INTENSITY_FORMULA_AUTHORITY_PLANE_STRESS_SEMANTICS_UNQUALIFIED
#1375 BLOCKED_WRC_SHELL_THICKNESS_PHYSICAL_BASIS_UNRESOLVED_TABLE5_ROLE_RECONCILED
#1377 BLOCKED_PARTIAL_PRIMARY_4_2_1_MID_RADIUS_QUALIFIED_ASSESSMENT_GEOMETRY_BASIS_UNQUALIFIED
#1379 BLOCKED_PRIMARY_ELASTIC_MATERIAL_AND_SHELL_THEORY_AUTHORITY_UNRESOLVED
#1368 BLOCKED_PRIMARY_INTERSECTION_RULE_NOT_DIRECTLY_VERIFIED
#1370 BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED
#1373 BLOCKED_NEARBY_ATTACHMENT_INTERACTION_AUTHORITY_UNRESOLVED
#1381 BLOCKED_CODE_CLASSIFICATION_AND_ACCEPTANCE_AUTHORITY_UNQUALIFIED
```

## Checker meaning

A normal-mode PASS means the fail-closed representation is internally consistent. It does not mean professional source readiness is achieved.

`--require-ready` must remain non-zero while any of the nine source gates remains blocked. Bounded route authorization, matching production output, CAUx output, secondary/OCR interpretation or tolerance changes cannot bypass that gate.

## Frozen release-profile boundary

The v1 release profile remains frozen:

`EMP1_WRC537_2013_CYLINDRICAL_GAMMA5_ZERO_DP_V1`

Its release-authority booleans remain false by design. A semantic release-profile change requires a new profile version/qualification under Issue #1389 AD-11.

## What remains blocked

Professional P0 source readiness remains false. Direct pinned-PDF page re-observation remains unavailable, code compliance remains not assessed, global EMP.1.C authority remains false, release qualification remains false, genuine evidence 01–12 remains absent, and Issue #54 continues to prevent hosted exact-head engineering execution.
