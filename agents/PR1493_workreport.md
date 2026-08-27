# PR1493 Work Report — Issue #1321 D4 + PR-E

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1493
- Branch: `agent/issue-1321-default-usage-coverage-summary`
- Base branch: `main`
- Exact base: `b2e8745a8cdb47850b8f162cea8c16f3f4006e03` (squash merge of #1492)
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED
- State: SOURCE_COMPLETE_REVIEW_PENDING_EXECUTION
- Scope authority: owner explicitly instructed on 2026-08-27 to proceed to the next Issue #1321 slice and stack it on this same PR.

## Handover in 60 seconds
PR #1493 now combines two consecutive Issue #1321 product slices:

1. **D4 — Calculation Defaults observability**
   - actual PROJECT_CONFIGURED_DEFAULT usage receipts;
   - Product-default Project Data path-fill assumptions kept semantically separate;
   - current Common Input package/method readiness;
   - canonical MASS/FLEXURAL/SECTION coverage and exact missing governed entities;
   - grouped checker blockers with method/receipt custody.

2. **PR-E — One-click ordinary Run**
   - the Run button becomes attemptable after active dataset + canonical topology structural readiness, even before the user has visited Input Check or manually sealed/authorized;
   - the existing backend remains the sole authority for current-input build/evaluation, READY-only system seal, routine authorization receipt, governed method selection, mass projection and support-load execution;
   - non-READY input still fails closed and never falls back to legacy calculation;
   - existing explicit seal/authorization APIs remain untouched for advanced/audit use;
   - retained results/seals are invalidated when calculation-affecting Common Input configuration or bound authority contracts change.

Executable qualification remains NOT_RUN because a faithful checkout cannot be obtained in the available environment.

## Live grounding / coordination
- `main` at final production-source reconciliation: `b2e8745a8cdb47850b8f162cea8c16f3f4006e03`.
- Production head before recovery-close commits: `118c00d2a5a71c88fc52cdb561498401fec61f59`.
- Compare at that checkpoint: `ahead`, `behind_by=0`, exact 10-file net delta.
- PR at that checkpoint: open, draft, mergeable=true.
- Reviews / review threads at that checkpoint: 0 / 0.
- Exact-head combined statuses at that checkpoint: none present.
- Repository `agents/MASTER_INDEX.md`: not present when checked.
- Other active Issue #1321 workstream: PR #1491 source-axis-general scalar gravity; no exact intended PR-E file overlap.

## D4 production trace
`renderProjectDataView()`
→ `renderNonFeaCalculationDefaultsView()`
→ `renderNonFeaCalculationEffectiveValuesInspector()`
→ **one** `buildCurrentPreFeaRequestInput()`
→ D3 reads `current.resolutionLedger`
→ D4 calls canonical `createPreFeaPipingCheckRequest(current)`
→ canonical `runPreFeaPipingCheck(request)`
→ D4 projects configured-default usage, Product-default provider receipts, checker coverage and blockers.

D4 never calls store-mutating Common Input evaluation, sealing, authorization or numerical execution merely because the engineer opens Calculation Defaults.

## PR-E production trace
Ordinary Run remains:

`[data-load-calc-run]`
→ `LoadCalcConsumerController.runCurrentCalculation()`
→ `ENGINEERING_MODEL_EVENTS.CURRENT_COMMON_INPUT_CALCULATE_REQUESTED`
→ `EngineeringModelController.calculateCurrentCommonInput()`
→ `executeCurrentCommonInputEmpiricalRun()`
→ `sealCurrentReadyNonFeaCalculationSnapshot()`
→ current Common Input build/evaluate
→ **fully READY-only** system seal
→ `authorizeCurrentNonFeaEmpiricalRun()`
→ method-currentness authorization receipt
→ governed gravity-method authority and selection
→ current Common Input mass projection
→ selected support-load execution
→ current-system execution receipt/store.

The UI change does not perform any of those authority operations. It only permits the engineer to request that existing governed chain once dataset/topology are structurally ready.

## PR-E correction E1 — Run attempt != READY claim
Before PR-E, `isRoutineRunReady()` was both:
- the correct strict predicate for validated READY state, and
- incorrectly the prerequisite for enabling the Run button.

That meant the engineer had to create a checker report/seal first, despite ordinary Run already owning the current-input evaluation/seal chain.

Implemented:
- retained `isRoutineRunReady(commonState)` as the strict checker/seal READY predicate;
- added `isRoutineRunAttemptAvailable(state)` using only guided-workflow dataset + canonical-topology readiness;
- structurally ready ordinary models can request Run before prior checker evaluation;
- the button/pill copy explicitly says Run will validate and authorize;
- only a true checker report/current READY seal receives READY wording;
- button copy states that non-READY input fails closed;
- Step-4 tile shows `One-click` before prior validation and `Ready` only after validated readiness.

A source-review defect introduced during the first write over-escaped the HTML quote matcher in `escapeHtml()`. It was corrected before reconciliation; ordinary `"` escaping now uses the original safe mapping.

## PR-E correction E2 — Common Input configuration invalidation
`nonFeaCommonInputStore.configure()` already stales its retained seal when requested methods, load cases or qualification profile change, but previous support-load results did not have a central invalidation subscriber.

Implemented in `EngineeringModelController`:
- capture stable runtime identity of `snapshot.configuration` at init;
- subscribe to the Common Input store;
- when configuration identity changes, mark empirical result stale with `COMMON_INPUT_CONFIGURATION_CHANGED`, refresh explicit legacy-package currentness, and publish a normal engineering-model change;
- evaluation/sealing that leaves configuration unchanged does **not** stale results.

## PR-E correction E3 — bound authority-contract invalidation
A broader dependency audit found another important gap: current Common Input binds these live authority contracts:
- `topologyGraph`;
- `supportAttachmentModel` / `restraintCapabilityModel`;
- `loadPrimitiveSet`.

Those stores can emit changes independently of Project Data/master configuration. Without explicit staleness, `sealCurrentReadyNonFeaCalculationSnapshot()` could see an old retained seal as current and reuse it without re-evaluating changed authority.

Implemented central listeners in `EngineeringModelController`:
- `TOPOLOGY_EVENTS.CHANGED` → `TOPOLOGY_AUTHORITY_CHANGED` / `authorityContracts.topologyGraph`;
- `SUPPORT_RESTRAINT_EVENTS.CHANGED` → `SUPPORT_RESTRAINT_AUTHORITY_CHANGED` / `authorityContracts.supportAttachmentModel`;
- `MODEL_LOAD_EVENTS.CHANGED` → `MODEL_LOAD_AUTHORITY_CHANGED` / `authorityContracts.loadPrimitiveSet`.

For each change:
- a CURRENT numerical result is marked STALE;
- the retained Common Input seal is marked stale;
- explicit-package currentness is refreshed;
- no calculation runs automatically.

This closes the current ordinary-Run dependency set together with existing invalidation for dataset/shared-model, Project Data and master/enrichment changes.

## Authority / safety boundaries
Unchanged by PR #1493:
- `src/core/non-fea-common-checker/**`;
- `src/core/non-fea-enrichment/**`;
- `src/workspace/non-fea-common-input-runtime.js` READY-only system snapshot behavior;
- configured/Product default resolver precedence;
- `src/workspace/engineering-loads/**` numerical/statics/runtime receipt mechanics;
- source-axis qualification (#1491 domain);
- solver/tolerances;
- GitHub workflows.

Existing advanced/audit paths remain:
- explicit Common Input evaluation/seal/export;
- explicit scenario authorization/calculation;
- legacy authorized execution event.

Ordinary current-system failure does not retry through legacy execution.

## Focused falsifier coverage authored
`load-calc-current-common-input-run-routing-check.mjs` now covers, when executable:
- validated READY remains checker/seal-owned;
- dataset + topology are sufficient to enable a Run **attempt** before prior checker evaluation;
- missing dataset/topology still disables the attempt;
- current-system event executes exactly once;
- current-system failure never falls back to legacy calculation;
- legacy explicit calculation event remains supported;
- method/load-case/qualification configuration changes publish result invalidation;
- identical configuration does not repeatedly invalidate;
- topology, support/restraint and model-load authority changes stale both result and Common Input seal;
- current-system receipt presentation preserves Common Input, seal, Run authorization, mass projection, distribution and execution hashes;
- presentation layer does not invoke seal/authorize APIs itself;
- support-load store staleness clears the current-system execution receipt and publishes STALE freshness.

The D4 focused falsifier remains separately registered in the aggregate.

## Validation truth
PASS_SOURCE_INSPECTION:
- #1492 merged-base grounding;
- D4 canonical usage/provider/checker ownership;
- D3+D4 one-current-input-build architecture;
- PR-E ordinary backend auto-snapshot trace;
- PR-E ordinary backend system-authorization trace;
- structural Run-attempt vs validated READY separation;
- no legacy failure fallback;
- Common Input configuration staleness path;
- topology authority staleness path;
- support/restraint authority staleness path;
- load-primitive authority staleness path;
- exact 10-file production diff before recovery close;
- live main `behind_by=0` before recovery close;
- 0 reviews / 0 threads before recovery close.

Environment/execution:
- faithful local clone retry: BLOCKED_ENVIRONMENT — `fatal: unable to access ... Could not resolve host: github.com` before checkout;
- exact production-head combined statuses: none present;
- focused PR-E Node regression: NOT_RUN;
- focused D4 Node regression: NOT_RUN;
- `node scripts/run-non-fea-checks.mjs`: NOT_RUN;
- `npm run check:imports`: NOT_RUN;
- `node scripts/advanced-shell-contract-check.mjs`: NOT_RUN;
- `npm run build`: NOT_RUN;
- `git diff --check`: NOT_RUN.

No NOT_RUN item is represented as PASS.

## Exact production net file ledger before recovery-close commits — 10 files
1. `agents/PR1493_workreport.md`
2. `agents/claims/PR1493.yaml`
3. `agents/status/PR1493.yaml`
4. `scripts/load-calc-current-common-input-run-routing-check.mjs`
5. `scripts/non-fea-calculation-defaults-observability-check.mjs`
6. `scripts/run-non-fea-checks.mjs`
7. `src/workspace/engineering-model-controller.js`
8. `src/workspace/load-calc-current-system-view.js`
9. `src/workspace/project-data/non-fea-calculation-defaults-observability-model.js`
10. `src/workspace/project-data/non-fea-calculation-effective-values-view.js`

No `load-calc-consumer-controller.js`, Common Input runtime, engineering-load numerical module or workflow file is in the net diff.

## Appendix A — takeover questions
1. Explain why `isRoutineRunAttemptAvailable()` may be true while `isRoutineRunReady()` is false without weakening engineering authority.
2. Trace the exact call that evaluates Common Input after a pre-evaluation Run click and identify the first line of authority that prevents PARTIALLY_READY/BLOCKED input from being system-sealed.
3. Why must topology/support-restraint/load-primitive `CHANGED` events stale the retained Common Input seal even if Project Data and dataset identity did not change?
4. Show how `COMMON_INPUT_CONFIGURATION_CHANGED` invalidates current results while repeated evaluation/sealing with unchanged configuration does not.
5. Which current-system receipt hashes prove the system Run remained auditable after removing the manual workflow prerequisite?
6. Prove the current-system failure path cannot call the legacy explicit calculation path.
7. What value or behavior would falsify the claim that PR-E changed only orchestration/presentation and not numerical authority?

## EXACT_NEXT_ACTION
Recheck the actual post-recovery final head against live `main`, confirm exact 10-file net scope / zero behind / mergeability / reviews / threads, update the PR title/body to D4+PR-E truth, and keep the PR draft/unmerged. Executable qualification remains NOT_RUN unless a faithful checkout becomes available.
