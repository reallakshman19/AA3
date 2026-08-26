# PR1359 Work Report

## Mission
Make the top-level LAFEA Analysis navigator consume canonical stage applicability instead of presenting non-applicable work as ordinary blocked/complete workflow.

## Current state
- PR: #1359
- Branch: `agent/lafea-applicability-presentation-20260823`
- Base: `main@727fd7c02ec8bdad594205f69dbef16e21ec8332`
- Draft: true
- Merge: OWNER_AUTHORIZED_IN_CHAT_2026-08-23 / PENDING
- Validation execution: NOT_RUN

## Root defect
After PR #1353, LAFEA.6 primary Mesh/Solve actions are truthful, but the sticky top-level Analysis navigator still aggregates canonical orchestration states without stage applicability.

That can render:
- Mesh as an ordinary workflow state even when analysis mesh is not applicable;
- Solve as Blocked when execution is canonically unsupported;
- Results as Blocked/not-started when no qualified execution route exists.

This implies work can be completed to unlock those areas, which is false for an unsupported stage.

## Canonical source of truth
`src/workspace/lafea-stage-analysis-adapter.js` remains unchanged.

The guided workflow already obtains this adapter. This PR only exposes two existing adapter facts in the UI projection:
- `meshApplicable = adapter.discretization.applicable`
- `executionSupported = adapter.execution.qualifiedRouteRegistered`

No applicability or route decision is recomputed in presentation code.

## Delivered

### Guided workflow projection
`src/workspace/lafea-guided-workflow.js`

Added presentation facts:
- `meshApplicable`
- `executionSupported`

Existing canonical `steps`, reasons, orchestration schema, authorization gate, execution boundary and release state are unchanged.

### Workflow-area presentation
`src/workspace/lafea-guided-workflow-presentation.js`

Top-level area mapping:
- MESH -> `NOT_APPLICABLE` when `workflow.meshApplicable === false`
- SOLVE -> `NOT_APPLICABLE` when `workflow.executionSupported === false`
- RESULTS -> `NOT_APPLICABLE` when `workflow.executionSupported === false`
- MODEL remains canonical aggregation

For a non-applicable area, top-level reasons are suppressed because they describe underlying canonical implementation/gating evidence rather than an operator action.

For unsupported SOLVE, the navigator also suppresses the expanded three-check list by exposing only one presentation step in the area. The original canonical workflow still retains Numerical preflight / Authorization / Run with their original statuses and reasons, and Solve readiness retains those codes in evidence.

Supported workflows continue to aggregate canonical statuses normally.

### Browser contract
`e2e/lafea6-mesh-not-applicable.spec.js`

Now asserts for LAFEA.6:
- navigator MESH = NOT_APPLICABLE / Not applicable;
- navigator SOLVE = NOT_APPLICABLE / Not applicable;
- navigator RESULTS = NOT_APPLICABLE / Not applicable;
- unsupported SOLVE area does not expand obsolete governed-check navigation;
- all previously encoded mesh/next-action/overview/Solve truth remains.

### Focused regression
`scripts/lafea-workflow-area-applicability-check.mjs`

Encodes both sides:
1. unsupported/no-mesh workflow -> MESH/SOLVE/RESULTS NOT_APPLICABLE;
2. supported FEA workflow -> existing canonical aggregation preserved.

## Authority boundary
No changes to:
- stage adapter;
- stage registry / engine registration;
- orchestration projection;
- source normalization / source authority;
- lifecycle/currentness;
- mesh applicability calculation;
- mesher/refinement/quality;
- solver/compiler/execution;
- recovery/results;
- release/trust authority.

## Main drift handled
While awaiting merge authorization, `main` advanced twice:
1. `fe448749... -> c81f1ba5...` through PR #1360 (`EMP1-25: retain exact-tabulated-only gamma authority`);
2. `c81f1ba5... -> 727fd7c0...` through PR #1362 (`EMP1-26: freeze host-shell versus attachment stress boundary`).

Both commits are EMP.1 source/evidence-governance changes and have no overlap with this PR's five guided-workflow/UI/test/handover paths. The branch was rebuilt from exact current main and the reviewed #1359 functional blobs were overlaid without conflict-resolution rewriting.

## Validation truth
- Source/diff audit: COMPLETE
- Focused static regression: ENCODED / NOT_RUN
- Playwright regression: UPDATED / NOT_RUN
- Browser/manual verification: NOT_RUN
- GitHub Actions: NOT_USED_AS_EVIDENCE

Do not claim PASS for unexecuted checks.

## Changed-file ledger
1. `src/workspace/lafea-guided-workflow.js`
2. `src/workspace/lafea-guided-workflow-presentation.js`
3. `e2e/lafea6-mesh-not-applicable.spec.js`
4. `scripts/lafea-workflow-area-applicability-check.mjs`
5. `agents/PR1359_workreport.md`

## Deferred next item
The Engineering viewport mode strip is still source-agnostic:
- a non-mesh stage can display `Mesh — Not generated` instead of `Not applicable`;
- an unsupported stage can display `Result contour — Waiting for qualified result` instead of `Not applicable`.

That should be a separate presentation PR using the same `meshApplicable` / `executionSupported` facts, without modifying viewport rendering authority.

## Appendix A — expert takeover questions
1. Which canonical module owns stage mesh/execution applicability?
2. Does this PR change that module?
3. What exact adapter fact becomes `workflow.meshApplicable`?
4. What exact adapter fact becomes `workflow.executionSupported`?
5. When does top-level MESH become NOT_APPLICABLE?
6. When do SOLVE and RESULTS become NOT_APPLICABLE?
7. Are canonical RUN/PREFLIGHT/AUTHORIZATION statuses rewritten?
8. Where do raw unsupported reason codes remain available?
9. Why are non-applicable area reasons suppressed at the top level?
10. Does MODEL receive any special applicability override?
11. What happens for a supported FEA workflow?
12. Does the PR change run eligibility calculations?
13. Does it change mesh generation/refinement authority?
14. Does it change result/recovery authority?
15. Were regressions executed? Expected answer: no, NOT_RUN.
16. What browser scenario was extended?
17. Why is the implementation not hard-coded to LAFEA.6?
18. What viewport inconsistency remains for the next PR?
19. What must remain unchanged when that viewport item is fixed?
20. What evidence would justify changing canonical stage applicability? Answer: a separate engineering authority/registry change, not UI presentation.
