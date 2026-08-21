# PR1317 Work Report — EMP1-15 WRC 537 §4.5 applicability geometry source authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `PR: #1317`
- `BRANCH: agent/emp1-15-wrc-45-source-authority-20260821`
- `BASE_MAIN: 73a427e40f18b9964e551af89690b21f854a3c49`
- `REPORT_BASIS_HEAD: a48489484382be8884470bf0e0fd83ca26b66625`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1317`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_PRODUCED: false`
- `RELEASE_QUALIFIED: false`
- `QUALIFICATION_STATE: FOCUSED_SOURCE_AUTHORITY_PASS__BROAD_EXACT_HEAD_EXECUTION_INFRASTRUCTURE_BLOCKED`

## Handover in 60 Seconds

PR #1317 closes the source-custody defect `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` without reauthorizing production WRC execution. The WRC §4.5 limits themselves were not changed: active radial `P` requires `l >= Rm`; active `Mc`/`Ml` requires nearest cylinder-end distance `>= 0.5 Rm`; §4.5.3 remains host-shell-stress-only.

Production authority now uses a typed, immutable geometry source binding: cylinder length between end planes plus WRC attachment reference station from a defined cylinder start plane. Both end distances are derived and `nearestCylinderEndDistance = min(x, L-x)`; a caller cannot directly author the production nearest-end value. Legacy caller evidence remains comparison-only.

All bounded WRC source-authority blockers addressed by EMP1-12 through EMP1-15 are now absent from the live bounded-route suspension set. Production remains suspended for `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`. The historical `3b437...` route qualification record is retained as historical evidence only and is not current authorization.

The focused §4.5 source-authority and applicability-policy scripts execute PASS locally from an exact branch-file dependency closure. The three broad exact-head GitHub Actions workflows do not execute step 1: their jobs have `steps=null` and `logs_url=null`, so they are `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

## Mission and acceptance

Mission: close only the WRC 537 §4.5 geometry source-authority gap for the bounded cylindrical gamma=5, zero-dP, Table-5 route while preserving all previously qualified numerical behavior and all non-scope limitations.

Acceptance implemented:

1. typed exact-shape/hash §4.5 geometry source authority;
2. cylinder length basis = `BETWEEN_CYLINDER_END_PLANES`;
3. WRC attachment station basis = `FROM_CYLINDER_START_END_PLANE_TO_WRC_ATTACHMENT_REFERENCE_POINT`;
4. `0 <= x <= L` and canonical length unit enforcement;
5. end distances derived from `L` and `x`, never caller-authored production authority;
6. source/basis/hash/shape/derived-distance spoof rejection;
7. legacy evidence comparison-only;
8. qualified numerics require typed §4.5 authority;
9. workbench readiness/execution requires §4.5 binding while older v3 state remains readable for recovery;
10. source blocker retired only into an explicit route-requalification suspension, not production authorization.

## Source arbitration

Retained project ledger: `docs/emp1/WRC537_2013_Applicability.md`.

Frozen interpretation:

- WRC 537 §4.5.1: for active radial load `P`, `l < Rm` is outside stated applicability; equality `l = Rm` passes the stated lower boundary.
- WRC 537 §4.5.2: for active overturning `Mc` or `Ml`, the attachment must be at least `0.5 Rm` from a cylinder end; equality passes.
- WRC 537 §4.5.3: calculated stresses are host cylindrical-shell stresses at the attachment-shell juncture; no nozzle/attachment stress authority is created.
- No new §4.5 geometric rule is invented for `Vc`, `Vl`, or `Mt` alone.

The first wrong boundary was source custody: legacy `applicabilityEvidence` accepted caller-declared `cylinderLength` and `nearestCylinderEndDistance` plus free-form source strings and deliberately classified them `UNQUALIFIED_FOR_PRODUCTION`.

## Implemented engineering repair

### Typed authority

`src/core/emp1/emp1-wrc537-applicability-source-authority.js` adds:

- schema `emp1-wrc537-applicability-source-authority/v1`;
- authority `EMP1_TYPED_WRC537_4_5_GEOMETRY_SOURCE_BINDING_V1`;
- qualification `QUALIFIED_FOR_BOUNDED_WRC537_4_5_GEOMETRY`;
- source-bound `geometryIdentity`, `L`, `x`, unit and two source references;
- internally derived `distanceFromCylinderStart`, `distanceFromCylinderEnd`, `nearestCylinderEndDistance`;
- exact source-binding semantic hash and outer authority semantic hash;
- exact-key-set validation and production-observation prohibition.

### Applicability evaluator

`emp1-wrc537-cylindrical-applicability.js` now distinguishes:

- typed source authority -> potentially `PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED`;
- legacy caller evidence -> at most `PASS_WRC537_4_5_SOURCE_LIMITS_COMPARISON_ONLY`;
- out-of-limit evidence -> `OUTSIDE_WRC537_4_5_SOURCE_LIMITS`.

Qualified numerics require the qualified state and a retained source-authority hash.

### Qualified route / adapter

- qualified bounded numerics require `applicabilitySourceAuthority`;
- comparison adapter alone may still accept legacy `applicabilityEvidence`;
- route candidate independently validates typed §4.5 authority before Table-5 numerics;
- route canonical length unit remains `mm`;
- runtime source authority requires both typed r0 custody and typed §4.5 custody.

### Workbench/product custody

- workbench source input includes cylinder geometry identity, `L`, `x`, unit and source references;
- nearest-end distance is not editable;
- §4.5 geometry has its own transaction hash and is classified `LOCAL_METHOD`, so changing it does not require re-running A or B;
- older v3 input without `applicabilityGeometry` remains normalizable for recovery, but readiness is `BLOCKED` and execution throws `EMP1_WORKBENCH_APPLICABILITY_GEOMETRY_REQUIRED`;
- suspended C evidence retains the prepared typed §4.5 authority.

## Critical defect found and closed during final audit

`ISS-1317-01 RESOLVED`: after the initial §4.5 wiring, an older v3 workbench input could omit `applicabilityGeometry` and still reach prepared-C while production happened to be suspended. This was a latent future-reauthorization bypass.

Repair on the engineering code head:

- `projectEmp1WorkbenchRunReadiness()` returns BLOCKED with `EMP1_WORKBENCH_APPLICABILITY_GEOMETRY_REQUIRED`;
- `executeEmp1WorkbenchProduct()` rejects the missing binding with the same exact code;
- normalization remains backward-readable so old saved state can be recovered and explicitly rebound rather than silently reinterpreted.

## Authority state

Resolved bounded WRC source-authority blockers:

- `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED` — EMP1-12;
- `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` — EMP1-13;
- `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED` — EMP1-14;
- `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` — EMP1-15.

Current bounded-route suspension:

- `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.

Still outside bounded-route authority regardless of source closure:

- nonzero differential pressure;
- non-unity/general Appendix-B SCF;
- off-axis longitudinal-moment maximum;
- gamma other than qualified exact gamma=5;
- beta outside 0.05..0.5;
- non-tabulated gamma/cross-variant fallback;
- global/full-domain EMP.1.C;
- code-compliance/release qualification.

The route remains `registered=false`, `engineeringUseAuthorized=false`, and `EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED=false`.

## Protected numerics / negative assurance

Intentionally unchanged:

- WRC Table-5 coefficient data;
- Table-5 algebra and sign reconstruction;
- gamma equation `Rm/T`;
- beta equation `0.875*r0/Rm`;
- gamma=5 / gamma=15 frozen historical vectors;
- load-transfer mechanics;
- pressure policy;
- unity Kn/Kb policy;
- eight-point A/B/C/D recovery semantics;
- off-axis maximum exclusion;
- host-shell-only stress domain;
- workflow files.

The historical gamma5 route qualification SHA `3b437540...` is not used as current post-EMP1-12..15 production authorization. A new independent physical-vector refreeze is required before route reactivation.

## Validation ledger

### PASS — focused §4.5 authority, local execution

`STATUS: PASS`
`OBSERVATION: LOCAL_EXECUTION`
`ORACLE: IMPLEMENTATION_COUPLED + SOURCE_LIMIT_ASSERTIONS`

Command: `node scripts/emp1-wrc537-applicability-source-authority-check.mjs` using an exact branch-file dependency closure for `canonical-json.js`, the §4.5 authority module, applicability evaluator and script.

Observed PASS includes:

- sourceQualification = `QUALIFIED_FOR_BOUNDED_WRC537_4_5_GEOMETRY`;
- source binding hash `fnv1a64:e977beefb5856707`;
- authority hash `fnv1a64:b35cbf43dd5b7b46`;
- L=300, x=80 -> distances 80 / 220 / nearest 80;
- L/Rm=3, nearest/Rm=0.8;
- equality boundaries pass;
- short cylinder rejected;
- near-end moment rejected;
- radial-only case does not invent the moment end-distance rule;
- legacy evidence remains comparison-only;
- recomputed outer hash cannot hide a forged derived nearest-end value.

### PASS — §4.5 applicability policy, local execution

`STATUS: PASS`
`OBSERVATION: LOCAL_EXECUTION`
`ORACLE: AUTHORITATIVE_REFERENCE assertions from retained §4.5 ledger`

Command: `node scripts/emp1-wrc537-cylindrical-applicability-check.mjs` using the same exact branch-file dependency closure plus the retained applicability ledger.

Observed PASS includes:

- exact `l/Rm=1` boundary;
- exact end-distance/Rm=0.5 boundary;
- typed source authority qualified;
- legacy evidence comparison-only;
- nearest end derived from attachment station;
- host-shell stress scope retained.

### NOT_RUN — exact-head broad workflows

Engineering code head: `a48489484382be8884470bf0e0fd83ca26b66625`.

GitHub Actions created jobs but executed no step and exposed no job log:

- `EMP.1 gamma5 bounded route on current main` — run `32499580381`, job `96825915743`: `steps=null`, `logs_url=null`;
- `EMP.1 current-main independent baseline` — run `32499580484`, job `96825915840`: `steps=null`, `logs_url=null`;
- `EMP.1 runEmp1 bounded gamma5 orchestration` — run `32499580387`, job `96825915637`: `steps=null`, `logs_url=null`.

Classification for all three: `STATUS: NOT_RUN`, `OBSERVATION: NOT_OBSERVED`, `FAILURE_ORIGIN: EXECUTION_ENVIRONMENT`. The GitHub run-level conclusion `failure` is not a software-test result because no step executed.

Full local repository clone/regression is also `NOT_RUN`: this runtime cannot resolve GitHub DNS for a repository checkout.

### NOT_RUN — complete route refreeze

The current source-authorized physical gamma5 candidate has deliberately not been frozen against the historical 32-value vector. Axis, r0, longitudinal-curve and §4.5 authority were all changed after that historical qualification epoch. Successor route requalification must establish a new independent physical-vector oracle before production can be reauthorized.

## Changed-file ledger

1. `agents/PR1317_workreport.md` — living recovery/evidence record.
2. `scripts/emp1-public-product-check.mjs` — source blockers closed; requalification blocker retained.
3. `scripts/emp1-workbench-product-run-qualification.mjs` — typed §4.5 workbench custody, invalidation and missing-binding falsifiers.
4. `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` — all bounded source authorities closed; requalification remains.
5. `scripts/emp1-wrc-gamma5-zero-dp-route-qualification.mjs` — historical-record custody plus current source-authorized candidate; no false current authorization.
6. `scripts/emp1-wrc537-applicability-source-authority-check.mjs` — focused typed-authority falsifier suite.
7. `scripts/emp1-wrc537-cylindrical-applicability-check.mjs` — §4.5 policy and typed-authority boundary tests.
8. `scripts/emp1-wrc537-r0-source-authority-check.mjs` — r0 falsifiers isolated with valid §4.5 authority.
9. `src/core/emp1/emp1-c-bounded-route-registry.js` — typed §4.5 scope metadata and route-requalification suspension.
10. `src/core/emp1/emp1-public-product-contract.js` — visible authority label updated to post-source-authority requalification state.
11. `src/core/emp1/emp1-wrc537-applicability-source-authority.js` — new typed authority primitive.
12. `src/core/emp1/emp1-wrc537-cylindrical-applicability.js` — typed source-authority qualification path, legacy comparison-only path.
13. `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` — qualified numerics require typed applicability authority.
14. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` — preserve/revalidate §4.5 authority through C preparation/execution.
15. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` — runtime/candidate §4.5 authority gates and requalification suspension.
16. `src/core/emp1/index.js` — export new authority.
17. `src/workspace/emp1-workbench-product-run.js` — create/hash/retain typed §4.5 authority; missing-binding execution fails closed.
18. `src/workspace/emp1-workbench-run-state.js` — source schema normalization, hash/currentness and readiness gate.
19. `src/workspace/emp1-workbench-run-view.js` — explicit cylinder length/station/source inputs; no direct nearest-end input.

No workflow file is changed by PR #1317.

## Review / coordination state

- PR #1317 is the only open EMP1 PR observed during final reconciliation.
- PR review threads: none.
- `agents/MASTER_INDEX.md`: not present on current main; no master-index state is claimed.
- Base drift at engineering code head: branch based on `main@73a427e40f18b9964e551af89690b21f854a3c49`; PR was structurally mergeable and had no observed EMP1 overlap.

## Active risks / debt / decisions

- `DEBT-1317-01 OPEN`: complete post-source-authority route requalification/refreeze has not executed and must not be conflated with source-authority closure.
- `RISK-1317-01 CONTROLLED`: GitHub Actions runner/startup infrastructure currently prevents broad exact-head execution; all affected suites are recorded NOT_RUN.
- `DEC-1317-01`: production remains fail-closed after all source blockers close; requalification is a distinct gate.
- `DEC-1317-02`: legacy caller-authored nearest-end evidence is comparison-only and cannot be promoted into production authority.
- `DEC-1317-03`: old v3 workbench state without §4.5 geometry remains readable for recovery but cannot execute or report READY.

## Exact continuation state

PR #1317 implementation and recovery documentation are complete for the §4.5 source-authority scope. Do not reactivate or register the gamma5 production route in this PR.

When an executable environment is available, re-run the existing exact-head EMP.1 workflows without weakening any gate. If they expose a real software failure, fix it on #1317 and update this report. If they pass, #1317 can be considered for owner merge authorization while still leaving production route authorization false.

The successor engineering increment is route requalification/refreeze: build an independent physical-vector oracle starting from source-bound global geometry/loads and all post-EMP1-12..15 authorities; re-freeze the gamma5 eight-point vector and qualification hash; only then evaluate route registration/production authorization.

## Appendix A — implementation takeover qualification

A1 — Production trace (20): Trace the exact path from workbench `applicabilityGeometry` through normalization, source-authority creation, orchestration preparation, route candidate and qualified numerics. Identify where a caller-authored nearest-end distance is rejected and predict the first error code if it is injected.

A2 — Current failure isolation (20): Given a GitHub Actions run whose job has `steps=null` and `logs_url=null`, show how you distinguish execution-environment NOT_RUN from a software assertion failure. Name the exact #1317 run/job evidence and what must not be claimed.

A3 — Authority/invariant (20): Explain why `l >= Rm` is load-conditional on `P` and why the `0.5 Rm` end-distance rule is load-conditional on `Mc/Ml`. Identify which source-bound quantities are authoritative and which derived quantity must never be caller authority.

A4 — Independent validation (20): Design the successor physical-vector requalification so it cannot share production axis/sign, geometry derivation, figure-selection or Table-5 sign helpers. State at least four mutations that the independent oracle must detect before production can be reauthorized.

A5 — Minimal next patch (20): Identify the minimum files that would need to change for a new qualification record/hash after an independent physical-vector refreeze, and identify at least five production or numerical files that must remain untouched unless the new oracle disproves current behavior.

Engineering-critical takeover threshold: total >= 92/100 and every answer >= 17/20, with fabricated/anti-validation claims failing immediately.
