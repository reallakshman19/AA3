# PR1316 Work Report — EMP1-14 WRC longitudinal-moment eight-point authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1316`
- `PR_STATE: DRAFT_IMPLEMENTING`
- `BRANCH: agent/emp1-14-longitudinal-eight-point-authority-20260821`
- `BASE_MAIN: 038be42656ba19779901019b3305fcb0d221c006`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1316`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED` only for the existing bounded WRC 537 Table-5 eight-location shell-juncture route. Do not infer nozzle flexibility and do not promote the off-axis `1B-1/2B-1` curves into this route.

## Engineering finding

The retained WRC Table 5 identifies longitudinal-moment bending as `1B or 1B-1` and `2B or 2B-1`. The existing selector correctly distinguishes:

- `AXIS_OF_SYMMETRY` -> `1B/2B`;
- `OFF_AXIS_MAXIMUM` -> `1B-1/2B-1`, with round flexible-nozzle applicability custody.

EMP1-09 already limits the bounded production candidate to the eight Table-5 points `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` and explicitly states that this is not a continuous/global maximum search. Therefore the bounded Table-5 route needs axis-of-symmetry recovery only. It must not require or infer flexible-nozzle authority.

## Planned repair

1. Add a source-qualified Table-5 eight-point longitudinal-moment authority contract.
2. Bind that contract to the eight-point recovery domain and `1B/2B` only.
3. Keep `1B-1/2B-1` as a separate off-axis-maximum comparison capability, not part of bounded production authority.
4. Make the route and registry state explicit: eight-point selection source-qualified; off-axis maximum unsupported by this route.
5. Add falsifiers proving `-1` figures cannot enter the eight-point production route.
6. Remove only `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED` after those gates are wired.
7. Preserve the remaining §4.5 applicability blocker and all global/non-unity/nonzero-dP limitations.

## Validation ledger

- Local repository runtime: `NOT_RUN` in this connector-only environment.
- GitHub Actions: pending implementation / current repo Actions may still exhibit the zero-step runner condition observed on PR1315.
- Source review: WRC Table 5 retained repo transcription directly re-observed; selector semantics re-observed on current main.

## Protected invariants

- No WRC curve coefficient changes.
- No Table-5 stress equation/sign changes.
- No frozen gamma5/gamma15 oracle change.
- No inferred flexible-nozzle classification.
- No claim that eight Table-5 locations are the absolute shell maximum.
- Production/global EMP.1.C remain fail closed.

## Next action

Implement the eight-point authority contract, route/registry integration, independent falsifiers, UI/product truth, and exact-head qualification record.

## Appendix A

1. Why does Table 5 saying `1B or 1B-1` not authorize picking either curve arbitrarily?
2. Why is `1B/2B` the appropriate bounded-route choice when recovery is restricted to the eight Table-5 A/B/C/D locations?
3. Why must `1B-1/2B-1` remain separate from this eight-point route?
4. What evidence would be required before an off-axis maximum route could be production-authorized?
5. Which remaining source blocker survives after EMP1-14?
