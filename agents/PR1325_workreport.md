# PR1325 Work Report — EMP1-17 retained-C authority currentness and qualification sample

## Recovery header
- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: IMPLEMENTATION_COMPLETE_VALIDATION_ENVIRONMENT_BLOCKED`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `ISSUE: #1324`
- `PR: #1325`
- `BRANCH: agent/issue-1324-emp1-authority-currentness`
- `BASE_MAIN: a222e18c38bd20fb55c1c6c95f724f40e40e8532`
- `LAST_CODE_HEAD: ccfc4064e6eafea4296606551cf5e87bc9b2c5b0`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`
- `MERGE_RECOMMENDATION: DO_NOT_MERGE_UNTIL_EXECUTED_VALIDATION_EVIDENCE_IS_AVAILABLE`

## Assignment
Implement issue #1324 in one continuously stacked PR:
1. bind retained EMP.1.C numerical evidence to the exact route/qualification authority under which it was produced;
2. make route-authority changes invalidate C reportability without invalidating unchanged A/B;
3. provide one complete deterministic EMP.1 qualification sample through normal source/import/normalization/custody APIs, with no derived WRC or result authority injected;
4. make C workflow/run/result state authority-driven rather than hard-coded disabled;
5. add adversarial and visible-workflow qualification for no-source, current, stale, persisted/reloaded, and suspended route states.

## Ground truth and protected boundaries
- Branch was created from exact `main@a222e18c38bd20fb55c1c6c95f724f40e40e8532`.
- Current bounded route remains `EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP` and is production-suspended.
- Governing current suspension remains `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- This PR does not authorize production C, global/full-domain EMP.1.C, code compliance, or release.
- No workflow YAML files are changed.
- A retained numerical C execution is immutable historical evidence. Authority mutation changes currentness/reportability, not the historical record.
- A/B are not invalidated merely because C route authority changes.
- The complete sample does not author `Rm`, `T`, `r0`, gamma, beta, nearest-end distance, WRC axes, WRC load components, coefficients, stresses, governing location, route authorization, `routeAuthorityHash`, code compliance, or release status.

## Implemented engineering changes

### 1. Route-authority currentness — P0 source closure
- Added change class `ROUTE_AUTHORITY`.
- `ROUTE_AUTHORITY` invalidates only `EMP.1.C`, assessment, and benchmark; A/B are outside this invalidation set.
- Added deterministic `emp1-workbench-route-authority-snapshot/v1` in the workbench product runtime.
- Snapshot semantic payload binds bounded route identity, route-module authorization/suspension, registry registration/engineering-use authorization, retained method/source/qualification/dataset authority, bounded scope semantics/source-authority identities, limitations, and remaining blocked scope.
- Timestamp/UI text are not part of the engineering semantic hash.
- Every new product execution retains both `authority.routeAuthoritySnapshot` and explicit `authority.routeAuthorityHash`.
- `currentEmp1WorkbenchRouteAuthority()` exposes the same `routeAuthorityHash = snapshot.semanticHash`.
- Suspended-C evidence and retained historical C records also retain the exact governing route-authority hash.
- The governed authority-change blocker emitted by currentness is exactly `EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED`.
- Previous/current authority mismatch is reconciled before `runEmp1()` so unchanged A/B/input cannot reuse a C result under changed authority.
- Previous numerical C evidence is preserved as `emp1-workbench-retained-c-evidence/v1` history rather than deleted.

### 2. Authority-aware currentness and single C-state projection
- Workbench currentness distinguishes source/input currentness, C authority currentness, and C reportability.
- Missing retained/current authority snapshots fail closed for numerical C.
- Changed authority emits `EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED` and suppresses reportability.
- Added C states `SOURCE_INCOMPLETE`, `ROUTE_SUSPENDED`, `READY_TO_RUN`, `CALCULATED_CURRENT`, `STALE_AUTHORITY`, and `STALE_INPUT`.
- `projectEmp1WorkbenchCState()` owns production-C button enablement/label, badge, blockers, current reportable result, retained execution evidence, retained history, current/execution authority snapshots, and explicit current/execution authority hashes.
- `lafea-workbench-view.js` injects retained A/B when `inputCurrent === true`; C-only authority mutation therefore leaves valid A/B visible.

### 3. C rendering/reportability boundary — single-source closure
- `emp1-workbench-run-view.js` consumes `cState.productionUseAuthorized`, `cState.blockerCodes`, and `cState.stageBadge`; it does not independently re-evaluate bounded-route registration/authorization.
- `lafea-analytical-calc-content.js` sends only `emp1CState.reportableResult` to the normal WRC result renderer.
- A/B presentation is independently driven by `emp1ExecutionCurrentness.inputCurrent`, so Q1→Q2 stales only C rather than hiding unchanged A/B.
- Transaction/evidence views now prefer explicit `executionAuthorityHash` / `currentAuthorityHash` and fall back to snapshot hashes only for recovery compatibility.
- Historical records prefer their retained explicit `routeAuthorityHash` and fall back to their snapshot hash.
- A stale numerical C result remains inaccessible to the normal `emp1-c-result-evidence` renderer but is visible inside the explicit route-authority/historical-evidence drawer.
- Immediate Q1→Q2 stale evidence is handled before any rerun moves the record into `retainedLocalCorrelationHistory`: `currentExecutionEvidence` is exposed only as `emp1-c-retained-stale-result-payload` with an explicit historical/stale warning.

### 4. Complete source-only qualification sample
- Added `[SIMULATED] Load complete EMP.1 qualification sample`.
- Controller imports A and B through normal stage APIs, applies canonical run-input normalization, and invokes the normal unified product transaction.
- B ancestry is refreshed through `refreshEmp1BSourceEvidence()` from a real A execution; fixture-carried A result authority is not trusted by the final product transaction.
- Typed C sample input is limited to load-case identity, pressure-result identity, attachment OD-at-shell-juncture source binding, and WRC §4.5 cylinder length/station source bindings.
- `normalizeEmp1WorkbenchRunInput()` and existing typed source-authority constructors remain the authority boundaries.
- Standalone sample qualification canonicalizes raw A/B through `normalizeLafeaStageDocument()` before direct product execution, matching the controller/store import boundary.
- Under present suspension expected truth is `A=1, B=1, prepare C=1, production C=0`, `PREPARED_C_BLOCKED`, no WRC stress/code/release result.

### 5. Adversarial currentness falsifiers authored
`scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs` covers:
- Q1 authorized/current numerical C;
- exact retained `routeAuthorityHash` equality with execution snapshot hash;
- Q1 → different authorized Q2 with identical A/B/input;
- canonical blocker `EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED`;
- old Q1 result stale/non-reportable while Q2 rerun remains enabled — negative control proving no global C disable;
- execution-authority hash remains Q1 while current-authority hash becomes Q2;
- serialized/persisted Q1 execution reloaded under Q2 is immediately stale/non-reportable;
- fresh Q2 result current;
- same Q2 subsequently suspended: C hidden/disabled while A/B/input remain current;
- semantically unchanged Q2 clone remains current;
- legacy numerical C without retained authority snapshot/hash fails closed;
- input staleness remains distinguishable from authority staleness.

### 6. Complete-sample production-path qualification authored
`scripts/emp1-workbench-complete-sample-qualification.mjs` asserts:
- exact source-only C input shapes and absence of derived/result/authority fields, including `routeAuthorityHash`;
- normal stage canonicalization boundary for raw sample A/B;
- normal product readiness and current route suspension;
- live `routeAuthorityHash == routeAuthority.snapshot.semanticHash`;
- transaction `authority.routeAuthorityHash` equals the live hash and retained snapshot hash;
- blocked/prepared C evidence carries the same exact route-authority hash;
- `PREPARED_C_BLOCKED` with exactly `A 1 / B 1 / prepare C 1 / production C 0`;
- no C stresses, code-compliance, or release claim;
- gamma/beta/r0/nearest-end distance appear only after CORE derives them;
- C projection is `ROUTE_SUSPENDED`, disabled, has no reportable result, and exposes matching current/execution authority hashes.

### 7. Browser/E2E four-state contract authored
`e2e/emp1-workbench-authority.spec.js` covers the issue-required visible state family without changing real route authority:
- **NO SOURCE**: initial C state is `SOURCE_INCOMPLETE`, production C disabled, no C result card.
- **SUSPENDED / PREPARED**: one-click complete sample reaches `A 1 / B 1 / prepare C 1 / production C 0`, C setup remains navigable, production C remains disabled, route blocker visible, no C result card, code/release remain NO.
- Prepared transaction explicitly proves route-authority hash = snapshot hash = blocked-evidence hash.
- **CURRENT**: synthetic presentation-only Q1 fixture supplies `cState.reportableResult`; the actual normal WRC evidence renderer creates the eight-location stress card and execution-authority hash remains visible. This does not execute or authorize the production route.
- **STALE**: synthetic Q1-under-Q2 fixture invokes the same normal renderer with `cState.reportableResult = null`; no normal C result card is created, current-result flag is false, Q1 and Q2 authority hashes remain visible, and stale Q1 stress payload is available only in the historical authority drawer.
- Synthetic browser fixtures are passed explicitly into `page.evaluate()`; they do not depend on Node-scope closures or fake production execution.

## Report/export consumer audit
- Repository search found the normal C stress presentation entrypoint only in `emp1-engineering-evidence-view.js`, consumed from `lafea-analytical-calc-content.js`; that caller is now gated by `emp1CState.reportableResult`.
- `workspaceResultAvailable` is projected by `lafea-workbench-view.js` from `emp1CState.currentResultAvailable`.
- No separate EMP.1.C numerical report/export consumer was found in current source requiring an additional patch.
- Existing workbench export action exports the active source document, not a retained C numerical result; no stale-C report bypass was identified there.
- Any future C numerical report/export consumer must consume the same reportable projection rather than `execution.result.localCorrelation` directly.

## Validation evidence
### Exact-head workflow observation at code head `ccfc4064e6eafea4296606551cf5e87bc9b2c5b0`
Six PR-triggered workflows were created on this exact code head. GitHub reports them completed/failure. The inspected visible-workbench job for run `32579359685`, job `97046303535`, contains `steps=null` and `logs_url=null`; no checkout, Playwright command, source qualification, or engineering comparison step executed. This remains `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

Workflow family observed on this head:
- `LAFEA B01 final exact-head qualification` run `32579359655`;
- `EMP.1 runEmp1 bounded gamma5 orchestration` run `32579359658`;
- `EMP.1 gamma5 bounded route on current main` run `32579359650`;
- `LAFEA B01 fail-closed qualification` run `32579359643`;
- `LAFEA visible workbench qualification` run `32579359685`;
- `EMP.1 current-main independent baseline` run `32579359644`.

### Alternate execution environment attempt
- An isolated local runtime was tested as a non-GitHub-Actions fallback using `git ls-remote` against this repository/branch.
- The runtime failed before checkout with `Could not resolve host: github.com`.
- No repository file, Node qualification, browser test, or engineering calculation executed in that runtime.
- Classify this path `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`; it is not independent PASS/FAIL evidence.

### Validation classification
- Source/diff audit against issue #1324 acceptance: `COMPLETE`.
- Canonical blocker-code/static route-authority-hash audit: `COMPLETE`.
- Single-source C renderer/reportability static audit: `COMPLETE`.
- Report/export consumer static audit: `COMPLETE_NO_SEPARATE_C_NUMERIC_EXPORT_CONSUMER_FOUND`.
- Sample fixture API/static canonicalization audit: `COMPLETE`.
- Authority-currentness falsifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Persist/reload falsifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Complete-sample Node qualification execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Browser/Playwright four-state qualification execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Existing focused EMP.1 orchestration workflow execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent gamma5 exact-head oracle execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Alternate local checkout/execution: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.
- Full repository regression: `NOT_RUN`.
- Live deployed-browser click-through: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1325_workreport.md` — living recovery/validation/handover record.
2. `e2e/emp1-workbench-authority.spec.js` — NO SOURCE, suspended/prepared, synthetic CURRENT, and synthetic STALE presentation qualification.
3. `scripts/emp1-workbench-complete-sample-qualification.mjs` — source-only sample + canonicalized product-path + explicit authority-hash qualification.
4. `scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs` — Q1/Q2/suspension/legacy/input, canonical blocker, explicit authority hashes, and persisted-reload falsifiers.
5. `src/core/emp1/emp1-dependency-graph.js` — `ROUTE_AUTHORITY` C-only downstream invalidation.
6. `src/workspace/emp1-workbench-product-run.js` — canonical route-authority snapshot/hash, current authority resolver, pre-run invalidation, retained C history.
7. `src/workspace/emp1-workbench-qualification-sample.js` — deterministic source-only complete qualification bundle.
8. `src/workspace/emp1-workbench-run-state.js` — authority-aware currentness, canonical blocker, explicit hashes, and single C-state/reportability projection.
9. `src/workspace/emp1-workbench-run-view.js` — cState-driven source/run status, explicit authority-hash evidence, stale-result historical drawer.
10. `src/workspace/lafea-analytical-calc-content.js` — A/B `inputCurrent` presentation and C `reportableResult` rendering boundary.
11. `src/workspace/lafea-guided-workflow-view.js` — C setup navigation and state/badge/blocker presentation.
12. `src/workspace/lafea-workbench-controller.js` — normal import/normalize/run sample wiring and live route-authority provider.
13. `src/workspace/lafea-workbench-view.js` — current route evaluation, A/B input-current presentation, sample action, separate state-driven production C control.

## Open blockers / risks
- `VAL-1324-01`: authored Node qualification and adversarial falsifiers have not executed in an available environment.
- `VAL-1324-02`: authored browser qualification has not executed because hosted exact-head jobs never started a step and fallback runtime cannot fetch the repository.
- `VAL-1324-03`: independent exact-head gamma5 requalification remains `NOT_RUN_EXECUTION_ENVIRONMENT`; production-route suspension must remain in force.
- `RISK-1324-01`: do not interpret source-authority closure, authored tests, or historical ~72.67 MPa comparison evidence as production authorization.
- `RISK-1324-02`: unsupported method scope remains fail-closed: nonzero differential pressure, general Kn/Kb, gamma outside bounded scope, beta outside qualified range, off-axis/global maxima, nozzle/attachment stress claims, WRC 297/nozzle-neck routes, rectangular/lug approximations, and code/release authority.

## Exact next action
When an execution environment actually starts steps, execute on exact code head `ccfc4064e6eafea4296606551cf5e87bc9b2c5b0`:
1. `node scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs`;
2. `node scripts/emp1-workbench-complete-sample-qualification.mjs`;
3. existing `node scripts/emp1-workbench-product-run-qualification.mjs`;
4. Playwright `e2e/emp1-workbench-authority.spec.js` with repository LAFEA guided configuration;
5. independent gamma5 exact-head oracle/current-candidate comparison and required regression bundle.

Record actual stdout/artifacts/hashes here. Only after green exact-head engineering + product-path evidence and review should a separate explicit decision consider lifting the bounded-route suspension. PR #1325 currently keeps all production/global/code/release authorities false.

## Appendix A — takeover qualification
1. Why can an unchanged numerical WRC result cease to be engineering-current when A/B/input bytes are unchanged?
2. Which registry/method/scope/qualification facts are bound into `routeAuthoritySnapshot.semanticHash`, and why are timestamp/UI strings excluded?
3. Why must `authority.routeAuthorityHash` equal the retained snapshot semantic hash, and where else is that hash retained?
4. Why does `ROUTE_AUTHORITY` invalidate C/assessment/benchmark but not A/B?
5. At what point before `runEmp1()` is previous/current route authority reconciled, and what stale-reuse failure does that prevent?
6. Which Q1→Q2 negative control proves this implementation is not a global C disable?
7. Why must a serialized Q1 execution loaded under Q2 fail currentness on first classification?
8. Why is `currentExecutionEvidence` retained when `reportableResult` is null, and where may that stale payload be shown?
9. Why must the normal WRC stress renderer consume only `cState.reportableResult`?
10. Which fields may the complete sample author, and which WRC quantities/authority fields must CORE derive?
11. Which normal source/import/normalization/custody boundaries does the one-click sample traverse?
12. What must the UI show for NO SOURCE, SUSPENDED/PREPARED, CURRENT, and STALE C states?
13. Why are GitHub workflow conclusions not accepted as software FAIL evidence on this head?
14. What executable evidence remains mandatory before the route suspension can be considered for removal?
15. Which engineering authorities remain false throughout PR #1325?