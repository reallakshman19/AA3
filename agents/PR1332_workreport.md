# PR1332 Work Report

## Mission
Unify the shared LAFEA.3–6 finite-element workbench UI around engineer actions and engineering decision evidence while preserving all source, mesh, solver, qualification and release authority contracts.

## PR state
- PR: #1332
- Branch: `agent/lafea3-6-unified-ui-cleanup-20260823`
- Base: `main`
- Draft: true
- Merge: not authorized / not performed

## Presentation rule

```text
VISIBLE BY DEFAULT
- configurable source/analysis inputs
- primary actions
- engineering PASS/WARNING/BLOCK evidence
- concise current state

DISCLOSED ON DEMAND
- non-gating diagnostics
- source/model/mesh hashes and identities
- producer/revision/registration custody
- supporting qualification metadata
```

Non-configurable is not itself a reason to hide a datum. Decision/gating evidence remains visible even when locked.

## Implemented changes

### Shared accessible disclosure
`src/workspace/lafea-info-disclosure.js`
- native `<details>/<summary>` behavior;
- click/keyboard/touch accessible;
- title and `aria-label`;
- reusable label/value evidence rows.

### Analysis settings
`src/workspace/lafea-analysis-settings-view.js`
- Continuum formulation select remains visible and primary for LAFEA.3;
- seven formulation facts move into one `Continuum formulation basis (i)` disclosure;
- model identity/version/units/code basis/cases/thickness/load-combination/stress/allowable metadata move into one source metadata disclosure;
- primary solver surface retains Availability and Source binding;
- solver technical identifiers and recovery policy remain available in collapsed evidence.

The view-model rows are retained so existing non-DOM consumers are not silently broken by the presentation change.

### Mesh / discretization
`src/workspace/lafea-discretization-panel.js`
- mesh family, target size, node/element counts, warning/block counts remain visible;
- PASS/WARNING/BLOCK quality remains visible;
- high-order mapping inspection becomes collapsed diagnostic evidence because it does not independently gate mesh qualification;
- long tied-element focus lists are capped at six inline actions, with remaining IDs under `+N more`;
- empty Warning/Blocking element sections are omitted;
- retained custody first level is reduced to Profile / Producer / Authority;
- technical mesh/source/profile/geometry/artifact hashes and registration move under one disclosure;
- node/element counts are not duplicated in custody.

### Engineering display precision
`src/workspace/lafea-discretization-dom.js`
- presentation-only numerical formatting removes binary floating-point noise;
- retained values and gate classification remain unchanged;
- exact retained value remains in element title/evidence data;
- retained profile identity moves to supporting evidence disclosure.

### Readiness diagnostics
`src/workspace/lafea-workbench-reason-labels.js`
Adds explicit engineer-facing recovery text for:
- `LAFEA_CONTINUUM_SOLVER_SOURCE_PARENT_STALE`;
- `LAFEA_CONTINUUM_SOLVER_DOMAIN_PARENT_STALE`;
- `LAFEA_CONTINUUM_SOLVER_GEOMETRY_PARENT_STALE`;
- `LAFEA_CONTINUUM_SOLVER_MESH_NOT_CURRENT_PASS`;
- `LAFEA_CONTINUUM_SOLVER_SOURCE_BINDING_NOT_CURRENT`.

Canonical reason codes are not renamed or reclassified.

## Authority / invariants
This PR must not change:
- source authority derivation;
- lifecycle invalidation/currentness;
- mesh generation mathematics;
- mesh-quality thresholds;
- quality PASS/WARNING/BLOCK classification;
- formulation mathematics;
- solver assembly/equations;
- result/recovery evidence;
- release/trust activation.

No mock/default engineering hash is introduced.

## Verification
`scripts/lafea-unified-ui-cleanup-check.mjs` is added to encode:
- analysis metadata disclosure;
- formulation fact disclosure;
- diagnostic-only high-order mapping collapse;
- six-item inline focus cap;
- custody hash collapse;
- presentation-only quality formatting;
- accessible native disclosure;
- actionable stale-source reason mapping;
- absence of the known hardcoded simulated SHA fallback.

Validation truth:
- source/static review: COMPLETE;
- new regression: ENCODED;
- new regression execution: NOT_RUN;
- existing UI/unit regressions: NOT_RUN;
- browser/manual verification: NOT_RUN;
- GitHub Actions/workflows: NOT_INSPECTED / NOT_RUN.

Do not convert ENCODED to PASS without actual execution.

## Changed-file ledger
1. `src/workspace/lafea-info-disclosure.js` — shared disclosure primitive.
2. `src/workspace/lafea-analysis-settings-view.js` — decision-first settings layout.
3. `src/workspace/lafea-discretization-panel.js` — quality/diagnostic/custody hierarchy.
4. `src/workspace/lafea-discretization-dom.js` — engineering display formatting and evidence disclosure.
5. `src/workspace/lafea-workbench-reason-labels.js` — actionable continuum stale-parent labels.
6. `scripts/lafea-unified-ui-cleanup-check.mjs` — static presentation regression.
7. `agents/PR1332_workreport.md` — living handover.

## Known remaining verification risk
The UI has not been rendered in a browser in this environment. Native `<details>` is deliberately used to minimize custom interaction risk, but layout/CSS density and existing DOM-regression assumptions still require execution before release.

The current Solve-readiness card retains its existing three canonical workflow state rows for contract compatibility in this PR; stale-parent text is now actionable rather than enum-derived. A future simplification to one overall Solve state should only proceed if existing workflow-state DOM consumers are first reconciled.

## Appendix A — expert takeover questions
1. Do any UI changes modify retained engineering data rather than presentation only?
2. Are PASS/WARNING/BLOCK quality rows still visible without opening a disclosure?
3. Are exact gate values retained even though displayed numbers are rounded?
4. Are threshold comparisons still performed upstream by the qualification package rather than the UI?
5. Is high-order mapping still explicitly non-gating?
6. Are no more than six tied mapping element actions visible inline?
7. Can keyboard/touch users open every new information disclosure?
8. Does the analysis-settings view model preserve prior row data for non-DOM consumers?
9. Are Model identity/version/code/unit/case metadata available but no longer dominant?
10. Are source/mesh/profile/artifact hashes still retrievable for audit?
11. Are node/element counts shown once in the primary mesh summary rather than duplicated in custody?
12. Does `SOURCE_PARENT_STALE` now tell the engineer to re-prepare from current source?
13. Were any source/lifecycle/solver/mesh-authority modules modified? They should not be.
14. Does any presentation rounding feed back into engineering calculations? It must not.
15. Have existing DOM/UI regressions actually executed on this exact head?
16. Has a browser check covered LAFEA.3, .4, .5 and .6 shared surfaces?
17. Does mobile/touch disclosure behavior remain usable?
18. Are empty legitimate states shown neutrally rather than as mock/error data?
19. Is there any new hardcoded simulated engineering identity?
20. Is PR #1329 canonical-source lineage repair kept separate from this UI refactor?
