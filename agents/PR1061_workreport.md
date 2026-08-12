# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94`; temporarily retargeted to isolated qualification base `qualification/pr1061-exact-head` for exact-head execution |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Pre-empirical source candidate | `d08cd53d4f79c346a83ee44e2a2a6b9ee4f4291f` |
| Run-1 exact head | `66b76dcba5027d737f5ce805e07861b717ee9450` |
| Run-2 exact head | `1a8c40967e42a559c0998189a60a11dbb638600a` |
| Run-3 exact head | `1747775aedcaac6879e894e0d41a42a9f31df738` |
| Run-4 exact head | `d0e7effbdf9eaa5c14837101c6271697716c8c77` |
| Run-5 exact head | `c337d6fbc2bad5b0c0d75c6fe362dc39be2caaea` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Engineering state | EMPIRICAL REPAIR / QUALIFICATION IN PROGRESS |
| Current execution truth | Run `31569229327`: exact-head/source checks PASS; focused Node gate aborted because the newly added controller integration test imported the browser controller's CSS dependency into raw Node ESM (`ERR_UNKNOWN_FILE_EXTENSION .css`); Chromium correctly skipped. This run does not disprove the production repair. |
| Merge state | Draft / unmerged. Browser qualification remains required. |

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

## Issue Register

| ID | Status | Finding / resolution |
|---|---|---|
| ISS-1061-01 | RESOLVED | Dispatch adapter retains exact attachment ID/projected point/segment/distance that the legacy canonical reshape omits. |
| ISS-1061-02 | RESOLVED | Preview restores live support projection then renders explicit certified candidate support ghost. |
| ISS-1061-03 | RESOLVED / RUN 2+ PASS | Placement resolver freezes detached descriptors instead of reducer-owned canonical records. |
| ISS-1061-04 | RESOLVED / RUN 2+ PASS | Null/undefined/blank numeric evidence stays absent; numeric zero remains valid. |
| ISS-1061-05 | RESOLVED / RUN 2+ PASS | Table test asserts the established deterministic `sequence: 0` command envelope. |
| ISS-1061-06 | RESOLVED / RUN 2+ PASS | Certification regeneration failure was downstream of reducer immutability; Preview/Validate/Apply/Undo/Redo pass without guard weakening. |
| ISS-1061-07 | RESOLVED / RUN 3+ PASS | Capability receipt now carries scalar `currentOriginX/Y/Z`, preserving `TopologyEditCapabilityReceipt.v1`. |
| ISS-1061-08 | RESOLVED / RUN 4 PROGRESSED | E2E keeps real `S-007`/`P-011` filtering and selects the unique canonical row instead of requiring the source tag in the human label. |
| ISS-1061-09 | REPAIR IMPLEMENTED / EMPIRICAL RECHECK PENDING | Run 4 proved generic XYZ production canonicalization bypassed the dispatch adapter. The final fidelity controller now uses `buildDispatchedCanonicalTopology(...)` for generic and SJSON workspace sources; only governed SJSON receives its additional exact-origin enrichment. No broad support-center inference was added and the oversized core was not modified. Run 5 did not reach a valid test of this repair because of ISS-1061-10. |
| ISS-1061-10 | **OPEN / TEST-HARNESS REPAIR AUTHORIZED** | Run `31569229327` added a raw-Node regression that directly imported `topology-edit-3d-sjson-fidelity-controller.js`. That browser controller dependency chain imports `topology-edit-productivity.css`, and Node 22 ESM correctly failed at module load with `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".css"`. This is a qualification-environment mismatch, not a demonstrated production logic failure. Remove only the newly authored browser-controller Node import/test and its test-only setup. Keep the production repair and all previously green Node assertions. The real Chromium lifecycle remains the authoritative integration check for controller routing; direct dispatch/writeback semantics remain covered by Node tests. |

## Run-4 Fixture Evidence for ISS-1061-09

The production XYZ fixture contains:

- P-011 start `[6460,1650,3450]`
- P-011 end `[7260,1650,3450]`
- S-007 center `[6860,1650,3450]` — exact midpoint
- S-007 `ATTACHED_COMPONENT_ID = P-011`
- S-007 `SUPPORTED_COMPONENT_ID = P-011`

The existing attachment target for a two-port component carries its exact start/end centerline. `createAttachmentRecord()` projects the support canonical position onto that target and records exact projected point, distance and segment parameter. No new proximity algorithm is required or authorized.

## Repair Boundary

### Production repair — implemented

Authorized path: `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`

1. Obtain live attachment/restraint models from `SupportRestraintStore`.
2. Build canonical topology through `topology-edit-source-adapter-dispatch.js` for generic and SJSON sources alike.
3. Only governed SJSON continues through SJSON exact-origin enrichment.
4. Generic XYZ retains already-resolved attachment projected-point/segment evidence without a second attachment inference algorithm.

### Qualification-harness repair — authorized

`tests/topology-edit-support-placement-writeback.test.mjs` must remain a raw-Node-compatible test module. Remove the newly added full browser-controller import/test that transitively imports CSS. Do **not** remove previously green command, writeback, reopen, source-custody, tamper, Table, certification, or support-policy tests. Production-controller routing is to be proven by the real Chromium lifecycle.

## Qualification History

### Run 1 — `31567646893`
Exact head `66b76dcba5027d737f5ce805e07861b717ee9450`:
- setup/source checks PASS
- focused Node 5 pass / 9 fail
- Chromium skipped.

### Run 2 — `31567986663`
Exact head `1a8c40967e42a559c0998189a60a11dbb638600a`:
- setup/source checks PASS
- focused Node 13 pass / 1 fail
- Chromium skipped.

### Run 3 — `31568210108`
Exact head `1747775aedcaac6879e894e0d41a42a9f31df738`:
- exact-head/source checks PASS
- focused Node **14/14 PASS**
- Chromium loaded XYZ fixture, entered 3D Edit, opened Table and filtered S-007
- E2E row-text assertion mismatch blocked selection
- artifact `9130325213`, 2,055,005 bytes, SHA256 `88de77d8ef802f84cf5c2a0e0a832536133633f0063a9de744785c85906a3b98`.

### Run 4 — `31568624253`
Exact head `d0e7effbdf9eaa5c14837101c6271697716c8c77`:
- exact-head/source checks PASS
- focused Node **14/14 PASS**
- real Chromium loaded XYZ, entered 3D Edit/Table, typed S-007, selected unique canonical `support:S-007`
- placement editor reported `UNREPRESENTABLE`, host P-011, no station range, `Basis UNRESOLVED`
- no station edit/Stage occurred
- artifact `9130446496`, 1,927,555 bytes, SHA256 `b4dc0babf2ff3d6f44be5e182f5c86436a5fd24cf57c9384fe71140796daab37`.

### Run 5 — `31569229327`
Exact head `c337d6fbc2bad5b0c0d75c6fe362dc39be2caaea`:
- exact-head checkout/source verification PASS
- Node 22 setup and dependency/Chromium provisioning PASS
- focused Node step **FAIL AT MODULE LOAD** for `tests/topology-edit-support-placement-writeback.test.mjs`
- exact error: raw Node ESM cannot load browser CSS dependency `src/workspace/topology-edit-productivity.css` imported transitively through the newly added full controller import
- other discovered support-placement command/Table tests passed before TAP summarized the file-level failure; run summary was 12 tests, 11 pass / 1 fail
- Chromium lifecycle SKIPPED because the focused Node gate failed
- no browser qualification result exists for the ISS-1061-09 production repair on this head.

Run 5 is a harness-design failure, not a production qualification PASS or FAIL.

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

No geometry planner or #1036 support-dependency authority is modified. The temporary exact-head workflow exists only on `qualification/pr1061-exact-head`, not on the feature head. Any future changed-file discrepancy is a closure blocker until this report is updated before the change.

## Next Gate

1. Remove only the raw-Node-incompatible browser-controller regression introduced for run 5; preserve the ISS-1061-09 production repair and all previously green tests.
2. Re-run exact-head source checks and the three focused Node files.
3. Require the real Chromium lifecycle to prove S-007 now derives certified station basis, then complete type → Stage → Preview → Validate → Apply → Undo → Redo and P-011 support-policy block.
4. If full lifecycle is green, update this report with exact run/artifact evidence and run an exact-head report-sync qualification.
5. Restore #1061 to its original stacked base, then re-check stack integration/mergeability. Do not merge from source review alone.
