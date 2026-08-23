# PR1366 Work Report

## Mission
Make the Engineering viewport mode strip consume canonical LAFEA mesh/execution applicability instead of presenting non-applicable capabilities as merely not-yet-produced results.

## Current state
- PR: #1366
- Branch: `agent/lafea-viewport-applicability-20260823`
- Base at PR opening: `main@8d3c5d0d906cfb19d84dc5313f9799ba7d7f20fd`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Root defect
After #1359, the top-level navigator correctly distinguishes applicability from readiness, but the Engineering viewport mode strip remained source-agnostic:
- no-mesh stages displayed `Mesh — Not generated`;
- unsupported stages displayed `Result contour — Waiting for qualified result`.

Those labels imply future mesh/result generation is possible when the canonical stage adapter says otherwise.

## Canonical inputs
This PR does not query or modify the stage adapter directly. It consumes the already-projected guided-workflow facts established by #1359:
- `workflow.meshApplicable`
- `workflow.executionSupported`

Those originate from:
- `adapter.discretization.applicable`
- `adapter.execution.qualifiedRouteRegistered`

## Delivered

### Pure viewport presentation projection
`src/workspace/lafea-workbench-content.js`

Added exported UI-only helper:
`buildLafeaViewportModePresentation(viewportState, retainedMeshEvidence, stage, workflow)`.

It produces three presentation rows:
1. Geometry
2. Mesh
3. Result contour

Rules:

### Geometry
- source document present -> `Available`
- source document absent -> `Not available`
- source-authoring viewport mode remains the visual active state

### Mesh
- `meshApplicable === false` -> `Not applicable`
- otherwise retained mesh exists -> `<N> elements`
- otherwise -> `Not generated`

### Result contour
- `executionSupported === false` -> `Not applicable`
- otherwise qualified-result viewport mode -> `Ready · <renderer>`
- otherwise -> `Waiting for qualified result`

The helper fails closed if the required applicability facts are missing:
`LAFEA_VIEWPORT_APPLICABILITY_REQUIRED`.

### DOM evidence
The viewport mode panel now exposes:
- `data-mesh-applicable`
- `data-execution-supported`

Each mode row exposes:
- `data-viewport-mode="geometry|mesh|result"`
- existing active/inactive presentation remains.

## Important distinction preserved
A supported analytical stage may legitimately have:
- Mesh = `Not applicable`
- Result contour = `Waiting for qualified result`

Therefore this PR does not infer execution applicability from mesh applicability.

Likewise, a supported FEA stage before mesh generation remains:
- Mesh = `Not generated`
- Result contour = `Waiting for qualified result`

This prevents `Not applicable` from becoming a generic empty-state label.

## Browser contract
`e2e/lafea6-mesh-not-applicable.spec.js`

Extended to assert for LAFEA.6 both before and after source load:
- viewport panel `data-mesh-applicable=false`;
- viewport panel `data-execution-supported=false`;
- Mesh row = `Not applicable`;
- Result contour row = `Not applicable`;
- after source load Geometry row = `Available`;
- previously encoded navigator, mesh, next-action, overview and Solve-readiness truth remains.

## Focused regression
`scripts/lafea-viewport-applicability-check.mjs`

Encodes four cases:
1. unsupported / no mesh;
2. supported analytical / no mesh;
3. supported FEA before mesh;
4. supported FEA with retained mesh and qualified result.

Also encodes the fail-closed missing-applicability guard.

## Existing contract audit
Reviewed the supported browser contracts including:
- `e2e/lafea3-sample-mesh.spec.js`
- `e2e/lafea-shell-sample-mesh.spec.js`

They rely on the retained mesh element count for supported FEA stages. That behavior is preserved. No existing supported-stage test was found that requires the old unsupported/non-applicable wording.

## Authority boundary
No changes to:
- stage analysis adapter;
- stage registry / engine registration;
- guided workflow applicability calculation;
- orchestration projection;
- source normalization / source authority;
- lifecycle/currentness;
- viewport geometry generation;
- render packets / scene primitives;
- retained mesh overlay;
- mesh generation/refinement/quality;
- solver/compiler/execution;
- result/recovery authority;
- contour calculation/render authority;
- release/trust authority.

This PR changes only the mode-strip labels/DOM presentation produced from already-canonical state.

## Main drift handled
The branch originally began from #1359 merge `f37605dea0c94a404593d161374ff0aa8005fe0c`.

Before PR opening, main advanced to `8d3c5d0d906cfb19d84dc5313f9799ba7d7f20fd` through PR #1364 (`EMP1-27: retain non-round attachment source boundary`). That change is EMP.1 source/evidence governance only and has no overlap with the three viewport/UI regression paths.

The branch was rebuilt from exact current main with the reviewed viewport blobs overlaid. No conflict-resolution rewrite was required.

## Validation truth
- Source/diff audit: COMPLETE
- Existing contract audit: COMPLETE
- Focused Node regression: ENCODED / NOT_RUN
- Playwright regression: UPDATED / NOT_RUN
- Browser/manual verification: NOT_RUN
- GitHub Actions: NOT_USED_AS_EVIDENCE

Do not claim PASS for unexecuted checks.

## Changed-file ledger
1. `src/workspace/lafea-workbench-content.js` — applicability-aware viewport mode projection.
2. `e2e/lafea6-mesh-not-applicable.spec.js` — browser contract extension.
3. `scripts/lafea-viewport-applicability-check.mjs` — focused projection regression.
4. `agents/PR1366_workreport.md` — living handover.

## Appendix A — expert takeover questions
1. Which canonical facts determine Mesh and Result applicability?
2. Does this PR read the stage adapter directly?
3. Why is Mesh `Not generated` different from Mesh `Not applicable`?
4. Why is Result `Waiting for qualified result` different from Result `Not applicable`?
5. Can a supported analytical stage have Mesh NA and Results available? Why?
6. What does a supported FEA stage show before mesh generation?
7. What does it show after a two-element retained mesh is present?
8. What does the result row show in QUALIFIED_RESULT mode?
9. Which renderer name is shown with a qualified result?
10. What happens if workflow applicability facts are missing?
11. Does the helper change viewport mode state?
12. Does it modify scene primitives or render packets?
13. Does it modify retained mesh evidence or overlays?
14. Does it change solver/result/recovery authority?
15. Does it modify source or lifecycle authority?
16. Which LAFEA.6 browser test was extended?
17. Which supported-stage tests were audited for compatibility?
18. Were the focused or Playwright regressions executed? Expected answer: no, NOT_RUN.
19. What concurrent main drift was incorporated before PR opening?
20. What evidence would justify changing mesh/execution applicability itself? A separate canonical engineering adapter/registry change, not viewport presentation.
