# PR1316 Work Report — EMP1-14 WRC longitudinal-moment eight-point authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1316`
- `PR_STATE: DRAFT_READY_PENDING_EXECUTABLE_VALIDATION`
- `BRANCH: agent/emp1-14-longitudinal-eight-point-authority-20260821`
- `BASE_MAIN: 038be42656ba19779901019b3305fcb0d221c006`
- `ENGINEERING_CODE_HEAD: 83fd2cb2ce6d47f98a3e4a3c5bce27de43ee0920`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1316`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED` only for the existing bounded WRC 537 Table-5 eight-location shell-juncture route. Do not infer nozzle flexibility and do not promote the off-axis `1B-1/2B-1` curves into this route.

## Engineering finding and disposition

The retained WRC Table 5 identifies longitudinal-moment bending as `1B or 1B-1` and `2B or 2B-1`. The selector distinguishes:

- `AXIS_OF_SYMMETRY` -> `1B/2B`;
- `OFF_AXIS_MAXIMUM` -> `1B-1/2B-1`, with round flexible-nozzle applicability custody.

EMP1-09 already limits the bounded route to the eight Table-5 shell-juncture points:

```text
Au, Al, Bu, Bl, Cu, Cl, Du, Dl
```

and explicitly records that no continuous/intermediate-point search is performed and that the eight-point envelope is not guaranteed to be the absolute shell maximum.

Therefore EMP1-14 qualifies `1B/2B` for this **eight-point axis-of-symmetry recovery route only**. It does not infer flexible-nozzle behavior. `1B-1/2B-1` remain a separately guarded off-axis comparison capability and are explicitly unauthorized by this bounded route.

## Implemented authority contract

`EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY` binds and validates:

- pinned WRC source SHA-256;
- exact retained source locators for Table 5 / §4.4 / §4.3.6;
- exact recovery set and all eight A/B/C/D upper/lower locations;
- `continuousJunctureSearchPerformed = false`;
- `absoluteShellMaximumAssured = false`;
- production eight-point selection `1B/2B`;
- off-axis `1B-1/2B-1` explicitly `authorizedByThisRoute = false`;
- separate round-flexible-nozzle applicability requirement for any off-axis evaluation;
- exact object/nested-object shape;
- semantic hash;
- `productionObservationUsedToSetAuthority = false`.

The generic comparison selector is intentionally retained. The qualified numerics entry point instead requires the immutable eight-point authority object, so a caller cannot inject `OFF_AXIS_MAXIMUM` into production-qualified Table-5 numerics.

## Route state after EMP1-14

Resolved from active bounded-route suspension reasons:

```text
WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED                 [EMP1-12]
WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED    [EMP1-13]
WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED [EMP1-14]
```

Remaining active WRC source-authority suspension reason:

```text
WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED
```

The route remains `registered=false`, `engineeringUseAuthorized=false`, and production execution remains suspended. `OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM` remains outside this route, along with nonzero differential pressure, non-unity SCF/general Appendix-B SCF, non-tabulated gamma, beta outside the bounded dataset, global EMP.1.C, code-compliance and release authority.

## Falsifiers

The focused authority check now rejects:

1. missing longitudinal selection;
2. off-axis request without round attachment;
3. off-axis request without flexible-nozzle classification;
4. off-axis request without applicability source custody;
5. an eight-point authority mutated to `OFF_AXIS_MAXIMUM` / `1B-1,2B-1`;
6. a changed eight-point recovery location;
7. substituted source locators;
8. hidden/additional authority fields;
9. semantic-hash drift.

Route/public-product checks also assert that the resolved longitudinal blocker cannot reappear and that the remaining source suspension reason is §4.5 applicability only.

## Changed-file ledger

- `src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js` — source-qualified eight-point authority + strict validator; comparison off-axis selector retained separately.
- `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` — qualified numerics require eight-point longitudinal authority; comparison numerics retain explicit selector.
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` — route bound to eight-point `1B/2B`; longitudinal blocker removed; §4.5 remains.
- `src/core/emp1/emp1-c-bounded-route-registry.js` — registry exposes qualified longitudinal authority and off-axis exclusion.
- `src/core/emp1/emp1-public-product-contract.js` — stale sign-authority C label corrected to the actual remaining §4.5 applicability authority boundary.
- `src/core/emp1/index.js` — exports longitudinal authority contract.
- `scripts/emp1-wrc537-longitudinal-moment-curve-selection-check.mjs` — source/shape/recovery/off-axis/hash falsifiers.
- `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` — proves axis, r0 and longitudinal blockers closed while §4.5 remains.
- `scripts/emp1-public-product-check.mjs` — product/registry truth updated to one active WRC source blocker.
- `scripts/emp1-workbench-product-run-qualification.mjs` — concurrent aligned update: expects only §4.5 source suspension and asserts longitudinal blocker absent.
- `scripts/emp1-wrc537-r0-source-authority-check.mjs` — concurrent aligned update: carries longitudinal authority checks through prior r0 custody falsifiers.
- `docs/emp1/WRC537_2013_Longitudinal_Moment_Eight_Point_Authority.md` — durable source/authority ledger.
- `agents/PR1316_workreport.md` — living handover record.

## Validation ledger

### Source/static review — COMPLETE

- Retained Table 5 re-observed: `1B or 1B-1`; `2B or 2B-1`.
- Eight-point extrema contract re-observed: exactly 8 locations; no continuous search; no global-maximum claim.
- Qualified numerics call path reviewed: authority object is mandatory and determines `1B/2B`.
- Comparison selector remains separate and cannot acquire Table-5 eight-point production authority.
- No WRC coefficient, Table-5 equation/sign matrix, gamma/beta equation, frozen gamma5/gamma15 oracle, pressure policy or SCF arithmetic changed.

### GitHub Actions — NOT_RUN_EXECUTION_ENVIRONMENT

At engineering code head `83fd2cb2ce6d47f98a3e4a3c5bce27de43ee0920`:

- EMP.1 gamma5 bounded route: run `32489621624` — GitHub conclusion `failure`, but job `96793963116` reports `steps=null`, `logs_url=null`;
- EMP.1 current-main independent baseline: run `32489621554` — GitHub conclusion `failure` before usable test evidence;
- EMP.1 runEmp1 bounded gamma5 orchestration: run `32489621576` — GitHub conclusion `failure` before usable test evidence.

This is the same zero-step runner/startup condition observed on PR1315 and earlier heads. No test command is demonstrated to have executed. These runs are therefore **not software FAIL evidence and not PASS evidence**; exact-head runtime qualification remains `NOT_RUN_EXECUTION_ENVIRONMENT`.

### Local full-repository runtime — NOT_RUN

No usable matching local repository checkout/runtime is available in this connector-only environment. No local PASS is claimed.

## Protected invariants

- No WRC curve coefficient changes.
- No Table-5 dimensional stress equation or sign changes.
- No frozen gamma5/gamma15 oracle change.
- No inferred flexible-nozzle classification.
- No promotion of `1B-1/2B-1` into the eight-point route.
- No claim that eight Table-5 locations are the absolute shell maximum.
- No production route registration.
- No global EMP.1.C, code compliance or release authority.

## Next action after PR1316 merge

EMP1-15 should address the remaining `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` blocker. Before changing its current rules, independently re-open and arbitrate WRC §4.5.1/§4.5.2 source text because earlier retained/web evidence suggested the radial-load length wording may be more nuanced than the current distilled `P_REQUIRES_L_GE_RM` rule. Do not widen or alter the applicability domain without direct source proof.

## Appendix A — takeover qualification

1. Why does Table 5 saying `1B or 1B-1` not authorize arbitrary curve selection?
2. Why is `1B/2B` qualified for this route without classifying the nozzle as flexible?
3. What exact software boundary prevents `1B-1/2B-1` from entering qualified eight-point numerics?
4. Why may the comparison selector retain off-axis evaluation while production authority remains false for that scope?
5. What evidence would be required to create a separate production off-axis maximum route?
6. Why is the eight-point envelope not a global absolute shell maximum?
7. Which single active WRC source-authority suspension reason remains after EMP1-14?
8. What §4.5 wording must be re-arbitrated before EMP1-15 changes the current radial-load length rule?
