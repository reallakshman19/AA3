# PR1340 Work Report

## Mission
Remove fabricated/default engineering values from the shared LAFEA.3–6 Analysis Settings UI while preserving all canonical source, formulation, mesh, solver, lifecycle, and release authority.

## Current state
- PR: #1340
- Branch: `agent/lafea3-6-source-default-cleanup-20260823`
- Base: `main`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Root defect
The Analysis Settings view had a presentation-only fallback:

```js
const current = typeof documentValue?.formulation === 'string'
  ? documentValue.formulation
  : FORMULATIONS.PLANE_STRESS;
```

This contradicted the canonical local-continuum source contract. `src/core/local-continuum/source-normalization.js` requires `formulation` through `enumValue(input.formulation, FORMULATIONS, 'formulation')`; it does not supply a default.

Therefore an empty/partial UI state could display Plane stress even though no source had declared it.

The same view also manufactured metadata-like placeholders including:
- `Provided by workbench registry`;
- `Not initialized`;
- `UNINITIALIZED`;
- `Not declared by the active stage source contract`.

These strings made absent evidence look like retained engineering metadata.

## Delivered

### 1. Source-aware Analysis Settings model
`src/workspace/lafea-analysis-settings-view.js`

The view model now exposes `sourcePresent` and only retains rows with actual values.

Absent optional source values are omitted rather than converted to `Not declared` rows.

Solver metadata is retained only when registry/lifecycle evidence exists.

### 2. Formulation control no longer invents Plane stress
States:
- no source -> `SOURCE_REQUIRED`, `current=null`, non-editable;
- source present but formulation absent -> `SOURCE_FORMULATION_REQUIRED`, `current=null`, editable source control;
- valid declared source -> existing formulation/guard behavior;
- unknown declared source -> `SOURCE_FORMULATION_UNRECOGNIZED`, no coercion.

The select renders an explicit placeholder instead of preselecting an engineering formulation.

### 3. Engineering guards preserved
No change to:
- Plane-strain Poisson warning/block limits;
- B-bar temperature/eigenstrain blocking;
- retained T3 -> T6/Q8 regeneration requirement;
- T6/Q8 qualification state;
- source-edit request semantics.

### 4. Empty-state presentation
If model metadata is absent:
`Load a governed source model to view source-declared analysis settings.`

If solver/source-binding evidence is absent:
`Solver readiness is not established until governed solver and source-binding evidence exist.`

These are workflow states, not fake metadata rows.

### 5. Shared formal status vocabulary
`src/workspace/lafea-ui-status.js`

Added presentation-only labels:
- SOURCE_REQUIRED -> Source required / neutral
- SOURCE_FORMULATION_REQUIRED -> Source formulation required / warning
- SOURCE_FORMULATION_UNRECOGNIZED -> Unrecognized source formulation / critical

No engineering state transition is created by this mapping.

## Regression changes

### `scripts/lafea-ui-analysis-settings-check.mjs`
Encoded:
- declared source values remain exact;
- missing code basis is omitted;
- empty LAFEA.3 stage has zero source/solver metadata rows;
- empty source does not imply Plane stress;
- incomplete source explicitly requires formulation;
- old fabricated placeholder strings are absent from empty metadata projections.

### `scripts/lafea-unified-ui-cleanup-check.mjs`
Adds anti-regression source checks for:
- no Plane-stress fallback expression;
- SOURCE_REQUIRED states present;
- no `Provided by workbench registry`;
- no `Not initialized` fallback in Analysis Settings;
- no `Not declared by the active stage source contract`.

### `scripts/lafea-ui-formal-presentation-check.mjs`
Adds formal labels/tones for the three source-required statuses and asserts old placeholder strings are absent.

## Authority boundary
No changes to:
- `src/core/local-continuum/source-normalization.js`;
- canonical continuum model creation;
- source authority hashing;
- lifecycle invalidation/currentness;
- mesh generation/refinement/quality;
- solver stiffness/load/recovery calculations;
- qualification tolerances;
- release/trust authority.

## Validation truth
- Source-contract audit: COMPLETE
- Diff audit: COMPLETE
- Updated Node checks: ENCODED / NOT_RUN
- Browser/manual verification: NOT_RUN
- No workflow files changed

Do not report any encoded check as PASS until actually executed.

## Changed-file ledger
1. `src/workspace/lafea-analysis-settings-view.js` — source-aware absent/default semantics.
2. `src/workspace/lafea-ui-status.js` — formal presentation labels for source-required states.
3. `scripts/lafea-ui-analysis-settings-check.mjs` — empty/partial-source regression contract.
4. `scripts/lafea-unified-ui-cleanup-check.mjs` — anti-default static guard.
5. `scripts/lafea-ui-formal-presentation-check.mjs` — formal status and placeholder contract.
6. `agents/PR1340_workreport.md` — living handover.

## Remaining verification risk
The main remaining risk is runtime/browser presentation:
- native select placeholder behavior;
- initial empty-stage rendering;
- partial-source edit path;
- existing full-source formulation selection.

No source-identified numerical or authority defect remains in this PR scope.

## Appendix A — expert takeover questions
1. Does canonical source normalization require `formulation` explicitly without a default?
2. Does the Analysis Settings view still contain any `missing -> PLANE_STRESS` fallback?
3. Does an empty LAFEA.3 stage project `current=null`?
4. Is empty-stage formulation status `SOURCE_REQUIRED`?
5. Is source-present/formulation-missing status `SOURCE_FORMULATION_REQUIRED`?
6. Can a partial editable source select a formulation without a preselected engineering value?
7. Does an unknown source formulation fail visibly rather than coerce to Plane stress?
8. Are real declared Plane stress documents still shown exactly as Plane stress?
9. Are the standard Plane-strain Poisson guards unchanged?
10. Is B-bar temperature/eigenstrain blocking unchanged?
11. Is retained T3 still a B-bar mesh-regeneration condition?
12. Are T6/Q8 B-bar qualification semantics unchanged?
13. Are absent code/allowable data omitted rather than rendered as source metadata?
14. Are absent requested cases/units/combinations/stress/allowable rows omitted?
15. Are registry rows shown only when registry evidence exists?
16. Are lifecycle rows shown only when lifecycle evidence exists?
17. Is `Provided by workbench registry` gone from Analysis Settings source?
18. Is `Not declared by the active stage source contract` gone from Analysis Settings source?
19. Does empty solver evidence produce a workflow empty-state sentence rather than fake metadata?
20. Do the three new statuses have explicit formal labels and tones?
21. Did any core source-normalization file enter the diff? It must not.
22. Did any solver/mesh/lifecycle authority file enter the diff? It must not.
23. Have the encoded checks actually run on this exact head?
24. Is the PR still draft/unmerged pending fresh owner merge authorization?
