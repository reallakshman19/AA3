# PR1353 Work Report

## Mission
Complete the LAFEA.6 non-applicable workflow cleanup by aligning all primary execution surfaces with the canonical stage adapter.

## Current state
- PR: #1353
- Branch: `agent/lafea6-unsupported-execution-ui-20260823`
- Base: `main`
- Refreshed base: `d871a987a91ae843b873b7762f324bba758ed5ac`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Canonical engineering boundary
`src/workspace/lafea-stage-analysis-adapter.js` remains unchanged and reports for LAFEA.6:
- `routeFamily = UNSUPPORTED`;
- `execution.qualifiedRouteRegistered = false`;
- `discretization.applicable = false`;
- `discretization.generationAuthorized = false`.

This PR does not infer or widen those facts. It only makes the UI consume them consistently.

## Root defect
PR #1345 correctly reduced the LAFEA.6 Mesh surface to `Not applicable`, but three primary surfaces still presented unsupported work as if it were a resolvable gate:
1. after source load, the next-action banner fell through to `Step 2: Review meshing prerequisites` and `Open mesh controls`;
2. Engineering overview retained a disabled `Run analysis` control with a generic authorization message;
3. Solve readiness rendered the canonical unsupported RUN step as `Blocked`, implying more source/mesh/preflight work could eventually enable execution.

Because the registered route family is `UNSUPPORTED`, those are misleading workflow affordances.

## Delivered

### 1. Unsupported next-action state
`src/workspace/lafea-workbench-content.js`

A presentation applies only when both are true:
- `workflow.analysisRouteFamily === 'UNSUPPORTED'`;
- `discretization.uiPhase === 'NOT_APPLICABLE'`.

After a source document is loaded, the primary banner now states:
- `No qualified analysis route is registered for this stage`;
- source/model review remains available;
- mesh generation and solve execution are not applicable;
- action: `Review model inputs`.

It no longer offers `Open mesh controls` or `Run analysis` for this state.

This predicate is deliberately generic and does not hard-code the string `LAFEA.6`.

### 2. Engineering overview Run removal
The existing Engineering overview model and engine-state evidence are retained.

For the unsupported/non-mesh presentation only, the rendered Run button is replaced by static status:
- `Solve not available`.

The overview receives `data-execution-supported=false`.

No execution handler, authorization state, engine registry, or orchestration object is mutated.

### 3. Solve readiness becomes Not applicable
`src/workspace/lafea-solve-readiness-panel.js`

When `workflow.analysisRouteFamily === 'UNSUPPORTED'`:
- primary Solve status = `NOT_APPLICABLE`;
- UI label = `Solve: Not applicable`;
- `executionSupported=false`;
- primary message explains that no qualified analysis route is registered;
- canonical step statuses, reason codes, and diagnostics remain in `Why? (i)` evidence.

The raw reason `UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED` remains retained; it is not deleted or reclassified in the canonical workflow.

## Regression changes

### Focused contract
`scripts/lafea6-unsupported-execution-presentation-check.mjs`

Encodes:
- canonical LAFEA.6 route family remains `UNSUPPORTED`;
- qualified route remains false;
- mesh applicability remains false;
- generation authorization remains false;
- Solve presentation becomes `NOT_APPLICABLE`;
- no engineering authority changes.

### Browser contract
`e2e/lafea6-mesh-not-applicable.spec.js`

Extended to cover source-loaded LAFEA.6:
- Mesh remains not applicable;
- next-action intent is `unsupported`;
- no `Open mesh controls` or `Run analysis` primary action;
- `Review model inputs` is available;
- overview Run control is absent and `Solve not available` is present;
- Solve readiness reports `NOT_APPLICABLE` and `execution-supported=false`;
- detailed evidence remains collapsed by default.

## Authority boundary
No changes to:
- stage analysis adapter;
- stage registry / engine registration;
- orchestration projection;
- source normalization or source authority;
- lifecycle/currentness;
- mesh applicability or mesh producer authority;
- solver/compiler/execution;
- recovery/results;
- release/trust authority.

## Main drift handled
While the branch was being prepared, `main` advanced from `135d4edf...` to `d871a987...` through PR #1352 (EMP1-22 pressure-thrust source/accounting evidence).

That commit has no overlap with the four LAFEA.6 presentation/regression paths. The branch was rebuilt from exact current `main` and the exact reviewed blobs were overlaid. No conflict-resolution rewrite was required.

## Validation truth
- Source/diff audit: COMPLETE
- Focused static regression: ENCODED / NOT_RUN
- Playwright regression: UPDATED / NOT_RUN
- Browser/manual verification: NOT_RUN
- GitHub Actions: NOT_USED_AS_EVIDENCE

Do not claim PASS for unexecuted checks.

## Changed-file ledger
1. `src/workspace/lafea-workbench-content.js` — unsupported next action + overview Run compaction.
2. `src/workspace/lafea-solve-readiness-panel.js` — unsupported execution -> presentation `NOT_APPLICABLE`.
3. `e2e/lafea6-mesh-not-applicable.spec.js` — extended browser contract.
4. `scripts/lafea6-unsupported-execution-presentation-check.mjs` — focused adapter/presentation guard.
5. `agents/PR1353_workreport.md` — living handover.

## Appendix A — expert takeover questions
1. What does the canonical LAFEA.6 stage adapter report for `routeFamily`?
2. Is `execution.qualifiedRouteRegistered` true or false?
3. Is analysis mesh applicable for LAFEA.6?
4. Does this PR modify the adapter or infer a stage list in UI code?
5. What two canonical presentation facts activate the unsupported-stage UI?
6. Why is `Blocked` misleading for an engine route that is not registered at all?
7. What is the new primary Solve presentation state?
8. Is `UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED` removed from canonical evidence?
9. Does the next-action banner still expose `Open mesh controls` after a LAFEA.6 source is loaded?
10. Does the overview retain an actionable Run control?
11. What action remains available to the engineer? `Review model inputs`.
12. Are LAFEA.3/.4/.5 execution routes changed?
13. Are mesh applicability or generation-authority calculations changed?
14. Are source/lifecycle/solver/release files changed?
15. Were any encoded checks executed? Expected answer: no; NOT_RUN.
16. What concurrent main change was incorporated? PR #1352 / EMP1-22 pressure-thrust evidence only.
17. Was there any file overlap with that concurrent change? Expected answer: no.
18. Why is the unsupported presentation generic rather than hard-coded to LAFEA.6?
19. What would have to change before this stage should ever show an actionable Run control? A qualified execution route must be registered canonically, not a UI change.
20. What is the next safe audit direction after this PR? Continue cross-stage presentation audit for unavailable/non-applicable source/profile/result surfaces without widening engineering authority.
