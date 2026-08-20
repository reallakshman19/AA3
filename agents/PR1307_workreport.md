# PR1307 Work Report — EMP1-05 cylindrical WRC load-axis authority containment

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1307`
- `BRANCH: agent/emp1-05-suspend-axis-authority-20260821`
- `BASE_MAIN: 8fe449d1be72db78a38cbdf55594a4a0fe847ea2`
- `VALIDATED_EXACT_HEAD_BEFORE_REPORT_REFRESH: 1cf21273a28af00c2ece1fb5f5fc32ce64013159`
- `PR_STATE: OPEN_READY_TO_MERGE_AFTER_DOCS_ONLY_REOBSERVATION`
- `MERGE_AUTHORITY: GRANTED_BY_OWNER`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `GAMMA5_PRODUCTION_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: FAIL_CLOSED_AXIS_SIGN_CONTAINMENT_QUALIFIED`

## Purpose

Fail closed the bounded WRC537 cylindrical Original gamma=5 production route because the retained WRC method-definition authority does not resolve the positive directions for the cylindrical WRC load set `V_C`, `V_L`, `M_C`, `M_L`, and `M_t`.

The implementation deliberately does **not** choose a handedness convention from memory, a secondary software convention, or the existing production transform. The Table-5 numerical kernel remains available only as comparison/qualification evidence until primary-source sign arbitration is complete.

## Source finding

`docs/01_WRC537_METHOD_DEFINITION.md`, §9.3 retains:

- `V_C` positive direction: `UNRESOLVED`;
- `V_L` positive direction: `UNRESOLVED`;
- `M_C` positive direction: `UNRESOLVED`;
- `M_L` positive direction: `UNRESOLVED`;
- `M_t` positive direction: `UNRESOLVED`.

Therefore the prior route-level `engineeringUseAuthorized=true` / `registered=true` claim is not supportable even though the frozen gamma=5 Table-5 arithmetic reproduces its comparison oracle.

## Implemented containment

1. `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED=false`.
2. Route suspension reason is machine-readable: `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`.
3. The route registry keeps the historical bounded route visible for evidence comparison, but sets:
   - `registered=false`;
   - `engineeringUseAuthorized=false`;
   - `comparisonQualificationAvailable=true`.
4. The candidate evaluator remains comparison-only and returns `engineeringUseAuthorized=false` plus `engineeringComparisonUseAuthorized=true`.
5. Production execution throws `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED` before a production result can be returned.
6. Public EMP.1 projection falls back to the existing global fail-closed C qualification state rather than advertising a bounded route as available.
7. Dedicated source guard re-observes the unresolved sign rows from the retained method definition and proves production execution is blocked while the eight-point comparison calculation remains numerically executable.
8. Historical gamma5/orchestration workflows are changed from proving production authorization to proving fail-closed suspension and preserving the independent Table-5 comparison oracle.

## Protected invariants / non-scope

No change is made to:

- WRC Table-5 dimensional equations;
- curve-fit coefficients or dataset hash;
- gamma=5 or beta=0.05..0.50 comparison domain;
- zero-differential-pressure load producer mechanics;
- Kn=Kb=1 bounded comparison assumption;
- pressure-thrust policy;
- FEM formulation/meshing/solver paths;
- global EMP.1.C authority;
- code-compliance interpretation;
- release qualification.

No cylindrical WRC load sign is guessed or silently corrected in this PR.

## Changed-file ledger

| Path | Type | Purpose |
|---|---|---|
| `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` | production authority | suspend route and retain comparison-only candidate |
| `src/core/emp1/emp1-c-bounded-route-registry.js` | production registry | unregister route and expose suspension reason |
| `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` | qualification | source guard + production-block falsifier |
| `scripts/emp1-public-product-check.mjs` | qualification | prove product falls back to fail-closed C state |
| `.github/workflows/emp1-gamma5-main-route.yml` | CI | re-observe comparison kernel + suspended route truth |
| `.github/workflows/emp1-03-runemp1-orchestration.yml` | CI | stop asserting production C execution while authority is suspended |
| `agents/PR1307_workreport.md` | handover | living recovery/evidence record |

## Validation ledger

Exact PR head `1cf21273a28af00c2ece1fb5f5fc32ce64013159`:

- `EMP.1 gamma5 bounded route on current main` — **PASS**, run `32419935459`.
  - independent gamma5 Table-5 oracle re-observed;
  - zero-dp load producer re-observed;
  - comparison kernel remains executable;
  - production route and registry fail closed on unresolved cylindrical axis-sign authority.
- `EMP.1 runEmp1 bounded gamma5 orchestration` — **PASS**, run `32419935488`.
  - independent gamma5 hand calculation retained;
  - fail-closed axis-authority guard PASS;
  - public-product containment PASS;
  - core scaffold compatibility PASS.
- `EMP.1 current-main independent baseline` — **PASS**, run `32419935464`.
- Branch comparison at PR creation — **PASS**, `0 behind` current main.
- Local connector runtime execution — **NOT_RUN**; no local PASS is claimed.
- Production gamma5 route — **INTENTIONALLY BLOCKED**, not a validation failure.

This report refresh is documentation-only. Any workflows triggered by this final report commit must remain green before merge; no production or qualification source changed after exact head `1cf21273...`.

## Reopen / reauthorization conditions

The gamma5 production route may be re-enabled only after all of the following are true:

1. exact pinned WRC source establishes the cylindrical positive directions for `P`, `V_C`, `V_L`, `M_C`, `M_L`, and `M_t`;
2. the LAFEA/EMP.1 source frame is mapped to those WRC directions with a source-located contract;
3. at least one independent physical-vector falsifier starts from global geometry/loads rather than preselected WRC component signs;
4. Table-5 location/sign results are re-frozen after that mapping;
5. any governing-location changes are reconciled in UI/evidence;
6. the route qualification hash and registry authorization are newly issued rather than reusing the superseded authorization.

## Exact next action

Merge after the docs-only exact-head re-observation passes. Then proceed to the next audit defect: source-governed selection between WRC cylindrical longitudinal-moment curves `1B` versus `1B-1` and `2B` versus `2B-1`, which currently lacks an attachment-flexibility authority discriminator.

## Appendix A — next-agent qualification questions

1. Why is matching the frozen Table-5 oracle insufficient to establish WRC cylindrical load-axis authority?
2. Which exact cylindrical load-component positive directions remain unresolved in the retained source definition?
3. What is the distinction between `engineeringComparisonUseAuthorized` and production `engineeringUseAuthorized` after this PR?
4. Why must the production route be unregistered rather than merely showing a UI warning?
5. What source and independent-vector evidence is required before reauthorization?
6. Which Table-5 mathematics are intentionally unchanged by this containment PR?
7. What is the next independent WRC defect to address after sign authority containment?
