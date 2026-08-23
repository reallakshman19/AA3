# PR1338 Work Report

## Mission
Continue the LAFEA.3–6 UI simplification by making mesh-generation controls secondary once a retained mesh is already current, while keeping blocked/stale recovery controls exposed and preserving the canonical meshing implementation unchanged.

## PR state
- PR: #1338
- Branch: `agent/lafea3-6-current-mesh-compact-20260823`
- Base: `main`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Defect
The canonical discretization view model already distinguishes:
- `MESH_CURRENT_PASS`
- `MESH_CURRENT_WARNING`
- `MESH_CURRENT_BLOCK`
- `MESH_STALE`
- `MESH_INVALID`

However the rendered Generation section did not use those states to change presentation. After successful retention, the primary mesh surface still contained:
- bound element family / target size;
- Preview mesh plan;
- Generate and retain mesh;
- the full retained last-plan summary;

while the Mesh summary directly above already displayed the retained element family, target size, node count, element count, warnings and blockers.

The result was duplicated information and a regeneration-oriented action hierarchy even though the engineer's next task was quality review / continuation.

## Implemented presentation rule
The canonical generation renderer remains unchanged.

The existing post-render presentation pass in `lafea-refinement-disclosure.js` now also evaluates the canonical `uiPhase`.

Generation is compacted only when:
```text
retained evidence present
AND uiPhase in {MESH_CURRENT_PASS, MESH_CURRENT_WARNING}
```

The complete existing Generation section is moved into a native closed `<details>` element:
- normal automatic generation: `Change mesh`
- source-mesh adoption: `Change source-mesh adoption`

The disclosure retains the original DOM subtree. No generation control is reconstructed or reimplemented.

## Recovery behavior deliberately preserved
Generation is NOT compacted for:
- `MESH_CURRENT_BLOCK`
- `MESH_STALE`
- `MESH_INVALID`
- `READY_TO_PLAN`
- `PLAN_AVAILABLE`
- `PLAN_BLOCKED`
- `PROFILE_REQUIRED`
- `PARENT_REQUIRED`
- `PRODUCER_UNAVAILABLE`
- any mesh-absent state

Rationale: regeneration / correction is a primary engineer task in these states and therefore must not be hidden behind secondary disclosure.

## Authority boundary
This PR does not modify:
- `src/workspace/lafea-discretization-generation-panel.js`;
- `src/workspace/lafea-discretization-view-model.js`;
- mesh producers;
- mesh-plan calculation;
- target-size logic;
- resource disposition;
- profile binding;
- quality thresholds or PASS/WARNING/BLOCK classification;
- retained mesh evidence/custody/currentness;
- source/lifecycle authority;
- retained-mesh refinement engineering rules;
- continuum/shell solver preparation or execution;
- result/release authority.

The only production change is presentation DOM compaction after upstream engineering state has already been determined.

## Regression evidence encoded
### Focused state/DOM regression
`scripts/lafea-current-mesh-compaction-check.mjs`

Encodes:
- CURRENT_PASS -> compact generation;
- CURRENT_WARNING -> compact generation;
- CURRENT_BLOCK -> keep generation exposed;
- STALE -> keep generation exposed;
- mesh absent -> no compaction;
- automatic generation summary -> `Change mesh`;
- source adoption summary -> `Change source-mesh adoption`;
- original Preview / Generate controls remain descendants of the disclosure;
- the canonical generation renderer still owns Preview, Generate and plan summary behavior.

### Browser contract
`e2e/lafea-current-mesh-compaction.spec.js`

Encodes the actual LAFEA.3 sample path:
1. load simulated source;
2. Generate and retain mesh is visible before retention;
3. retained mesh reaches `CURRENT_PASS` / `PASS`;
4. generation disclosure appears closed;
5. primary Mesh summary still exposes T6 and 30 mm;
6. Preview / Generate controls are hidden while disclosure is closed;
7. opening Change mesh restores both canonical controls.

## Validation truth
- source/state review: COMPLETE
- effective diff review: COMPLETE before work-report commit
- focused regression: ENCODED / NOT_RUN
- Playwright regression: ENCODED / NOT_RUN
- browser/manual verification: NOT_RUN
- GitHub Actions/workflows: NOT_INSPECTED / NOT_RUN

Do not report the encoded checks as PASS until they execute.

## Changed-file ledger
1. `src/workspace/lafea-refinement-disclosure.js` — extends the existing presentation compaction pass to current generation state.
2. `scripts/lafea-current-mesh-compaction-check.mjs` — state/DOM regression.
3. `e2e/lafea-current-mesh-compaction.spec.js` — actual sample-path browser contract.
4. `agents/PR1338_workreport.md` — living handover.

## Remaining risk
The unresolved risk is execution/browser behavior only. The engineering authority path is not changed. Native `<details>` is used deliberately so interaction state remains browser-standard and keyboard/touch accessible.

## Appendix A — expert takeover questions
1. Is generation compaction driven only by canonical `uiPhase` plus retained evidence presence?
2. Are only `MESH_CURRENT_PASS` and `MESH_CURRENT_WARNING` compacted?
3. Does `MESH_CURRENT_BLOCK` keep generation recovery controls exposed?
4. Do stale and invalid meshes keep generation recovery controls exposed?
5. Does a mesh-absent state leave initial generation controls visible?
6. Is `lafea-discretization-generation-panel.js` unchanged?
7. Is `lafea-discretization-view-model.js` unchanged?
8. Are Preview and Generate the exact original DOM controls rather than replacements?
9. Does opening Change mesh expose the original plan summary and producer/configuration evidence?
10. Does the primary Mesh summary remain visible while generation is collapsed?
11. Is source-mesh adoption labelled distinctly without changing adoption authority?
12. Does compaction occur after canonical rendering rather than before engineering state calculation?
13. Is no mesh state reclassified by the presentation module?
14. Are quality PASS/WARNING/BLOCK rows still visible independently of generation disclosure?
15. Is the Continue action unaffected?
16. Is retained-mesh refinement still independently compacted by the same presentation pass?
17. Have the focused regression and Playwright test actually executed on the exact current head?
18. Is the branch still `behind_by=0` against current main?
19. Did any concurrent main change overlap these four effective paths?
20. Has any mesh producer, solver, source-authority, lifecycle, quality-gate or release-authority file entered the diff?
21. Is the PR still draft and unmerged pending fresh merge authorization?
