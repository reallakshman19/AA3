# PR1248 — Current-Main Production Bundle Hard-Ceiling Repair

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1248 (draft)
BRANCH: agent/main-bundle-hard-ceiling-repair-20260818
BASE_SHA: 585a897afa0f5c9799cb68a58de00a55808062b3
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: BOUNDED_LEAF_SPLIT_IMPLEMENTATION
CURRENT_PRODUCT_CODE_CHANGE: NONE_BEFORE_NEXT_COMMIT
CURRENT_BLOCKER: exact-main main chunk 1,205,227 B > 1,179,648 B hard ceiling
EXACT_NEXT_ACTION: add one Vite-only manual-chunk boundary for stateless `load-calc-consumer-view.js`; then require production bundle <=1,179,648 B and real browser boot before accepting. Reject on TDZ/evaluation-order failure.
```

## Mission
Restore the existing production bundle hard-ceiling gate on current main as a prerequisite for PR #1246 TECH-13 exact-head qualification.

Authoritative baseline from closed diagnostic PR #1247:

```text
hard ceiling                    1,179,648 B
exact-main main chunk            1,205,227 B
required recovery                   25,579 B
required reduction vs main           2.122% of current main chunk
pre-existing overage vs ceiling       2.1684%
```

PR #1246 currently adds 22,238 B beyond this exact-main baseline, but that is a separate incremental concern. PR #1248 owns only the pre-existing 25,579 B current-main debt unless explicitly re-scoped.

## Constraints / Falsifiers
- Do not raise or bypass `bundle-chunk-check.mjs`.
- Do not redefine the engineering threshold.
- Do not force a stateful workspace controller/store/view into a manual chunk based on size alone.
- A chunk-size PASS with TDZ/evaluation-order browser failure is FAIL.
- A change that modifies engineering calculations, mesh policy, solver behavior, or TECH-13 trust-root authority is out of scope.
- Prefer a one-way stateless leaf, existing dynamic boundary, or deduplication with source-level proof.
- Browser boot and existing relevant qualification paths must remain behaviorally unchanged.
- No merge without explicit owner authorization.

## Current Evidence
### VAL-BASE-BUNDLE-01 — FAIL / PREEXISTING_BY_EXACT_EXECUTION
Exact main application source `585a897a...` produced `1,205,227 B` main chunk under the existing `1,179,648 B` hard ceiling. Required reduction = `25,579 B`.

### VAL-PROFILE-01 — PASS
REMOTE_EXECUTION. Run `32098815421`, artifact `9310846299`, exact diagnostic head `fee565c1cbe22ff088737413d18a67b2f7532559`. Rollup `main.modules[*].renderedLength` profile contains 333 modules. Highest rendered contributions:

```text
load-calc-consumer-controller.js              41,758 B  [stateful controller: reject size-only split]
load-calc-consumer-view.js                    32,589 B  [candidate]
linear-piping-results-workbench.js            28,104 B  [stateful workbench: reject size-only split]
lafea-discretization-generation-panel.js      25,745 B  [UI/controller-like: not first candidate]
linear-piping-inputxml-source-workflow.js      24,632 B
src/main.js                                    23,259 B
lfea-preflight-phase1-review-source.js         23,140 B
lfea-preflight-ui.js                           22,241 B
lafea-results-view.js                          22,205 B
```

### VAL-CANDIDATE-BOUNDARY-01 — PASS / SOURCE_INSPECTION
Selected candidate: `src/workspace/load-calc-consumer-view.js`, rendered contribution `32,589 B`.

Why this candidate is bounded:
- exports presentation/render functions; creates markup/DOM only when called;
- no controller/store/event-bus singleton is created at module load;
- no module-level mutable engineering state;
- only source import is `topology-edit/topology-edit-gap-autofix-policy.js`;
- that policy is import-free and contains only constants plus a pure range validator;
- the stateful `load-calc-consumer-controller.js` imports the view and remains Rollup graph-owned;
- candidate rendered bytes exceed required recovery by `32,589 - 25,579 = 7,010 B` before chunk/import overhead.

Risk: because the controller also imports a gap-policy constant, a bad chunk boundary could create a cyclic generated graph. Acceptance therefore requires generated production build plus real browser boot; size PASS alone is insufficient.

Falsifier: if the generated chunk imports a stateful main-owned controller/store, produces circular-chunk/TDZ warnings, changes UI behavior, or fails browser boot, reject this split.

## Planned Minimal Mutation
One Vite `manualChunk()` exception only:

```text
load-calc-consumer-view.js -> dedicated presentation leaf chunk
```

Do not move `load-calc-consumer-controller.js`. Do not change application source, calculations, policies, bundle ceiling, or `onlyExplicitManualChunks` semantics.

## Changed-File Ledger before production mutation
1. `scripts/lafea-bundle-main-module-profile.mjs` — diagnostic Rollup module-weight profile; not application-imported.
2. `.github/workflows/lafea-visible-workbench.yml` — temporary profile/artifact invocation.
3. `agents/PR1248_workreport.md` — living delivery authority.

Application product-code paths changed: **0**.

## Exact Continuation State
```text
1. Add one Vite-only load-calc consumer view leaf rule.
2. Run profile + production bundle; require main <= 1,179,648 B.
3. Inspect generated chunk warnings/import direction.
4. Run real production browser boot/UI proof; any TDZ/evaluation-order error = FAIL.
5. If PASS, remove temporary profile workflow instrumentation unless still useful.
6. Record exact byte delta vs 1,205,227 B baseline.
7. Keep PR draft; do not merge without owner authorization.
```
