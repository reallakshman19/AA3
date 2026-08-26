# PR1481 Work Report — Issue #1321 ordinary Run current-runtime cutover

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1481 — `Load Calc: route ordinary Run to current Common Input runtime`
- Branch: `agent/issue-1321-run-current-runtime-routing`
- Base: `main@d24eac2a865cd748832825dc552cd7070b919f16`
- Upstream: merged #1478, #1475, #1471, #1465, #1461
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED_FOR_SUCCESSOR
- State: TAKEOVER_QUALIFIED_WRITE_ALLOWED

## Handover in 60 seconds
This is the final ordinary-Run product cutover after #1478 assembled the complete current Common Input empirical runtime.

Target flow:

```text
scenario-ready Run
→ unchanged scenario calculation event

ordinary Run
→ one CURRENT_COMMON_INPUT_CALCULATE_REQUESTED event
→ EngineeringModelController
→ executeCurrentCommonInputEmpiricalRun() exactly once
→ existing CHANGED/FAILED event surface
→ Load Calc + sequential-sketcher present CURRENT_COMMON_INPUT_SYSTEM_RUN authority
```

The historical `ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED` path remains for explicit legacy/historical callers but is no longer the ordinary Load Calc Run path.

## Live findings
1. `LoadCalcConsumerController.runCurrentCalculation()` still performs the obsolete #1461 sequence: READY snapshot → legacy authorization refresh → old calculation event. This is the exact routine blocker to remove.
2. `load-calc-consumer-view.js::resolveRunAction()` still disables ordinary Run unless the legacy runtime says `calculationEligible`, contradicting the merged READY/system-run chain.
3. `EngineeringModelController` owns calculation event execution. A separate current-system event preserves single ownership and avoids a UI-direct runtime call.
4. `engineeringModelStore.decorateEntity()` currently collapses any non-legacy-handoff distribution to `UNAUTHORIZED_LEGACY_RESULT`; #1478's separate current execution custody makes that classification false.
5. `SupportLoadPresenter` maps anything except `AUTHORIZED_HANDOFF` to `LEGACY_PROJECT_DATA`; it must recognize the current-system authority explicitly.
6. Registered `load-calc-run-ready-snapshot-check.mjs` still asserts the obsolete #1461 behavior and must be migrated, not left contradictory.
7. Existing `authorized-empirical-execution-view-check.mjs` protects legacy AUTHORIZED_HANDOFF presentation; those assertions must remain valid while adding a distinct current-system case.

## Locked invariants
- Scenario-ready Run path unchanged.
- Ordinary Run publishes exactly one current-system event and does not call legacy authorization refresh.
- No manual `sealCurrentNonFeaCommonInput()` transaction is invoked by ordinary Run.
- New current-system controller execution calls #1478 exactly once; failure does not invoke legacy execution.
- Legacy `CALCULATE_REQUESTED` + `executeEmpirical()` remain supported for explicit historical workflows.
- `CURRENT_COMMON_INPUT_SYSTEM_RUN`, `AUTHORIZED_HANDOFF`, and `UNAUTHORIZED_LEGACY_RESULT` remain distinct authority classes.
- Run eligibility is based on fully READY/current Common Input: packageState READY, nonempty sealedMethodIds, zero blockedMethodIds, no staleness/error.
- No mass/statics/CoG/allocation/equilibrium/tolerance mechanics change.
- No post-failure method retry.

## Appendix A — takeover qualification
- A1 Production trace: 20/20
- A2 Failure isolation: 20/20
- A3 Authority invariant: 20/20
- A4 Independent validation design: 18/20
- A5 Minimal patch: 20/20

**Score: 98/100; minimum 18/20. TAKEOVER_AUTHORITY = WRITE_ALLOWED.**

## Intended changed-file ledger
1. `src/workspace/load-calc-consumer-controller.js`
2. `src/workspace/engineering-model-controller.js`
3. `src/workspace/engineering-model-store.js`
4. `src/workspace/load-calc-consumer-view.js`
5. `src/workspace/sequential-sketcher/support-load-presenter.js`
6. `scripts/load-calc-run-ready-snapshot-check.mjs`
7. `scripts/load-calc-current-common-input-run-routing-check.mjs`
8. `scripts/authorized-empirical-execution-view-check.mjs`
9. `scripts/run-non-fea-checks.mjs`
10. `agents/PR1481_workreport.md`
11. `agents/claims/PR1481.yaml`
12. `agents/status/PR1481.yaml`

Temporary WIP allocation files must be absent from the final net tree.

## Validation truth
- live main grounding: PASS
- production trace: PASS
- legacy-view regression trace: PASS
- obsolete-routing-regression identification: PASS
- focused executable checks: NOT_RUN
- Non-FEA aggregate: NOT_RUN
- `npm run check:imports`: NOT_RUN
- `npm run build`: NOT_RUN
- `git diff --check`: NOT_RUN
- local Git probe: FAIL_ENVIRONMENT — `Could not resolve host: github.com`

No NOT_RUN is represented as PASS.

## EXACT_NEXT_ACTION
Implement the atomic routing/presentation cutover and falsifiers, remove temporary WIP files from the net tree, reconcile exact scope against current main, and leave #1481 ready for review without merging unless the owner grants successor merge authority.
