# PR1345 Work Report

## Mission
Continue the unified LAFEA.3–6 UI cleanup by removing dead Mesh workflow controls from stages whose canonical lifecycle says analysis mesh is not applicable.

## Current state
- PR: #1345
- Branch: `agent/lafea6-mesh-not-applicable-ui-20260823`
- Base: `main`
- Base at branch creation: `9ba280b689e77b41e035824fb86347dca965a21c`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Root defect
LAFEA.6 is explicitly unsupported for analysis mesh and execution:
- stage adapter `discretization.applicable=false`;
- allowed mesh families = `[]`;
- mesh generation authorization = false;
- qualified execution route = false.

The shared Discretization renderer still emitted a complete Mesh workspace containing disabled generation, quality, Continue and advanced evidence/custody sections. This presented non-applicable work as if the engineer needed to resolve it.

## Delivered

### Presentation-only non-applicable compaction
`src/workspace/lafea-refinement-disclosure.js`

`compactLafeaRefinementWorkspace` now first calls `compactLafeaNonApplicableMeshWorkspace`.

The new function activates only when the already-built canonical presentation model reports:
- `model.applicable === false`, or
- `model.uiPhase === 'NOT_APPLICABLE'`.

It does not derive or override applicability.

For a non-applicable stage it preserves the Mesh summary heading but changes the primary surface to:
- state: `Not applicable`;
- explanation: `This stage does not use an analysis mesh. No mesh configuration, generation, quality review or mesh custody action is required.`

It removes only rendered presentation nodes for:
- mesh metrics grid;
- generation section;
- quality section;
- Continue/actions section;
- advanced mesh evidence/custody;
- generation disclosure;
- refinement disclosure/fieldset.

The canonical view model, lifecycle and stage adapter remain intact and inspectable by technical tooling.

## Stage boundary
- LAFEA.3: mesh applicable — unchanged.
- LAFEA.4: mesh applicable — unchanged.
- LAFEA.5: mesh applicable — unchanged.
- LAFEA.6: mesh not applicable — compact presentation applies.

The helper is generic for any future stage explicitly classified mesh-not-applicable; it does not special-case the string `LAFEA.6`.

## Regression changes

### `scripts/lafea-non-applicable-mesh-presentation-check.mjs`
Encodes:
- LAFEA.4 mesh applicable;
- LAFEA.5 mesh applicable;
- LAFEA.6 mesh not applicable;
- LAFEA.6 allowed families empty;
- LAFEA.6 generation authorization false;
- LAFEA.6 execution route unregistered;
- non-applicable presentation compaction source contract.

### `e2e/lafea6-mesh-not-applicable.spec.js`
Encodes browser expectations:
- LAFEA.6 Mesh surface exists and reports `data-mesh-applicable=false`;
- state reads `Not applicable`;
- explanatory sentence is visible;
- mesh metrics grid absent;
- generation absent;
- quality absent;
- Continue action absent;
- advanced mesh evidence absent;
- mesh advance button absent.

## Authority boundary
No changes to:
- `lafea-stage-analysis-adapter.js` applicability;
- lifecycle profiles/currentness;
- source normalization or source authority;
- mesh producer registry;
- mesh generation/refinement algorithms;
- mesh profile contracts;
- quality gates;
- solver/preflight/recovery;
- release/trust authority.

This PR consumes existing canonical applicability and changes DOM presentation only.

## Validation truth
- Source/diff audit: COMPLETE
- Static regression: ENCODED / NOT_RUN
- Playwright regression: ENCODED / NOT_RUN
- Browser/manual verification: NOT_RUN
- GitHub Actions: NOT_USED_AS_EVIDENCE

Do not claim PASS for unexecuted checks.

## Changed-file ledger
1. `src/workspace/lafea-refinement-disclosure.js` — non-applicable Mesh presentation compaction.
2. `scripts/lafea-non-applicable-mesh-presentation-check.mjs` — stage/applicability static regression.
3. `e2e/lafea6-mesh-not-applicable.spec.js` — browser regression.
4. `agents/PR1345_workreport.md` — living handover.

## Deferred contract-level issue discovered during cross-stage audit
LAFEA.5 source-mesh adoption is lossless and explicitly forbids remeshing, but the generic mesh-profile binding UI currently requires the engineer to enter `Quality-profile reference length`, which is stored as `meshProfile.fields.globalTargetSize`.

Direct source audit shows:
- LAFEA.5 adoption plan preserves source nodes/connectivity;
- `topologyMutation=false`;
- `coordinateMutation=false`;
- `NO_REMESHING` is a qualification invariant;
- plan `characteristicLengthMin/Median/Max` are all `null`;
- bound configuration later presents `Remesh target — NOT APPLICABLE — source mesh is preserved`.

Therefore the editable reference-length field is a pseudo-input. Do NOT hide it and inject a constant/default. A legitimate next change must resolve the generic mesh-profile contract for source adoption, preferably using a deterministic source-derived reference or an explicit stage-aware adoption-profile contract, with semantic-hash and regression review.

## Appendix A — expert takeover questions
1. Does LAFEA.6 canonical stage adapter still report `discretization.applicable=false`?
2. Are LAFEA.4 and LAFEA.5 still mesh-applicable?
3. Does the new UI helper consume canonical applicability rather than calculate its own stage list?
4. Does it activate on `model.applicable=false` / `NOT_APPLICABLE` only?
5. Are mesh generation and quality calculations untouched?
6. Is the canonical view model still retained in memory after DOM compaction?
7. Does LAFEA.6 show one truthful Mesh not-applicable state rather than disabled controls?
8. Is the mesh metrics grid removed only for non-applicable stages?
9. Are generation/quality/actions removed only for non-applicable stages?
10. Is advanced mesh custody hidden for non-applicable stages?
11. Are LAFEA.3 current-mesh `Change mesh` semantics unchanged?
12. Are LAFEA.3/LAFEA.4 refinement semantics unchanged?
13. Is LAFEA.5 source-mesh adoption unchanged in this PR?
14. Does the static regression assert `.4/.5 applicable` and `.6 not applicable`?
15. Does the browser regression check absence of dead LAFEA.6 controls?
16. Have any encoded tests actually run? Expected answer: no; NOT_RUN.
17. Does the deferred LAFEA.5 issue remain unresolved rather than hidden?
18. Why is a hardcoded LAFEA.5 reference length prohibited? Because it would manufacture profile identity/engineering data with no source basis.
19. Does LAFEA.5 adoption preserve node IDs, coordinates, element IDs and connectivity under its current authority? Expected answer: yes by existing adoption contract; not modified here.
20. What is the next legitimate technical step? Resolve LAFEA.5 source-adoption profile reference semantics with deterministic source custody and exact regression evidence before removing that editable pseudo-input.
