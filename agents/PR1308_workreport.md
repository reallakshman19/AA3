# PR1308 Work Report — EMP1-06 WRC longitudinal-moment curve selection

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1308`
- `BRANCH: agent/emp1-06-longitudinal-curve-selection-20260821`
- `BASE_MAIN: 564b67a478dd660fbf39e780f289f4739c0e7261`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1308`
- `GAMMA5_PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`

## Finding

The prior cylindrical adapter statically selected WRC537 Figures `1B-1` and `2B-1` for longitudinal-moment bending. WRC Table 5 says `1B or 1B-1` and `2B or 2B-1`; WRC §4.4 identifies the `-1` curves as off-axis maximum-stress curves and limits their stated applicability, to the best of WRC knowledge, to a round flexible nozzle connection.

## Implemented repair

- removed `1B-1/2B-1` from the static figure map;
- added `emp1-wrc537-longitudinal-moment-curve-selection.js` as the single selector authority;
- `AXIS_OF_SYMMETRY` selects `1B/2B`;
- `OFF_AXIS_MAXIMUM` selects `1B-1/2B-1` only when ROUND + FLEXIBLE_NOZZLE + applicability source reference are explicit;
- missing, rigid/other, non-round and missing-source off-axis requests fail closed;
- the gamma5 comparison candidate uses axis-of-symmetry `1B/2B`, avoiding an invented flexible-nozzle assumption;
- added production blocker `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED` in addition to the existing cylindrical axis-sign blocker.

## Non-scope

No WRC coefficient, curve-fit polynomial, Table-5 dimensional stress equation, pressure policy, Kn/Kb rule, gamma/beta domain, load-transfer mechanics or FEM path is changed. No production route is reauthorized.

## Validation

- Local connector execution: `NOT_RUN`.
- PR workflows: `PENDING` at report creation.
- Required checks: longitudinal-moment selector falsifiers, gamma5 fail-closed authority, independent Table-5 oracle, zero-dp load producer, public-product truth.

## Exact next action

Qualify PR #1308. Do not merge without explicit owner authorization for this PR. After this item, continue with WRC physical-geometry custody (`r0` outside radius / shell applicability limits) while the production C route remains fail closed.

## Appendix A

1. Why is `ROUND` alone insufficient authority for `1B-1/2B-1`?
2. What physical meaning distinguishes `1B/2B` from `1B-1/2B-1`?
3. Which exact failure conditions must prevent off-axis selection?
4. Why does this PR keep the gamma5 production route suspended?
5. Which WRC numerical equations are intentionally unchanged?
