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

## Qualification-record custody

The existing route qualification record SHA

```text
3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e
```

is retained as the historical bounded gamma5 numerical qualification-record identity. EMP1-14 does **not** treat that older record as the authority for the new longitudinal curve-selection semantics. The new curve-selection authority has its own semantic hash and is retained explicitly in qualified numerics and the route candidate.

Because §4.5 applicability is still unresolved for production, EMP1-14 does not refreeze/re-authorize the overall production route. A final production requalification/refreeze belongs only after the remaining applicability source authority is resolved; no old qualification record may be used to bypass that gate.

## Route state after EMP1-14

Resolved from active bounded-route suspension reasons:

```text
WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED                     [EMP1-12]
WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED        [EMP1-13]
WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED  [EMP1-14]
```

Remaining active WRC source-authority suspension reason:

```text
WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED
```

The route remains `registered=false`, `engineeringUseAuthorized=false`, and production execution remains suspended. `OFF_AXIS_LONGITUDINAL_MOMENT_MAXIMUM` remains outside this route, along with nonzero differential pressure, non-unity SCF/general Appendix-B SCF, non-tabulated gamma, beta outside the bounded dataset, global EMP.1.C, code-compliance and release authority.

## Falsifiers

The focused authority check rejects:

1. missing longitudinal selection;
2. off-axis request without round attachment;
3. off-axis request without flexible-nozzle classification;
4. off-axis request without applicability source custody;
5. an eight-point authority mutated to `OFF_AXIS_MAXIMUM` / `1B-1,2B-1`;
6. a changed eight-point recovery location;
7. substituted source locators;
8. hidden/additional authority fields;
9. semantic-hash drift;
10. a semantic mutation whose attacker recomputes the authority hash — semantic field validation still rejects it.

Route/public-product/workbench/r0 checks also assert that the resolved longitudinal blocker cannot reappear and that the remaining source suspension reason is §4.5 applicability only.

## Changed-file ledger

1. `src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js` — source-qualified eight-point authority + strict semantic/shape/hash validator; comparison off-axis selector retained separately.
2. `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` — qualified numerics require eight-point longitudinal authority; comparison numerics retain explicit selector.
3. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` — route bound to eight-point `1B/2B`; longitudinal blocker removed; §4.5 remains.
4. `src/core/emp1/emp1-c-bounded-route-registry.js` — registry exposes qualified longitudinal authority and off-axis exclusion.
5. `src/core/emp1/emp1-public-product-contract.js` — stale sign-authority C label corrected to the actual remaining §4.5 applicability authority boundary.
6. `src/core/emp1/index.js` — exports longitudinal authority contract.
7. `scripts/emp1-wrc537-longitudinal-moment-curve-selection-check.mjs` — source/shape/recovery/off-axis/hash/recomputed-hash falsifiers.
8. `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` — proves axis, r0 and longitudinal blockers closed while §4.5 remains.
9. `scripts/emp1-public-product-check.mjs` — product/registry truth updated to one active WRC source blocker.
10. `scripts/emp1-workbench-product-run-qualification.mjs` — expects only §4.5 source suspension and asserts longitudinal blocker absent.
11. `scripts/emp1-wrc537-r0-source-authority-check.mjs` — carries longitudinal authority checks through prior r0 custody falsifiers.
12. `docs/emp1/WRC537_2013_Longitudinal_Moment_Eight_Point_Authority.md` — durable source/authority ledger.
13. `agents/PR1316_workreport.md` — living handover record.

No workflow file is changed by PR1316.

## Validation ledger

### Source/static review — COMPLETE

- Retained Table 5 re-observed: `1B or 1B-1`; `2B or 2B-1`.
- Eight-point extrema contract re-observed: exactly 8 locations; no continuous search; no global-maximum claim.
- Qualified numerics call path reviewed: authority object is mandatory and determines `1B/2B`.
- Comparison selector remains separate and cannot acquire Table-5 eight-point production authority.
- Route/public-product/workbench/r0 reason arrays reconciled to exactly one remaining WRC source blocker.
- No WRC coefficient, Table-5 equation/sign matrix, gamma/beta equation, frozen gamma5/gamma15 oracle, pressure policy or SCF arithmetic changed.

### GitHub Actions — NOT_RUN_EXECUTION_ENVIRONMENT

At engineering code head `83fd2cb2ce6d47f98a3e4a3c5bce27de43ee0920`:

| Workflow | Run | Job | Observed state |
|---|---:|---:|---|
| EMP.1 gamma5 bounded route | `32489621624` | `96793963116` | `steps=null`, `logs_url=null` |
| EMP.1 current-main independent baseline | `32489621554` | `96793963002` | `steps=null`, `logs_url=null` |
| EMP.1 runEmp1 bounded gamma5 orchestration | `32489621576` | `96793963193` | `steps=null`, `logs_url=null` |

GitHub reports conclusion `failure`, but no workflow step or test command executed. This is the same runner/startup condition observed on PR1315 and earlier heads. These runs are therefore **not software FAIL evidence and not PASS evidence**; exact-head runtime qualification remains `NOT_RUN_EXECUTION_ENVIRONMENT`.

### Local full-repository runtime — NOT_RUN

A local clone attempt failed with `Could not resolve host: github.com`; no matching executable checkout is available in this runtime. No local PASS is claimed.

## Protected invariants

- No WRC curve coefficient changes.
- No Table-5 dimensional stress equation or sign changes.
- No frozen gamma5/gamma15 oracle change.
- No inferred flexible-nozzle classification.
- No promotion of `1B-1/2B-1` into the eight-point route.
- No claim that eight Table-5 locations are the absolute shell maximum.
- No production route registration.
- No global EMP.1.C, code compliance or release authority.
- No workflow weakening/change.

## Exact continuation / next action

1. Keep PR1316 draft until the actual qualification commands execute.
2. When the runner/execution environment is restored, execute the three EMP.1 workflows against the exact engineering content and record real step evidence.
3. Do not merge PR1316 without fresh PR-specific owner authorization.
4. After PR1316 merges, EMP1-15 should address the remaining `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` blocker.
5. Before EMP1-15 changes the current rules, independently re-open and arbitrate WRC §4.5.1/§4.5.2 source text because earlier retained evidence indicates the radial-load length wording may be more nuanced than the current distilled `P_REQUIRES_L_GE_RM` rule. Do not widen or alter the applicability domain without direct source proof.
6. After §4.5 closure, refreeze/requalify the complete bounded production route before any route registration or engineering-use authorization is restored.

## Appendix A — takeover qualification

1. Why does Table 5 saying `1B or 1B-1` not authorize arbitrary curve selection?
2. Why is `1B/2B` qualified for this route without classifying the nozzle as flexible?
3. What exact software boundary prevents `1B-1/2B-1` from entering qualified eight-point numerics?
4. Why may the comparison selector retain off-axis evaluation while production authority remains false for that scope?
5. What evidence would be required to create a separate production off-axis maximum route?
6. Why is the eight-point envelope not a global absolute shell maximum?
7. Why does the old `3b437...` route qualification record not by itself authorize the new longitudinal selection semantics?
8. Which single active WRC source-authority suspension reason remains after EMP1-14?
9. What §4.5 wording must be re-arbitrated before EMP1-15 changes the current radial-load length rule?
10. Why are zero-step Actions failures neither software PASS nor software FAIL evidence?
