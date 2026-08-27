# EMP.1 bounded WRC 537 P0 source-semantics gate

Status: `BLOCKED_P0_SOURCE_SEMANTICS`

This record is the Issue #1389 aggregate reconciliation layer for the bounded WRC 537 (2013) professional release. It does not replace the individual source-qualification artifacts and it does not itself grant route, engineering, production, deployment, global EMP.1.C, code-compliance or release authority.

## Current result

Two statements are simultaneously true on current `main` and must not be collapsed into one authority flag:

```text
bounded gamma=5 / zero-dp route authorized = true
professional P0 source-semantics readiness  = false
```

Current route/runtime authority is independently owned by the production route and bounded registry:

```text
bounded route authorized          = true
bounded engineering use           = true
bounded production use            = true
registry registered               = true
global EMP.1.C authority          = false
release qualified                 = false
code compliance                   = NOT ASSESSED / false
```

The P0 aggregate remains blocked because nine release-critical authority gates remain source-blocked:

1. cylindrical recovery surface and sign semantics — #1385;
2. stress-intensity reconstruction semantics — #1383;
3. shell-thickness basis — #1375;
4. cylindrical mean-radius basis — #1377;
5. elastic material / shell-theory applicability — #1379;
6. physical attachment-axis normality — #1368;
7. cylindrical attachment class — #1370;
8. nearby-attachment / discontinuity isolation — #1373;
9. WRC-versus-code-acceptance boundary — #1381.

The controlling invariant is:

`BOUNDED_ROUTE_AUTHORIZATION_DOES_NOT_CLOSE_P0_SOURCE_SEMANTICS_OR_PROFESSIONAL_RELEASE_GATES`

Route authorization therefore cannot be used as evidence that a still-blocked physical/source interpretation has been resolved.

## Machine-readable state

The aggregate authority map is:

`validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`

and the reconciler is:

`scripts/emp1-professional-p0-source-semantics-check.mjs`

The JSON deliberately separates:

- `authority` — authority granted by this aggregate source gate itself; all values remain false;
- `currentLiveRouteState` — independently observed current route/registry state.

`authority.engineeringUseAuthorized=false` therefore no longer means that the current bounded runtime route is unauthorized. It means only that this aggregate P0 source gate grants no engineering authority by itself.

## Current source-record reconciliation

All nine gate artifacts remain fail-closed. Four retained source records now have more precise partial-reconciliation status strings than the original PR-B snapshot:

```text
#1385 BLOCKED_PARTIAL_TABLE5_SIGN_AUTHORITY_PHYSICAL_SURFACE_SEMANTICS_UNQUALIFIED
#1383 BLOCKED_PARTIAL_TABLE5_STRESS_INTENSITY_FORMULA_AUTHORITY_PLANE_STRESS_SEMANTICS_UNQUALIFIED
#1375 BLOCKED_WRC_SHELL_THICKNESS_PHYSICAL_BASIS_UNRESOLVED_TABLE5_ROLE_RECONCILED
#1377 BLOCKED_PARTIAL_TABLE5_RM_SYMBOL_AND_PARAMETER_ROLE_PHYSICAL_RADIUS_DEFINITION_UNQUALIFIED
```

The #1377 refinement became current-main authority when PR #1415 merged at `19b762e1f9512284da961e5816a28c10432080bb`. It qualifies only the retained Table-5 `R_m` symbol and its gamma/beta parameter role. It does **not** qualify the physical mean/midsurface definition, OD/ID/T construction, assessment/corrosion geometry basis, or §4.5 physical radius identity.

Those partial source facts do not close the corresponding professional P0 gates. `blockerCount` therefore remains exactly 9.

## Two checker modes

Normal inspection mode verifies simultaneously that:

- all nine retained source artifacts remain `BLOCKED_*` and match the controlled WRC SHA-256;
- the frozen release profile remains definition-only, code-unassessed and release-unqualified;
- the actual bounded route is authorized and registered on current production state;
- global EMP.1.C and release qualification remain false;
- this aggregate gate grants no engineering/production/code/release authority.

A successful normal inspection means **the current authorized-route/source-blocker representation is internally consistent**. It does not mean the professional release is ready.

`--require-ready` is the professional source-readiness mode. While any of the nine source gates remains blocked it must terminate non-zero. It may not be bypassed by current route authorization, a matching production result, CAUx output, secondary/OCR interpretation, or a widened tolerance.

## Source boundary

The exact controlled source identity remains:

`WRC537_2013 raw PDF SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

Current connected repository access exposes the controlled PDF object but does not provide directly inspectable primary PDF page content. Direct primary-page re-observation therefore remains `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT` and no secondary/OCR statement is promoted into primary-source authority.

## Frozen release-profile boundary

The v1 release profile remains the frozen pre-authorization definition:

`EMP1_WRC537_2013_CYLINDRICAL_GAMMA5_ZERO_DP_V1`

Its `releaseAuthority` booleans remain false by design and are not rewritten to mirror later route authorization. Current runtime route state is read from the real production authority points instead. A semantic change to the frozen release profile requires a new profile version/qualification under Issue #1389 AD-11.

## What remains blocked

Current bounded route execution does not establish professional release readiness. The nine P0 source gates remain blocked, direct primary-page re-observation remains unavailable, code compliance remains unassessed, global EMP.1.C authority remains false, release qualification remains false, and Issue #54 continues to prevent hosted exact-head engineering execution.
