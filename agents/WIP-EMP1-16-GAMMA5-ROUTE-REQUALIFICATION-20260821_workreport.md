# WIP — EMP1-16 gamma5 route refreeze / requalification

## Recovery header
- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `BRANCH: agent/emp1-16-gamma5-route-requalification-20260821`
- `BASE_MAIN: 9882ab152bfe2676bc915a5f93ad6b69a01a58f8`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission
Refreeze and requalify the bounded WRC 537 cylindrical gamma=5 zero-dP Table-5 route after EMP1-12..15 closed axis/sign, r0 source, longitudinal-curve, and §4.5 source-authority defects. Do not reactivate production until an independent physical global-load -> WRC-load -> 32-value Table-5 oracle is frozen, route falsifiers pass, and a new qualification identity replaces the historical pre-EMP1-12..15 record.

## Protected invariants
- No change to WRC coefficients or Table-5 equations unless the independent oracle disproves them.
- gamma = Rm/T; beta = 0.875*r0/Rm.
- gamma=5 exact source table only; no interpolation/fallback.
- Kn=Kb=1 only.
- zero differential pressure only.
- eight Table-5 shell-juncture points only; no global absolute maximum claim.
- longitudinal bending uses source-qualified 1B/2B eight-point authority; 1B-1/2B-1 remain off-axis comparison only.
- +P/+Vc/+Vl/+Mc/+Ml/+Mt polarity must come from qualified cylindrical axis authority, not raw foundation eZ.
- r0 must come from qualified outside-diameter-at-shell-juncture authority.
- §4.5 applicability must come from typed cylinder-length/attachment-station authority.
- global EMP.1.C, code compliance, and release authority remain false.

## Current blocker
`WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`

## Plan
1. Re-observe the full current route authority chain on merged main.
2. Build an independent physical benchmark from global geometry/loads, not preselected WRC signs.
3. Independently derive WRC loads and 32 Table-5 expected stress values.
4. Freeze a new qualification record/hash with explicit source/authority identities.
5. Add fail-closed falsifiers for axis/r0/§4.5/curve/load/reference/hash drift and legacy qualification reuse.
6. Only after executable evidence passes, update route/registry authorization for the bounded route; global C/release remain false.
7. Keep one permanent PR workreport after PR allocation.

## Validation ledger
- Successor baseline: `NOT_RUN`.
- Independent physical vector: `NOT_RUN`.
- GitHub Actions: `NOT_RUN`.

## Exact next action
Inspect current independent hand-calculation/oracle scripts and source data, then define the new physical benchmark and expected vector without reading production route output as the oracle.
