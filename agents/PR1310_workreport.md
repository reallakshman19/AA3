# PR1310 Work Report — EMP1-08 WRC 537 §4.5 cylindrical applicability

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1310`
- `BRANCH: agent/emp1-08-wrc-45-applicability-20260821`
- `BASE_MAIN: 5a45c8e9d79c732e0426972eef01ead01dca63e9`
- `VALIDATED_CODE_HEAD: 783f9adcd6319de7c0694c9cd8c11c42046e6d5f`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1310`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `QUALIFICATION_STATE: PASS_READY_FOR_OWNER_MERGE_DECISION`

## Finding

The bounded cylindrical WRC path previously controlled gamma/beta and r0 but did not encode the retained WRC 537 §4.5 applicability statements before Table-5 comparison numerics. A known short-cylinder radial-load case or a near-end external-moment case could therefore reach Table-5 evaluation without an explicit source-limit decision. Table-5 output also lacked a machine-readable statement that WRC 537 computes host-shell stresses rather than attachment/nozzle stresses.

## WRC source interpretation frozen in this PR

- §4.5.1: when radial load `P` is evaluated, `l < Rm` is outside the stated applicability; equality `l = Rm` is not excluded and is treated as the boundary PASS.
- §4.5.2: when overturning `Mc` or `Ml` is evaluated, nearest cylinder-end distance must be `>= 0.5 Rm`; equality passes.
- §4.5.3: the calculated stresses belong to the host cylindrical shell at the attachment-shell juncture, not to the nozzle/attachment.
- No §4.5.1/.2 geometric limit is invented for shear/torsion-only loading (`Vc`, `Vl`, `Mt`).

## Implemented repair

- added `emp1-wrc537-cylindrical-applicability.js` as the single §4.5 policy evaluator;
- explicit known source-limit violations are rejected before curve/Table-5 evaluation;
- missing cylinder-length/end-distance evidence remains `INCOMPLETE_WRC537_4_5_SOURCE_EVIDENCE`, never a production PASS;
- equality boundary cases `l/Rm = 1` and nearest-end-distance/Rm = `0.5` are tested as PASS for comparison;
- Table-5 result schema carries a shell-only stress-scope contract;
- bounded-route registry exposes the §4.5 rules and shell-only result domain;
- added production suspension reason `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` because current LAFEA source evidence does not independently carry/derive cylinder length and nearest-end distance;
- production gamma5 route remains suspended.

## Numerical / authority non-scope

No WRC coefficient data, curve-fit polynomial, Table-5 dimensional stress equation, load-axis sign convention, pressure policy, Kn/Kb rule, gamma/beta bounds, load-transfer mechanics, or FEM path was intentionally changed.

## Validation

Exact engineering code head `783f9adcd6319de7c0694c9cd8c11c42046e6d5f`:

- `EMP.1 current-main independent baseline` — **PASS**, run `32450844027`.
  - independent baseline remained green after Table-5 restructuring.
- `EMP.1 gamma5 bounded route on current main` — **PASS**, run `32450844009`.
  - retained independent Table-5 oracle PASS;
  - r0 outside-radius custody PASS;
  - new WRC §4.5 applicability policy/falsifiers PASS;
  - longitudinal-moment selection PASS;
  - zero-dp load producer PASS;
  - production route remains fail closed;
  - public EMP.1 product truth remains blocked for production C.
- `EMP.1 runEmp1 bounded gamma5 orchestration` — **PASS**, run `32450844010`.
- Local full-repository execution: `NOT_RUN`; no local repository regression PASS is claimed.
- Local syntax checks on the prepared JS/MJS changes were PASS via `node --check` before publication.

This workreport replaces the WIP record and is documentation-only relative to the validated engineering head above.

## Current production suspension reasons

1. `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`
2. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
3. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`
4. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

## Exact next action

PR #1310 is qualified and ready for the owner merge decision. Do not merge without explicit owner authorization for PR #1310. After merge, continue with the audit finding that the eight Table-5 A/B/C/D upper/lower recovery points do not prove a global absolute maximum for arbitrary combined loading; output semantics must not overstate the eight-point maximum.

## Appendix A — takeover qualification

1. Why is the `l >= Rm` rule conditional on radial load `P` in this implementation rather than applied to every six-component load case?
2. Which WRC load components trigger the `0.5 Rm` end-distance rule here, and what source statement supports that scope?
3. What is the distinction between `INCOMPLETE_WRC537_4_5_SOURCE_EVIDENCE` and `OUTSIDE_WRC537_4_5_SOURCE_LIMITS`?
4. Why does an equality-boundary comparison PASS still not authorize production use?
5. Which result fields prevent host-shell stress from being represented as nozzle/attachment stress?
6. Which numerical Table-5 equations were deliberately left unchanged and how was that independently checked?
