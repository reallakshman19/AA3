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
- `LAST_CODE_HEAD: 04d57c13fe3687f8d75142e4968bab9b44667ef2`
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
5. add adversarial and visible-workflow qualification for the current fail-closed route state.

## Ground truth and protected boundaries
- Branch was created from exact `main@a222e18c38bd20fb55c1c6c95f724f40e40e8532`.
- Current bounded route remains `EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP` and is production-suspended.
- Governing current suspension remains `WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`.
- This PR does not authorize production C, global/full-domain EMP.1.C, code compliance, or release.
- No workflow YAML files are changed.
- A retained numerical C execution is immutable historical evidence. Authority mutation changes currentness/reportability, not the historical record.
- A/B are not invalidated merely because C route authority changes.
- The complete sample does not author `Rm`, `T`, `r0`, gamma, beta, nearest-end distance, WRC axes, WRC load components, coefficients, stresses, governing location, route authorization, code compliance, or release status.

## Implemented engineering changes

### 1. Route-authority currentness — P0 closed in source
- Added change class `ROUTE_AUTHORITY`.
- `ROUTE_AUTHORITY` invalidates only `EMP.1.C`, assessment, and benchmark; A/B are outside this invalidation set.
- Added deterministic `emp1-workbench-route-authority-snapshot/v1` in the workbench product runtime.
- Snapshot semantic payload binds:
  - bounded route identity;
  - route-module authorization state and suspension reasons;
  - registry registration and engineering-use authorization;
  - retained method/source/qualification/dataset authority carried by the registry method record;
  - bounded scope semantics and source-authority identities carried by the registry scope;
  - limitations and remaining blocked scope.
- Timestamp/UI text are not part of the engineering semantic hash.
- Every new product execution retains `authority.routeAuthoritySnapshot`.
- Previous/current snapshot mismatch is reconciled before `runEmp1()` so an unchanged A/B/input transaction cannot reuse a C result under a changed authority.
- Previous numerical C evidence is preserved as `emp1-workbench-retained-c-evidence/v1` history rather than deleted.

### 2. Authority-aware currentness and one C-state projection
- Workbench currentness now distinguishes source/input currentness, C authority currentness, and C reportability.
- Missing retained/current authority snapshots fail closed for numerical C.
- Changed authority emits governed C route-authority currentness blockers and suppresses reportability.
- Added C states `SOURCE_INCOMPLETE`, `ROUTE_SUSPENDED`, `READY_TO_RUN`, `CALCULATED_CURRENT`, `STALE_AUTHORITY`, and `STALE_INPUT`.
- The projection owns production-C button enablement/label, C badge, blockers, current reportable result, current execution evidence, and retained historical evidence.
- The visible workbench uses `inputCurrent` to retain unchanged A/B presentations across a C-only authority mutation.
- C setup/evidence navigation remains available while production execution is suspended; the separate production C action is disabled by authority state.

### 3. Complete source-only qualification sample
- Added `[SIMULATED] Load complete EMP.1 qualification sample`.
- The controller imports A and B through normal stage import APIs, applies the canonical run-input normalizer, and invokes the normal unified product transaction.
- B ancestry is refreshed through `refreshEmp1BSourceEvidence()` from a real A execution; fixture-carried A result authority is not trusted by the final product transaction.
- Typed C sample input is limited to load-case identity, pressure-result identity, attachment OD-at-shell-juncture source binding, and WRC §4.5 cylinder length/station source bindings.
- `normalizeEmp1WorkbenchRunInput()` and the existing typed source-authority constructors remain the authority boundaries.
- Under the present suspended route, expected truth is `A=1, B=1, prepare C=1, production C=0`, status `PREPARED_C_BLOCKED`, with no WRC stresses/code/release result.

### 4. Adversarial currentness falsifier authored
`scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs` covers:
- Q1 authorized/current numerical C;
- Q1 -> different authorized Q2 with identical A/B/input;
- old Q1 result stale/non-reportable while Q2 rerun remains enabled — negative control proving this is not a global C disable;
- fresh Q2 result current;
- same Q2 subsequently suspended: C hidden/disabled while A/B/input remain current;
- semantically unchanged Q2 clone not stale;
- legacy numerical C without retained authority snapshot fails closed;
- input staleness remains distinguishable from authority staleness.

### 5. Complete-sample production-path qualification authored
`scripts/emp1-workbench-complete-sample-qualification.mjs` asserts:
- exact source-only C input key shapes and absence of derived/result/authority fields;
- raw sample A/B are passed through `normalizeLafeaStageDocument()` before the direct product transaction, matching the controller/store import boundary instead of creating a privileged raw-document test path;
- normal product readiness and current route suspension;
- `PREPARED_C_BLOCKED` with invocations exactly `A 1 / B 1 / prepare C 1 / production C 0`;
- no C stresses, code-compliance, or release claim;
- gamma/beta/r0/nearest-end distance appear only after CORE derives them;
- C projection is `ROUTE_SUSPENDED`, disabled, and has no reportable result.

### 6. Browser/E2E current-truth qualification authored
`e2e/emp1-workbench-authority.spec.js` exercises the real controller and one-click sample action. It asserts:
- one-click sample reaches the transaction summary;
- `A 1 / B 1 / prepare C 1 / production C 0`;
- C navigation enabled for setup/evidence;
- production `Run C` disabled with state `ROUTE_SUSPENDED`;
- exact current requalification blocker visible;
- no `emp1-c-result-evidence` result card rendered;
- C executed = NO, code compliance = NO, release qualified = NO;
- retained execution has a route-authority semantic hash.

## Source-level renderer audit
- `lafea-workbench-view.js` injects retained A/B executions when `emp1ExecutionCurrentness.inputCurrent === true`; a C-only authority mutation therefore does not discard unchanged A/B presentation.
- `lafea-analytical-calc-content.js` only creates a production C result card when the overall product execution is current and the retained product says bounded C executed. A stale/suspended authority therefore cannot expose the historical C stress card on the current path.
- The stricter C-state projection governs product state, C action, blockers, and current-result availability. The browser qualification explicitly asserts no C result card under suspension.
- No presentation-only renderer rewrite was made after this audit because the existing result path is already fail-closed.

## Validation evidence
### Exact-head workflow observation at code head `04d57c13fe3687f8d75142e4968bab9b44667ef2`
Six PR-triggered workflows were created. GitHub reports them completed/failure, but the inspected relevant jobs contain `steps=null` and `logs_url=null`; no checkout, script, numerical comparison, or browser step executed. Classify them `NOT_RUN_EXECUTION_ENVIRONMENT`, not software FAIL and not PASS.

Latest inspected examples:
- `LAFEA visible workbench qualification` run `32575982425`, job `97038296700`: `steps=null`, `logs_url=null`.
- `EMP.1 runEmp1 bounded gamma5 orchestration` run `32575982434`, job `97038296668`: `steps=null`, `logs_url=null`.
- Prior same-head-family observations for the independent gamma5/main-route jobs showed the same `steps=null`, `logs_url=null` startup condition.

### Validation classification
- Source/diff audit against issue #1324 acceptance: `COMPLETE`.
- Sample fixture API/static canonicalization audit: `COMPLETE`; standalone qualification corrected at code head `04d57c13…` to reproduce store normalization.
- Authority-currentness falsifier execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Complete-sample Node qualification execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Browser/Playwright EMP.1 qualification execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Existing focused EMP.1 orchestration workflow execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Independent gamma5 exact-head oracle execution: `NOT_RUN_EXECUTION_ENVIRONMENT`.
- Full repository regression: `NOT_RUN`.
- Live deployed-browser click-through: `NOT_RUN`.

No unexecuted check is represented as PASS.

## Changed-file ledger
1. `agents/PR1325_workreport.md` — living recovery/validation/handover record.
2. `scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs` — Q1/Q2/suspension/legacy/input adversarial currentness tests.
3. `scripts/emp1-workbench-complete-sample-qualification.mjs` — source-only sample + canonicalized real product-path suspended-C qualification.
4. `e2e/emp1-workbench-authority.spec.js` — visible one-click sample and suspended-C truth qualification.
5. `src/core/emp1/emp1-dependency-graph.js` — `ROUTE_AUTHORITY` C-only downstream invalidation.
6. `src/workspace/emp1-workbench-product-run.js` — canonical route-authority snapshot, current authority resolver, pre-run invalidation, retained C history.
7. `src/workspace/emp1-workbench-run-state.js` — authority-aware currentness and single C-state/reportability projection.
8. `src/workspace/emp1-workbench-qualification-sample.js` — deterministic source-only complete qualification bundle.
9. `src/workspace/lafea-workbench-controller.js` — normal import/normalize/run wiring for the complete sample and live route-authority provider.
10. `src/workspace/lafea-workbench-view.js` — current route evaluation, A/B input-current presentation, sample action, separate state-driven production C control.
11. `src/workspace/lafea-guided-workflow-view.js` — C setup navigation and state/badge/blocker presentation driven by product C state.

## Open blockers / risks
- `VAL-1324-01`: authored Node qualification and adversarial falsifiers have not executed in the available environment.
- `VAL-1324-02`: authored browser qualification has not executed because the exact-head runner never started a job step.
- `VAL-1324-03`: independent exact-head gamma5 requalification remains `NOT_RUN_EXECUTION_ENVIRONMENT`; production-route suspension must remain in force.
- `RISK-1324-01`: do not interpret source-authority closure, authored tests, or historical ~72.67 MPa comparison evidence as production authorization.
- `RISK-1324-02`: unsupported method scope remains fail-closed: nonzero differential pressure, general Kn/Kb, gamma outside bounded scope, beta outside qualified range, off-axis/global maxima, nozzle/attachment stress claims, WRC 297/nozzle-neck routes, rectangular/lug approximations, and code/release authority.

## Exact next action
1. When an execution environment actually starts steps, execute on exact code head `04d57c13fe3687f8d75142e4968bab9b44667ef2`:
   - `node scripts/emp1-workbench-route-authority-currentness-falsifiers.mjs`
   - `node scripts/emp1-workbench-complete-sample-qualification.mjs`
   - existing `scripts/emp1-workbench-product-run-qualification.mjs`
   - Playwright `e2e/emp1-workbench-authority.spec.js` with the repository LAFEA guided configuration;
   - independent gamma5 exact-head oracle/current-candidate comparison and required regression bundle.
2. Record actual stdout/artifacts/hashes here.
3. Only after green exact-head engineering + product-path evidence and review should a separate explicit decision consider lifting the bounded-route suspension. PR #1325 currently keeps it false.

## Appendix A — takeover qualification
1. Why can an unchanged numerical WRC result cease to be engineering-current when A/B/input bytes are unchanged?
2. Which exact registry/method/scope/qualification facts are bound into `routeAuthoritySnapshot.semanticHash`, and why are timestamp/UI strings excluded?
3. Why does `ROUTE_AUTHORITY` invalidate C/assessment/benchmark but not A/B?
4. At what point before `runEmp1()` is previous/current route authority reconciled, and what stale-reuse failure does that prevent?
5. Which Q1->Q2 negative control proves this implementation is not a global C disable?
6. Where is historical numerical C evidence retained after rerun/authority mutation, and why is that distinct from reportability?
7. Which fields may the complete sample author, and which WRC quantities must CORE derive?
8. Which normal source/import/normalization/custody boundaries does the one-click sample traverse?
9. What must the UI show for `source valid + route suspended`, and which control remains navigable versus disabled?
10. Why are the GitHub workflow conclusions not accepted as software FAIL evidence on this head?
11. What executable evidence is still mandatory before the current route suspension can be considered for removal?
12. Which engineering authorities remain false throughout PR #1325?
