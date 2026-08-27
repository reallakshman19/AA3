# PR1493 Work Report — Issue #1321 D4 + PR-E

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1493 — `Load Calc: expose default usage and coverage summary`
- Branch: `agent/issue-1321-default-usage-coverage-summary`
- Base branch: `main`
- Exact base: `b2e8745a8cdb47850b8f162cea8c16f3f4006e03` (squash merge of #1492)
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED
- Current state: IMPLEMENTATION_IN_PROGRESS_PR_E_STACKED
- Scope authority: owner explicitly instructed on 2026-08-27 to proceed to the next Issue #1321 slice and stack it on this same PR.

## Handover in 60 seconds
D4 is already source-complete on this branch: Calculation Defaults exposes canonical configured-default usage, Product-default path-fill assumptions, Common Input coverage and grouped readiness blockers without changing authority/mechanics. The owner then expanded this same PR into PR-E one-click execution.

The existing backend already performs the intended system Run chain:

`Run click`
→ `CURRENT_COMMON_INPUT_CALCULATE_REQUESTED`
→ `EngineeringModelController.calculateCurrentCommonInput()`
→ `executeCurrentCommonInputEmpiricalRun()`
→ `sealCurrentReadyNonFeaCalculationSnapshot()`
→ current Common Input build/evaluate
→ READY-only system seal
→ `authorizeCurrentNonFeaEmpiricalRun()`
→ method-currentness authorization receipt
→ governed method selection
→ current mass projection
→ current support-load execution
→ execution receipt/store.

The isolated product defect is upstream UI gating: the header Run button is disabled until `isRoutineRunReady()` sees an already-created READY checker report or current READY seal, even though the click path itself would create/evaluate/seal that snapshot. This forces a manual validation visit contrary to PR-E.

A second PR-E gap was isolated: `nonFeaCommonInputStore.configure()` correctly marks the Common Input seal stale when requested methods/load cases/qualification change, but the current support-load distribution is not independently marked stale. `EngineeringModelController` must observe configuration changes and invalidate current results.

## Coordination / grounding
- Live `main` at scope expansion: `b2e8745a8cdb47850b8f162cea8c16f3f4006e03`.
- PR #1493 head before scope expansion: `629911845f1be8bb6f4ac2f173c75f0d437d8cb9`.
- PR state: open, draft, mergeable at the last reconciliation; 0 reviews / 0 review threads then.
- Repository `agents/MASTER_INDEX.md`: not present at checked branch path.
- Other active Issue #1321 workstream: PR #1491, source-axis-general scalar gravity. No intended exact-file overlap with this PR-E slice.
- Same-agent continuation; no takeover qualification required. Scope expansion is explicitly owner-authorized.

## Completed D4 state retained
D4 implements:
1. `non-fea-calculation-defaults-observability-model.js` — read-only configured-default/Product-default/checker coverage projection.
2. Extended `non-fea-calculation-effective-values-view.js` — D3 + D4 share one current-input build.
3. `non-fea-calculation-defaults-observability-check.mjs` — source/falsifier coverage.
4. Registration in `run-non-fea-checks.mjs`.
5. Numbered recovery records.

D4 invariants remain:
- no resolver precedence change;
- no Product-default promotion to fabricated target winner;
- no duplicate coverage algorithm;
- no Common Input store mutation merely by opening Calculation Defaults;
- no seal/Run execution from D4 view;
- no numerical mechanics/source-axis/tolerance change.

## PR-E governing requirement from Issue #1321
PR-E requires:
- Run must not require manual traversal of Project Data → Masters → Preflight → Seal → Authorize.
- Internal semantic snapshot/receipt generation remains auditable.
- Existing explicit seal/authorization APIs remain available for advanced/audit use.
- Previous results become stale when any calculation-affecting dependency changes.

## PR-E production diagnosis
### Existing backend already satisfies most orchestration
`src/workspace/engineering-loads/current-common-input-empirical-run-runtime.js` already uses:
- `sealCurrentReadyNonFeaCalculationSnapshot`;
- `authorizeCurrentNonFeaEmpiricalRun`;
- governed gravity-method authority/selection;
- current Common Input mass projection;
- current support-load execution;
- separate current-system execution custody.

It remains fail-closed: a non-READY/stale/partial snapshot cannot reach authorization or numerical execution, and a selected-method failure is not retried through legacy/lower-fidelity execution.

### ISS-1493-E1 — UI pre-evaluation gate
`load-calc-current-system-view.js::isRoutineRunReady()` is appropriate as a **validated READY** predicate, but `renderLoadCalcConsumer()` also uses it as the prerequisite for enabling the Run button. If the Common Input checker has not been evaluated yet, ordinary Run is disabled even when dataset/topology are structurally ready.

Planned correction: introduce a distinct structural **Run-attempt availability** predicate based on guided-workflow dataset/topology readiness. The button may then invoke the existing governed runtime. UI text must say it will build/validate/seal/authorize on Run; it must not claim READY before the checker does. Backend READY-only gates stay unchanged.

### ISS-1493-E2 — configuration change result staleness
`nonFeaCommonInputStore.configure()` invalidates its own request/report/current seal correctly, but current support-load result freshness is not guaranteed to change. Method/load-case/qualification selection changes are calculation-affecting and therefore must invalidate `engineeringSupportLoadStore` current execution/distribution.

Planned correction: `EngineeringModelController` observes Common Input configuration identity, calls `engineeringModelStore.markEmpiricalStale('COMMON_INPUT_CONFIGURATION_CHANGED', ...)` only when configuration changes, refreshes legacy explicit package state, and publishes a normal engineering-model change event. Evaluation/sealing without configuration change must not stale a result.

## Planned production cut
1. `src/workspace/load-calc-current-system-view.js`
   - add pure structural Run-attempt predicate;
   - enable ordinary Run after dataset + canonical topology readiness even before a checker report exists;
   - keep validated READY status semantically separate;
   - align Run tile/pill/status text with deferred system validation.
2. `src/workspace/load-calc-consumer-controller.js`
   - Verify pane treats system build/evaluate/seal/authorize as automatic on Run;
   - does not require manual Project Data/Masters/Seal traversal merely because raw fields are empty;
   - unresolved/invalid current input still fails closed at Run.
3. `src/workspace/engineering-model-controller.js`
   - subscribe to Common Input store configuration changes;
   - mark current engineering results stale only when requested method/load-case/qualification basis changes.
4. `scripts/load-calc-current-common-input-run-routing-check.mjs`
   - extend existing focused regression for pre-evaluation clickable Run and configuration-change staleness;
   - retain checks proving legacy explicit paths remain and runtime failure never falls back.
5. Recovery records updated continuously.

## Protected boundaries
Do not change in PR-E:
- `src/core/non-fea-common-checker/**`;
- `src/core/non-fea-enrichment/**`;
- `src/workspace/non-fea-common-input-runtime.js` READY-only system snapshot logic;
- effective-value resolver/provider precedence;
- `src/workspace/engineering-loads/**` numerical/statics/runtime receipt mechanics;
- source-axis qualification (#1491 domain);
- solver/tolerance behavior;
- workflows.

Clickable Run means **attempt governed current-system execution**, not **prevalidated READY**.

## Validation ledger
Source inspection:
- current backend auto-snapshot chain: PASS_SOURCE_INSPECTION;
- current backend system authorization receipt chain: PASS_SOURCE_INSPECTION;
- UI pre-evaluation gate defect: PASS_SOURCE_INSPECTION;
- method/load-case/qualification staleness gap: PASS_SOURCE_INSPECTION;
- D4 prior source reconciliation: PASS_SOURCE_INSPECTION.

Execution:
- faithful local checkout: BLOCKED_ENVIRONMENT (`Could not resolve host: github.com` from prior attempts);
- focused PR-E Node regression: NOT_RUN;
- `node scripts/run-non-fea-checks.mjs`: NOT_RUN;
- `npm run check:imports`: NOT_RUN;
- `node scripts/advanced-shell-contract-check.mjs`: NOT_RUN;
- `npm run build`: NOT_RUN;
- `git diff --check`: NOT_RUN.

No NOT_RUN item may be represented as PASS.

## Current changed-file ledger before PR-E production writes
Existing D4 net files:
1. `agents/PR1493_workreport.md`
2. `agents/claims/PR1493.yaml`
3. `agents/status/PR1493.yaml`
4. `scripts/non-fea-calculation-defaults-observability-check.mjs`
5. `scripts/run-non-fea-checks.mjs`
6. `src/workspace/project-data/non-fea-calculation-defaults-observability-model.js`
7. `src/workspace/project-data/non-fea-calculation-effective-values-view.js`

Expected additional PR-E files:
8. `scripts/load-calc-current-common-input-run-routing-check.mjs`
9. `src/workspace/load-calc-current-system-view.js`
10. `src/workspace/load-calc-consumer-controller.js`
11. `src/workspace/engineering-model-controller.js`

Exact final ledger must be reconciled from GitHub after implementation.

## Appendix A — next-agent technical questions
1. Trace why `isRoutineRunReady()` is a validated-READY predicate but cannot remain the sole Run-button enablement predicate under PR-E.
2. Show the exact backend call that creates/evaluates the current Common Input on ordinary Run and identify the point that rejects PARTIALLY_READY/BLOCKED input before authorization.
3. Explain why enabling a Run *attempt* after topology readiness does not weaken Common Input engineering authority.
4. Trace a Method Basis configuration change from `nonFeaCommonInputStore.configure()` to result freshness; identify the missing pre-PR-E invalidation boundary.
5. Prove evaluation/seal operations that leave configuration unchanged must not invalidate an otherwise-current numerical result.
6. Identify the exact evidence hashes retained by current-system Run and explain why legacy explicit seal/authorization APIs remain independently available.

## EXACT_NEXT_ACTION
Implement the three PR-E production corrections and extend the existing focused current-system Run regression. Then source-review the patches, retry faithful execution once, reconcile live main/head/diff/reviews/threads, update PR body/recovery, and keep the PR draft/unmerged unless the owner explicitly authorizes merge.
