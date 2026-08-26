# PR1481 Work Report — Issue #1321 ordinary Run current-runtime cutover

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1481 — `Load Calc: route ordinary Run to current Common Input runtime`
- Branch: `agent/issue-1321-run-current-runtime-routing`
- Reconciled base: `main@20e0abb5301363bef0659cf615bc8a37559ac869`
- Upstream: merged #1478, #1475, #1471, #1465, #1461
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED_FOR_SUCCESSOR
- State: SOURCE_COMPLETE_AWAITING_OWNER

## Handover in 60 seconds
This PR completes the ordinary product Run cutover onto the merged current-Common-Input execution chain while keeping scenario execution and explicit historical authorization flows intact.

```text
scenario-ready Run
→ unchanged scenario CALCULATE_REQUESTED

ordinary Run
→ one CURRENT_COMMON_INPUT_CALCULATE_REQUESTED
→ EngineeringModelController.calculateCurrentCommonInput()
→ executeCurrentCommonInputEmpiricalRun() exactly once
→ governed current-system execution
→ existing CHANGED / FAILED result flow
→ CURRENT_COMMON_INPUT_SYSTEM_RUN presentation
```

The historical `ENGINEERING_MODEL_EVENTS.CALCULATE_REQUESTED → executeEmpirical()` path remains available for explicit legacy/historical callers. A current-system failure never retries through it.

## Final production changes
### 1. Ordinary Run routing
`src/workspace/load-calc-consumer-controller.js`
- scenario-ready behavior is unchanged;
- ordinary Run publishes exactly one `CURRENT_COMMON_INPUT_CALCULATE_REQUESTED` event;
- ordinary Run does not call the UI READY-snapshot provider, legacy `refreshEmpirical()`, manual `sealCurrentNonFeaCommonInput()`, or the legacy calculate event;
- READY snapshot creation/reuse and system authorization are runtime-owned.

Constructor injection for the old READY provider / explicit authorization controller is retained for compatibility with existing callers, but ordinary Run no longer consumes those dependencies.

### 2. Single execution ownership
`src/workspace/engineering-model-controller.js`
- adds the current-system event and one `calculateCurrentCommonInput()` owner;
- production default is merged `executeCurrentCommonInputEmpiricalRun()`;
- publishes the established `CHANGED` / `FAILED` event surface;
- no catch/retry into legacy calculation.

### 3. Authority custody and presentation
`src/workspace/engineering-model-store.js`
- exposes current Common Input execution separately;
- classifies current routine results as `CURRENT_COMMON_INPUT_SYSTEM_RUN`;
- does not relabel them `AUTHORIZED_HANDOFF` or `UNAUTHORIZED_LEGACY_RESULT`.

`src/workspace/sequential-sketcher/support-load-presenter.js`
- preserves the same distinct current-system authority in inspector/table presentation.

### 4. Thin current-system view adapter
`src/workspace/load-calc-current-system-view.js`
- deliberately delegates the existing `load-calc-consumer-view.js` unchanged for legacy/scenario rendering;
- enables ordinary Run from a fully READY checker report even before a manual seal exists;
- recognizes a current READY seal using `sealedMethodIds`;
- recognizes an unsealed READY checker result using `readyMethodIds`;
- allows a fresh READY report to supersede a stale retained seal because the runtime will reseal it;
- stale seal without a READY report remains ineligible;
- current-system execution evidence shows actual Common Input, seal, run-authorization, mass-projection, distribution and receipt hashes;
- never synthesizes legacy baseline/handoff or human-approval evidence.

Manual seal remains available as an explicit audit action. It is not an ordinary Run prerequisite.

## Focused falsifiers
### `scripts/load-calc-run-ready-snapshot-check.mjs`
Migrated the registered #1461 regression to the final architecture:
- scenario path unchanged;
- ordinary Run publishes exactly one current-system request;
- UI Run path performs zero READY-provider calls and zero legacy authorization refreshes;
- no manual seal, legacy calculate event or scenario auto-authorization from ordinary Run.

### `scripts/load-calc-current-common-input-run-routing-check.mjs`
Source/focused design covers:
- READY report before manual seal;
- current READY sealed Common Input;
- stale retained seal + fresh READY report reseal path;
- PARTIALLY_READY / blocked / zero-ready-method / checker-error rejection;
- exactly one #1478 current-runtime execution per request;
- zero legacy execution on current-system success/failure;
- historical explicit event retained;
- distinct current-system authority and exact receipt hashes;
- no fake baseline/handoff presentation.

Existing `scripts/authorized-empirical-execution-view-check.mjs` and `src/workspace/load-calc-consumer-view.js` are intentionally unchanged so legacy `AUTHORIZED_HANDOFF` presentation remains independently protected.

## Exact changed-file ledger — 11 files
1. `agents/PR1481_workreport.md`
2. `agents/claims/PR1481.yaml`
3. `agents/status/PR1481.yaml`
4. `scripts/load-calc-current-common-input-run-routing-check.mjs`
5. `scripts/load-calc-run-ready-snapshot-check.mjs`
6. `scripts/run-non-fea-checks.mjs`
7. `src/workspace/engineering-model-controller.js`
8. `src/workspace/engineering-model-store.js`
9. `src/workspace/load-calc-consumer-controller.js`
10. `src/workspace/load-calc-current-system-view.js`
11. `src/workspace/sequential-sketcher/support-load-presenter.js`

Temporary WIP files are absent from the final net tree. `load-calc-consumer-view.js` and the legacy authorized-view regression are not modified.

## Reconciliation
`main` advanced from merged #1478 to `20e0abb5301363bef0659cf615bc8a37559ac869` via unrelated LAFEA qualification work. Those paths did not overlap this Load Calc slice.

The branch was deterministically synchronized using the current-main tree plus exactly the 11 PR1481 blobs. Final compare at reconciliation:
- behind main: 0
- changed files: 11 exact intended files
- LAFEA contamination: none

A transient content-SHA race while transitioning recovery custody created an intermediate commit that truncated only the status record. No production source was altered by that race. It was repaired without force-push by a fast-forward two-parent reconciliation commit restoring the verified 11-file tree.

## Validation truth
Source/repository validation:
- live main grounding: PASS
- production call-path trace: PASS
- READY report vs sealed Common Input semantic audit: PASS
- stale-seal + READY-report reseal audit: PASS
- ordinary one-event routing source review: PASS
- scenario-ready path preservation source review: PASS
- legacy explicit event preservation source review: PASS
- no-legacy-fallback source review: PASS
- distinct authority presentation source review: PASS
- legacy view delegated unchanged: PASS
- temporary WIP removal: PASS
- exact 11-file scope: PASS
- branch behind main: 0

Executable validation:
- migrated final routing check: NOT_RUN
- current-system routing/presentation check: NOT_RUN
- legacy authorized-view check: NOT_RUN
- Non-FEA aggregate: NOT_RUN
- `npm run check:imports`: NOT_RUN
- `npm run build`: NOT_RUN
- `git diff --check`: NOT_RUN

The faithful local checkout path previously failed before materialization with `Could not resolve host: github.com`. No NOT_RUN item is represented as PASS.

## Appendix A — takeover qualification
- A1 Production trace: 20/20
- A2 Failure isolation: 20/20
- A3 Authority invariant: 20/20
- A4 Independent validation design: 18/20
- A5 Minimal patch: 20/20

**Score: 98/100; minimum 18/20.**

## EXACT_NEXT_ACTION
Owner review/merge of #1481 when authorized. After #1481, continue Issue #1321 with #1439 exact `PD-ACTIVE-CASES` Product-default provenance/hash cross-binding hardening. Do not merge this successor without explicit owner authority.
