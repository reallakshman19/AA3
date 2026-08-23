# PR1334 Work Report

## Mission
Continue the shared LAFEA.3–6 UI cleanup after merged PRs #1329 and #1332 by removing the remaining high-noise primary surfaces while preserving engineering authority and existing refinement/solve contracts.

## Current PR state
- PR: #1334
- Branch: `agent/lafea3-6-refinement-solve-ui-20260823`
- Base: `main`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Delivered batch

### 1. Decision-first Solve readiness
New module:
`src/workspace/lafea-solve-readiness-panel.js`

Primary UI is reduced to:

```text
Solve: <canonical friendly status>
<one primary actionable reason>
Why? (i)
```

The canonical workflow evidence is retained rather than deleted:
- `MODEL_DIAGNOSTICS`
- `AUTHORIZATION`
- `RUN`

All canonical reason codes are retained under the evidence disclosure. Current diagnostics are also retained under `data-role=lafea-diagnostics` inside the disclosure.

No workflow state, authorization calculation, diagnostic generation, solver state or release state is recomputed in this module.

### 2. On-demand retained-mesh refinement
New module:
`src/workspace/lafea-refinement-disclosure.js`

The existing `lafea-discretization-generation-panel.js` refinement implementation is deliberately unchanged. The workbench post-processes its existing fieldset into a native closed `<details>` disclosure.

State-aware summaries:
- mesh absent -> `Refine retained mesh — mesh required`
- currently authorized -> `Refine retained mesh`
- product scope recognized but promotion pending -> `Refine retained mesh — qualification pending`
- otherwise -> `Refine retained mesh — unavailable`

Nested TECH-13 product qualification evidence is closed by default in the actual workbench.

Preserved existing engineering rules include:
- explicit target IDs;
- target length > 0;
- local target < global target;
- local target >= 25% of global target;
- explicit length unit, never silently inferred;
- product qualification gates;
- parent-normal / boundary / exact-custody acceptance;
- existing `onRefineMesh` request payload.

### 3. Workbench integration
`src/workspace/lafea-workbench-content.js`
- uses `renderLafeaSolveReadiness()` instead of the old three-row `workflowSummary()` plus separate raw diagnostic list;
- uses `compactLafeaRefinementWorkspace()` after the canonical Discretization renderer;
- removes obsolete local `workflowSummary`, `diagnosticList`, and severity helper functions.

### 4. Contract reconciliation after #1332
Two static UI checks still encoded the pre-#1332 renderer source shape.

Updated:
- `scripts/lafea-ui-formal-presentation-check.mjs`
- `scripts/lafea-ui-guided-discretization-check.mjs`

The formal check now asserts public UI hierarchy and roles rather than obsolete exact helper call text.

The guided check retains its engineering assertions for mesh custody states, producer capabilities, generation intent, refinement command and authorization flow. The obsolete arbitrary `<300 lines` implementation-size assertion is replaced by explicit module-boundary checks for Solve/refinement presentation separation.

### 5. Failure-path browser contract
Updated:
`e2e/lafea-standalone-failures.spec.js`

For the A17 preflight veto the intended user contract is now:
1. Solve panel is visible;
2. human-readable veto is visible;
3. `Why? (i)` is initially closed;
4. opening evidence exposes the canonical diagnostic code;
5. retained mesh/artifact hashes remain unchanged;
6. no preflight evidence, execution, qualified result or release is created.

### 6. Focused regression
Added:
`scripts/lafea-refinement-solve-ui-check.mjs`

Encoded assertions cover:
- one primary Solve status;
- canonical three-step Solve evidence retained;
- duplicate reason collapse;
- actionable source-parent-stale presentation;
- all refinement summary states;
- refinement disclosure default behavior;
- nested product evidence closes;
- existing target-size and explicit-unit validation text remains in the unchanged engineering control module.

## Authority boundary
No changes in this PR to:
- source authority derivation;
- lifecycle currentness/invalidation;
- mesh generation algorithms;
- retained-mesh refinement algorithm or validation implementation;
- mesh quality thresholds or classification;
- continuum/shell solver equations;
- result recovery;
- numerical qualification;
- release/trust authority.

## Validation truth
- Source/diff audit: COMPLETE
- New focused regression: ENCODED, NOT_RUN
- Updated formal UI check: NOT_RUN
- Updated guided-discretization check: NOT_RUN
- Updated Playwright failure test: NOT_RUN
- Browser manual verification: NOT_RUN
- GitHub Actions/workflows: NOT_INSPECTED / NOT_RUN

The available container cannot resolve `github.com`, so no executable repository checkout is available. Do not report any encoded test as PASS until it actually runs.

## Changed-file ledger
1. `src/workspace/lafea-solve-readiness-panel.js` — decision-first Solve presentation.
2. `src/workspace/lafea-refinement-disclosure.js` — on-demand refinement presentation wrapper.
3. `src/workspace/lafea-workbench-content.js` — integration and removal of duplicated Solve renderers.
4. `scripts/lafea-refinement-solve-ui-check.mjs` — focused regression.
5. `scripts/lafea-ui-formal-presentation-check.mjs` — current hierarchy contract.
6. `scripts/lafea-ui-guided-discretization-check.mjs` — engineering checks retained, stale LOC gate removed.
7. `e2e/lafea-standalone-failures.spec.js` — disclosure-aware failure UI check.
8. `agents/PR1334_workreport.md` — living handover.

## Remaining verification risk
The primary unresolved risk is execution/browser behavior, not a known authority gap. Native `<details>` is used specifically to reduce interaction-state complexity, but exact rendering, focus behavior and Playwright selectors still need executable verification.

## Appendix A — expert takeover questions
1. Does `buildLafeaSolveReadinessViewModel()` consume canonical workflow state without reclassifying it?
2. Is the visible Solve status derived from the canonical RUN status?
3. Is only one primary Solve reason visible by default?
4. Are MODEL_DIAGNOSTICS, AUTHORIZATION and RUN still retained under evidence?
5. Are canonical diagnostic codes preserved exactly?
6. Does source-parent stale retain the actionable re-prepare wording introduced by #1332?
7. Does the preflight-veto path remain non-mutating?
8. Does any UI module create preflight/authorization/execution evidence? It must not.
9. Is `lafea-discretization-generation-panel.js` unchanged in this PR?
10. Are the existing refinement validation inequalities unchanged?
11. Is explicit length-unit custody still mandatory?
12. Does the refinement wrapper only manipulate presentation DOM?
13. Is the refinement disclosure closed by default?
14. Is TECH-13 qualification evidence closed by default in the actual workbench?
15. Can an engineer still open the disclosure and access the exact existing controls?
16. Does product-scope pending state remain disabled rather than silently enabled?
17. Did removal of the old LOC test remove any engineering assertion? It should not.
18. Do updated static tests assert public roles/boundaries rather than implementation trivia?
19. Does Playwright open `Why? (i)` before expecting raw diagnostics?
20. Have any of the encoded checks actually executed on this exact head?
21. Is current `main` still the PR merge base / is `behind_by=0`?
22. Did any concurrent main change overlap these eight effective paths?
23. Has any source/lifecycle/mesher/solver/quality authority file entered the effective diff?
24. Is the PR still draft and unmerged pending fresh merge authorization?
