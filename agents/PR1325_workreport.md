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
- `LAST_CODE_HEAD: c2efbac2a41117b7b4d48bfc2deff80e51197927`
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
5. add adversarial and visible-workflow qualification for current, stale, persisted/reloaded, and suspended route states.

## Ground truth and protected boundaries
- Branch was created from exact `main@a222e18c38bd20fb55c1c6c95f724f40e40e8532`.
- Current bounded route remains `EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP` and is production-suspended.
- Governing suspension remains `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- This PR does not authorize production C, global/full-domain EMP.1.C, code compliance, or release.
- No workflow YAML files are changed.
- A retained numerical C execution is immutable historical evidence. Authority mutation changes currentness/reportability, not the historical record.
- A/B are not invalidated merely because C route authority changes.
- The complete sample does not author `Rm`, `T`, `r0`, gamma, beta, nearest-end distance, WRC axes, WRC load components, coefficients, stresses, governing location, route authorization, code compliance, or release status.

## Implemented engineering changes

### 1. Route-authority currentness — P0 source closure
- Added change class `ROUTE_AUTHORITY`.
- `ROUTE_AUTHORITY` invalidates only `EMP.1.C`, assessment, and benchmark; A/B are outside this invalidation set.
- Added deterministic `emp1-workbench-route-authority-snapshot/v1` in the workbench product runtime.
- Snapshot semantic payload binds bounded route identity, route-module authorization/suspension, registry registration/engineering-use authorization, retained method/source/qualification/dataset authority, bounded scope semantics/source-authority identities, limitations, and remaining blocked scope.
- Timestamp/UI text are not part of the engineering semantic hash.
- Every new product execution retains `authority.routeAuthoritySnapshot`.
- Previous/current snapshot mismatch is reconciled before `runEmp1()` so unchanged A/B/input cannot reuse a C result under changed authority.
- Previous numerical C evidence is preserved as `emp1-workbench-retained-c-evidence/v1` history rather than deleted.

### 2. Authority-aware currentness and single C-state projection
- Workbench currentness distinguishes source/input currentness, C authority currentness, and C reportability.
- Missing retained/current authority snapshots fail closed for numerical C.
- Changed authority emits governed C route-authority blockers and suppresses reportability.
- Added C states `SOURCE_INCOMPLETE`, `ROUTE_SUSPENDED`, `READY_TO_RUN`, `CALCULATED_CURRENT`, `STALE_AUTHORITY`, and `STALE_INPUT`.
- `projectEmp1WorkbenchCState()` owns production-C button enablement/label, badge, blockers, current reportable result, retained execution evidence, retained history, and current/execution authority snapshots.
- `lafea-workbench-view.js` injects retained A/B when `inputCurrent === true`; C-only authority mutation therefore leaves valid A/B visible.

### 3. C rendering/reportability boundary — single-source closure
Static follow-up found two remaining bypasses and closed them:
- `emp1-workbench-run-view.js` previously recomputed route suspension from `boundedProductionRoutes`; it now consumes `cState.productionUseAuthorized`, `cState.blockerCodes`, and `cState.stageBadge` only.
- `lafea-analytical-calc-content.js` previously selected a C payload from retained execution using overall transaction currentness; the normal WRC result renderer now receives only `emp1CState.reportableResult`.
- A/B presentation is independently driven by `emp1ExecutionCurrentness.inputCurrent`, so Q1→Q2 stales only C rather than hiding unchanged A/B.
- Transaction evidence now shows execution-authority hash versus current-authority hash, current/reportable C availability, retained numerical-evidence availability, and qualification/source/dataset hashes.
- A stale numerical C result remains inaccessible to the normal `emp1-c-result-evidence` renderer but is visible inside the explicit route-authority/historical-evidence drawer.
- Immediate Q1→Q2 stale evidence is handled before any rerun moves the record into `retainedLocalCorrelationHistory`: `currentExecutionEvidence` is exposed only as `emp1-c-retained-stale-result-payload` with an explicit historical/stale warning.
- Older retained history remains separately visible as historical evidence records.

### 4. Complete source-only qualification sample
- Added `[SIMULATED] Load complete EMP.1 qualification sample`.
- Controller imports A and B through normal stage APIs, applies canonical run-input normalization, and invokes the normal unified product transaction.
- B ancestry is refreshed through `refreshEmp1BSourceEvidence()` from a real A execution; fixture-carried A result authority is not trusted by the final product transaction.
- Typed C sample input is limited to load-case identity, pressure-result identity, attachment OD-at-shell-juncture source binding, and WRC §4.5 cylinder length/station source bindings.
- `normalizeEmp1WorkbenchRunInput()` and existing typed source-authority constructors remain the authority boundaries.
- Standalone sample qualification canonicalizes raw A/B through `normalizeLafeaStageDocument()` before direct product execution, matching the controller/store import boundary.
- Under present suspension expected truth is `A=1, B=1, prepare C=1, production C=0`, `PREPARED_C_BLOCKED`, no WRC stress/code/release result.

### 5. Adversarial currentness falsifiers authored
`scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs` now covers:
- Q1 authorized/current numerical C;
- Q1 → different authorized Q2 with identical A/B/input;
- old Q1 result stale/non-reportable while Q2 rerun remains enabled — negative control proving no global C disable;
- serialized/persisted Q1 execution reloaded for the first time under Q2 becomes immediately stale/non-reportable, proving currentness does not depend on an in-memory transition;
- fresh Q2 result current;
- same Q2 subsequently suspended: C hidden/disabled while A/B/input remain current;
- semantically unchanged Q2 clone remains current;
- legacy numerical C without retained authority snapshot fails closed;
- input staleness remains distinguishable from authority staleness.

### 6. Complete-sample production-path qualification authored
`scripts/emp1-workbench-complete-sample-qualification.mjs` asserts:
- exact source-only C input shapes and absence of derived/result/authority fields;
- normal stage canonicalization boundary for raw sample A/B;
- normal product readiness and current route suspension;
- `PREPARED_C_BLOCKED` with exactly `A 1 / B 1 / prepare C 1 / production C 0`;
- no C stresses, code-compliance, or release claim;
- gamma/beta/r0/nearest-end distance appear only after CORE derives them;
- C projection is `ROUTE_SUSPENDED`, disabled, and has no reportable result.

### 7. Browser/E2E current-truth and stale-evidence qualification authored
`e2e/emp1-workbench-authority.spec.js` now asserts:
- one-click complete sample reaches the transaction summary;
- `A 1 / B 1 / prepare C 1 / production C 0`;
- C navigation remains enabled for setup/evidence while production `Run C` is disabled;
- run-configuration `data-c-state=ROUTE_SUSPENDED` and `data-production-authority=SUSPENDED`;
- exact current requalification blocker visible;
- current/reportable C result = NO and retained numerical C evidence = NO for prepared-only sample;
- no `emp1-c-result-evidence` result card under suspension;
- code compliance = NO and release qualified = NO;
- authority drawer exists and reports current production authorization = NO;
- synthetic stale Q1-under-Q2 DOM case has no normal result card, current-result flag false, Q1 and Q2 authority hashes visible, and stale Q1 stress payload available only in the historical authority drawer.

## Report/export consumer audit
- Repository search found the normal C stress presentation entrypoint only in `emp1-engineering-evidence-view.js`, consumed from `lafea-analytical-calc-content.js`; that caller is now gated by `emp1CState.reportableResult`.
- `workspaceResultAvailable` is projected by `lafea-workbench-view.js` from `emp1CState.currentResultAvailable`.
- No separate EMP.1.C numerical report/export consumer was found in current source requiring an additional patch.
- Existing workbench export action exports the active source document, not a retained C numerical result; no stale-C report bypass was identified there.
- Any future C numerical report/export consumer must consume the same reportable projection rather than `execution.result.localCorrelation` directly.

## Validation evidence
### Exact-head workflow observation at code head `c2efbac2a41117b7b4d48bfc2deff80e51197927`
Six PR-triggered workflows were created on this exact code head. GitHub reports them completed/failure. The inspected visible-workbench job for run `32578260153`, job `97043691166`, contains `steps=null` and `logs_url=null`; no checkout, Playwright command, source qualification, or engineering comparison step executed. This remains `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

Workflow family observed on this head:
- `LAFEA B01 fail-closed qualification` run `32578260156`;
- `EMP.1 gamma5 bounded route on current main` run `32578260143`;
- `LAFEA B01 final exact-head qualification` run `32578260137`;
- `EMP.1 runEmp1 bounded gamma5 orchestration` run `32578260168`;
- `LAFEA visible workbench qualification` run `32578260153`;
- `EMP.1 current-main independent baseline` run `32578260169`.

### Alternate execution environment attempt
- An isolated local runtime was tested as a non-GitHub-Actions fallback using `git ls-remote` against this repository/branch.
- The runtime failed before checkout with `Could not resolve host: github.com`.
- No repository file, Node qualification, browser test, or engineering calculation executed in that runtime.
- Classify this path `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`; it is not independent PASS/FAIL evidence.

### Validation classification
- Source/diff audit against issue #1324 acceptance: `COMPLETE`.
- Single-source C renderer/reportability static audit: `COMPLETE`.
- Report/export consumer static audit: `COMPLETE_NO_SEPARATE_C_NUMERIC_EXPORT_CONSUMER_FOUND`.
- Sample fixture API/static canonicalization audit: `COMPLETE`.
- Authority-currentness falsifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Persist/reload falsifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Complete-sample Node qualification execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Browser/Playwright EMP.1 qualification execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Existing focused EMP.1 orchestration workflow execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent gamma5 exact-head oracle execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Alternate local checkout/execution: `NOT_RUN_EXECUTION_ENVIRONMENT_NETWORK_UNAVAILABLE`.
- Full repository regression: `NOT_RUN`.
- Live deployed-browser click-through: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1325_workreport.md` — living recovery/validation/handover record.
2. `e2e/emp1-workbench-authority.spec.js` — complete-sample suspended-state and stale-evidence browser falsifiers.
3. `scripts/emp1-workbench-complete-sample-qualification.mjs` — source-only sample + canonicalized product-path qualification.
4. `scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs` — Q1/Q2/suspension/legacy/input plus persisted-reload falsifiers.
5. `src/core/emp1/emp1-dependency-graph.js` — `ROUTE_AUTHORITY` C-only downstream invalidation.
6. `src/workspace/emp1-workbench-product-run.js` — canonical route-authority snapshot, current authority resolver, pre-run invalidation, retained C history.
7. `src/workspace/emp1-workbench-qualification-sample.js` — deterministic source-only complete qualification bundle.
8. `src/workspace/emp1-workbench-run-state.js` — authority-aware currentness and single C-state/reportability projection.
9. `src/workspace/emp1-workbench-run-view.js` — cState-driven source/run status, authority-currentness evidence, stale-result historical drawer.
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
When an execution environment actually starts steps, execute on exact code head `c2efbac2a41117b7b4d48bfc2deff80e51197927`:
1. `node scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs`;
2. `node scripts/emp1-workbench-complete-sample-qualification.mjs`;
3. existing `node scripts/emp1-workbench-product-run-qualification.mjs`;
4. Playwright `e2e/emp1-workbench-authority.spec.js` with repository LAFEA guided configuration;
5. independent gamma5 exact-head oracle/current-candidate comparison and required regression bundle.

Record actual stdout/artifacts/hashes here. Only after green exact-head engineering + product-path evidence and review should a separate explicit decision consider lifting the bounded-route suspension. PR #1325 currently keeps all production/global/code/release authorities false.

## Appendix A — takeover qualification
1. Why can an unchanged numerical WRC result cease to be engineering-current when A/B/input bytes are unchanged?
2. Which registry/method/scope/qualification facts are bound into `routeAuthoritySnapshot.semanticHash`, and why are timestamp/UI strings excluded?
3. Why does `ROUTE_AUTHORITY` invalidate C/assessment/benchmark but not A/B?
4. At what point before `runEmp1()` is previous/current route authority reconciled, and what stale-reuse failure does that prevent?
5. Which Q1→Q2 negative control proves this implementation is not a global C disable?
6. Why must a serialized Q1 execution loaded under Q2 fail currentness on first classification?
7. Why is `currentExecutionEvidence` retained when `reportableResult` is null, and where may that stale payload be shown?
8. Why must the normal WRC stress renderer consume only `cState.reportableResult`?
9. Which fields may the complete sample author, and which WRC quantities must CORE derive?
10. Which normal source/import/normalization/custody boundaries does the one-click sample traverse?
11. What must the UI show for `source valid + route suspended`, and which control remains navigable versus disabled?
12. Why are GitHub workflow conclusions not accepted as software FAIL evidence on this head?
13. What executable evidence remains mandatory before the route suspension can be considered for removal?
14. Which engineering authorities remain false throughout PR #1325?
