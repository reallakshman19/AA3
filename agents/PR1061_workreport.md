# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Original base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Qualification base | temporarily retargeted to isolated `qualification/pr1061-exact-head` so a surviving workflow can execute the exact PR head |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Pre-empirical source candidate | `d08cd53d4f79c346a83ee44e2a2a6b9ee4f4291f` |
| Qualified feature/test head | `a1056c1b9807095be806e67038a1ddfc43b7f770` |
| Qualified run | `31570325923` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Engineering state | **FEATURE/TEST HEAD EMPIRICALLY QUALIFIED** |
| Current execution truth | Exact-head/source verification PASS; focused Node qualification PASS; real Chromium visible-user lifecycle PASS; evidence upload PASS on `a1056c1b9807095be806e67038a1ddfc43b7f770`. |
| Merge state | Draft / unmerged. This report-only sync commit must itself receive an exact-head green run, then the PR must be restored to its original stacked base and integration rechecked before any merge decision. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic operation plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three meshes, support glyphs, and workspace entities remain projections/writeback only.

## Certified Semantics

This PR authorizes exactly **explicit same-host station relocation**.

- Host identity only through `resolveTopologyEditSupportHostEdge()`.
- Station is finite mm from canonical host FROM.
- Host type must be `PIPE`, `STRAIGHT`, or `STRAIGHT_ELEMENT`.
- `0 <= stationMm <= hostLengthMm`; exact no-op rejects.
- Origin is deterministic canonical centerline interpolation.
- One command changes one support only.
- Support, host edge, FROM node and TO node revisions enter dependency/stale custody.
- Imported attachment evidence remains separate from certified `placementOverride`.
- Existing certified journal is the only engineering Undo/Redo.

Still prohibited: host rebinding, arbitrary XYZ support movement, node movement as a support proxy, direct Three/entity authority, automatic support follow/restation, weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`, or a support-specific history stack.

## Resolved Empirical Issues

| ID | Status | Finding / resolution |
|---|---|---|
| ISS-1061-01 | RESOLVED | Dispatch adapter retains exact attachment ID/projected point/segment/distance that the legacy canonical reshape omits. |
| ISS-1061-02 | RESOLVED | Preview restores live support projection then renders explicit certified candidate support ghost. |
| ISS-1061-03 | RESOLVED / EXECUTED PASS | Placement resolver freezes detached descriptors instead of reducer-owned canonical records. |
| ISS-1061-04 | RESOLVED / EXECUTED PASS | Null/undefined/blank numeric evidence stays absent; numeric zero remains valid. |
| ISS-1061-05 | RESOLVED / EXECUTED PASS | Table test asserts the established deterministic `sequence: 0` command envelope. |
| ISS-1061-06 | RESOLVED / EXECUTED PASS | Certification regeneration failure was downstream of reducer immutability; Preview/Validate/Apply/Undo/Redo pass without guard weakening. |
| ISS-1061-07 | RESOLVED / EXECUTED PASS | Capability receipt carries scalar `currentOriginX/Y/Z`, preserving `TopologyEditCapabilityReceipt.v1`. |
| ISS-1061-08 | RESOLVED / CHROMIUM PASS | E2E keeps real `S-007`/`P-011` filtering and uses exact canonical row identity rather than requiring the source tag in the human label. |
| ISS-1061-09 | **RESOLVED / CHROMIUM PASS** | Generic XYZ production canonicalization had bypassed the dispatch adapter. The final fidelity controller now uses `buildDispatchedCanonicalTopology(...)` for generic and SJSON sources, with SJSON-only extra origin enrichment. Real Chromium proves S-007 receives exact station basis and completes certified relocation. No broad support-center inference was added. |
| ISS-1061-10 | RESOLVED | A raw-Node-incompatible browser-controller regression was removed; existing Node assertions remain. Real Chromium is the controller-routing integration authority. |
| ISS-1061-11 | RESOLVED / CHROMIUM PASS | E2E waits for the real Table adapter/window mount before clicking the real Engineering Table toolbar button, then requires `aria-expanded=false -> true` and visible content. |
| ISS-1061-12 | **RESOLVED / CHROMIUM PASS** | `P-011` legitimately matches both the PIPE row and S-007's Host field. The visible filter is preserved and the helper now requires exactly one canonical row of the requested element type, then clicks that real row. Final parent support-policy assertions pass. |

## Production Repair for Exact Attachment Retention

Authorized path: `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`.

1. Obtain live attachment/restraint models from `SupportRestraintStore`.
2. Build canonical topology through `topology-edit-source-adapter-dispatch.js` for generic and SJSON sources alike.
3. Only governed SJSON continues through SJSON exact-origin enrichment.
4. Generic XYZ retains already-resolved attachment projected-point/segment evidence without a second attachment inference algorithm.

No geometry planner or #1036 support-dependency authority was modified. The production controller remains below the repository `<300` physical-line ceiling.

## Exact Successful Qualification — Run 31570325923

Exact tested head: `a1056c1b9807095be806e67038a1ddfc43b7f770`.

### Static / focused gate

- exact PR-head checkout: PASS
- Node 22 setup and deterministic dependency installation: PASS
- Chromium provisioning: PASS
- exact-head identity assertion: PASS
- `node --check` on the three focused Node files and the browser spec: PASS
- `git diff --check`: PASS
- focused support-placement Node qualification: PASS

Focused coverage includes command/target revisions, one-support-only delta, null/conflict/no-op/stale/curved guards, durable writeback/reopen/tamper/source custody, deterministic Table plan/dependencies, capability receipt contract, non-mutating Preview/Validate, exact Apply, exact Undo/Redo, stale-host rebase, and preservation of `SUPPORT_GEOMETRY_POLICY_REQUIRED`.

### Real Chromium visible-user gate

Production path executed through the actual UI:

`Workspace -> load XYZ fixture -> 3D Edit -> Engineering Table -> filter/select S-007 -> type station -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo -> filter/select P-011 -> verify parent movement remains support-policy blocked`

Executed evidence:

- fixture `topology-edit-demo-20-v1-XYZ-10-COMPONENT-BRANCH-v1` loads: PASS
- real Engineering Table adapter/window readiness and toolbar open: PASS
- real filter `S-007`, exact canonical SUPPORT row `support:S-007`, visible Select: PASS
- support placement editor reports `NEEDS_INPUT`: PASS
- exact current station observed: **400 mm**
- exact requested station typed: **500 mm**
- typing preserves canonical hash, journal/ledger, active commands, session version, source semantic hash, source byte hash, and renderer count: PASS
- real Stage creates exactly one staged intent with canonical authority unchanged: PASS
- real Preview creates the candidate ghost while canonical placement override remains absent: PASS
- real Validate produces `READY_TO_APPLY` with canonical authority unchanged: PASS
- real Apply creates certified `CERTIFIED_TABLE_OVERRIDE` at 500 mm: PASS
- Table projection reports 500 mm with certified Table authority: PASS
- source semantic hash and source byte hash remain unchanged: PASS
- one renderer and exactly one new active engineering command: PASS
- real Undo restores baseline canonical hash, baseline active ledger/command IDs, and removes the placement override: PASS
- real Redo restores the applied canonical hash, active ledger and command IDs: PASS
- real filter `P-011` resolves exactly one PIPE row despite the legitimate additional SUPPORT query match; visible Select succeeds: PASS
- P-011 FROM node capability is `UNREPRESENTABLE`: PASS
- UI states `support movement policy must be certified`: PASS
- P-011 FROM Stage control is disabled: PASS
- page/console diagnostic assertions: PASS

No controller command method was invoked as UI coverage. Controller access in the E2E is read-only evidence capture only.

### Evidence artifact

- artifact ID: `9131076959`
- name: `pr1061-support-placement-a1056c1b9807095be806e67038a1ddfc43b7f770-1`
- size: `3,229,300` bytes
- SHA256: `0c2509a450b67a968bcff36bc4ac26eace05f27a2522cc958bcf77048beb5717`
- exact head recorded by artifact metadata: `a1056c1b9807095be806e67038a1ddfc43b7f770`
- evidence upload step: PASS

This run is the first complete Chromium qualification PASS for the support-placement feature/test tree.

## Qualification History

- Run 1 `31567646893` / `66b76dcb…`: Node 5/14; Chromium skipped.
- Run 2 `31567986663` / `1a8c4096…`: Node 13/14; Chromium skipped.
- Run 3 `31568210108` / `1747775a…`: Node 14/14; Chromium reached S-007 filter; row-label assertion mismatch. Artifact `9130325213`.
- Run 4 `31568624253` / `d0e7effb…`: Node 14/14; Chromium selected S-007 and exposed unresolved generic station authority. Artifact `9130446496`.
- Run 5 `31569229327` / `c337d6fb…`: source checks pass; new raw-Node browser-controller test failed on transitive CSS; Chromium skipped.
- Run 6 `31569477406` / `95b0679e…`: Node pass; Chromium exposed Table-adapter readiness race. Artifact `9130757922`.
- Run 7 `31569884470` / `64a46f92…`: Node pass; Chromium passes S-007 400->500 Stage/Preview/Validate/Apply/Undo/Redo; final P-011 row helper assumption fails. Artifact `9130908187`.
- **Run 8 `31570325923` / `a1056c1b…`: exact-head/source checks PASS; focused Node PASS; complete real Chromium lifecycle PASS; evidence upload PASS. Artifact `9131076959`.**

## Exact Changed-File Ledger

1. `agents/PR1061_workreport.md`
2. `e2e/topology-edit-table-support-placement.spec.js`
3. `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`
4. `src/workspace/topology-edit/support-restraint-family.js`
5. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
6. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
7. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
8. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
9. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
10. `src/workspace/topology-edit/table/topology-edit-table-projection.js`
11. `src/workspace/topology-edit/table/topology-edit-table-support-placement-contract.js`
12. `src/workspace/topology-edit/topology-edit-command-contract.js`
13. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
14. `src/workspace/topology-edit/topology-edit-command-resolver.js`
15. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
16. `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
17. `src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js`
18. `src/workspace/topology-edit/topology-edit-support-placement-command.js`
19. `src/workspace/topology-edit/topology-edit-support-placement.js`
20. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
21. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
22. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
23. `src/workspace/viewport-productivity/topology-edit-table-support-placement-editor.js`
24. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
25. `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
26. `tests/topology-edit-support-placement-command.test.mjs`
27. `tests/topology-edit-support-placement-writeback.test.mjs`
28. `tests/topology-edit-table-support-placement.test.mjs`

The temporary exact-head workflow exists only on `qualification/pr1061-exact-head`, not on the feature head. Any future changed-file discrepancy is a closure blocker until this report is updated before the change.

## Remaining Gate Before Stack Integration

1. Execute the qualification workflow once more on this report-only sync head so the final PR report commit itself has exact-head green evidence.
2. Restore PR #1061 from temporary qualification base to original `agent/certified-support-movement-semantics` base.
3. Re-check #1054/#1061 stack divergence, mergeability, reviews, statuses and changed-file closure against the current repository state.
4. Do **not** merge merely because the isolated qualification run is green; stack integration must remain truthful.
5. Only after #1061 is clean against its real base should #1066 be rebased/qualified on top of it.
