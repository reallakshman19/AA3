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
| Run-6 exact head | `95b0679e6863f84e5c67de1770814236bf3f41d2` |
| Run-7 exact head | `64a46f924b4431c90014260ac25ddc4e4fbc61af` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Engineering state | EMPIRICAL QUALIFICATION IN PROGRESS |
| Current execution truth | Run `31569884470`: exact-head/source checks PASS; focused Node qualification PASS; real Chromium proves S-007 station authority and the full support relocation lifecycle through exact Redo. The run fails only at the subsequent P-011 row-discovery helper because the text filter legitimately returns both the P-011 PIPE and S-007 SUPPORT whose Host field is P-011. |
| Merge state | Draft / unmerged. Final P-011 parent-policy browser assertion and report-sync exact-head qualification remain required. |

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
| ISS-1061-07 | RESOLVED / RUN 3+ PASS | Capability receipt carries scalar `currentOriginX/Y/Z`, preserving `TopologyEditCapabilityReceipt.v1`. |
| ISS-1061-08 | RESOLVED / RUN 4+ | E2E keeps real `S-007`/`P-011` filtering and uses exact canonical row identity rather than requiring the source tag in the human label. |
| ISS-1061-09 | **RESOLVED / RUN 7 CHROMIUM PASS THROUGH REDO** | Generic XYZ production canonicalization had bypassed the dispatch adapter. The final fidelity controller now uses `buildDispatchedCanonicalTopology(...)` for generic and SJSON sources, with SJSON-only extra origin enrichment. Run 7 proves real S-007 reaches `NEEDS_INPUT` with exact host/station basis and completes certified relocation 400 → 500 mm through Stage, Preview, Validate, Apply, exact Undo, and exact Redo. No broad support-center inference was added. |
| ISS-1061-10 | RESOLVED / RUN 6+ NODE PASS | Raw-Node-incompatible full browser-controller regression was removed; previously green Node assertions remain. Real Chromium is controller-routing integration authority. |
| ISS-1061-11 | **RESOLVED / RUN 7** | Table-open readiness race was repaired only in E2E by waiting for the real Table window to be attached before the real toolbar click, then requiring `aria-expanded=false → true` and visible Table content. Run 7 passes this path. |
| ISS-1061-12 | **OPEN / E2E ROW-TARGET REPAIR AUTHORIZED** | After successful Redo, run `31569884470` types real filter `P-011`. The Engineering Table correctly reports `2 / 32 rows`: canonical `edge:P-011` (PIPE) and still-relevant `support:S-007` (SUPPORT), because the support's canonical Host field is also `P-011` and Table query searches projected fields. The helper incorrectly requires *all* filtered canonical rows to have count 1. Repair is limited to requiring exactly one filtered row of the requested `expectedElementType`, while preserving the real typed filter, exact `data-canonical-id`, visible Select click, and the global filtered-result semantics. Do not clear selection, bypass the filter, call controller methods, or weaken the final P-011 support-policy assertion. |

## Production Repair for Exact Attachment Retention

Authorized path: `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`

1. Obtain live attachment/restraint models from `SupportRestraintStore`.
2. Build canonical topology through `topology-edit-source-adapter-dispatch.js` for generic and SJSON sources alike.
3. Only governed SJSON continues through SJSON exact-origin enrichment.
4. Generic XYZ retains already-resolved attachment projected-point/segment evidence without a second attachment inference algorithm.

The production controller remains below the repository `<300` physical-line ceiling.

## Run-7 Executed Browser Evidence

Run `31569884470`, exact head `64a46f924b4431c90014260ac25ddc4e4fbc61af`:

- exact-head checkout/source verification: PASS
- focused Node qualification: PASS
- real Chromium loads `topology-edit-demo-20-v1-XYZ-10-COMPONENT-BRANCH-v1`: PASS
- Table adapter/window readiness + real toolbar click + expanded visible Table: PASS
- real filter `S-007`, unique SUPPORT row, exact canonical ID `support:S-007`, real Select click: PASS
- support placement editor status `NEEDS_INPUT`: PASS
- exact current station observed: **400 mm**
- exact requested station typed through visible input: **500 mm**
- typing is canonical/journal/source no-op: PASS
- real Stage click produces exactly one staged intent while canonical/journal/source stay unchanged: PASS
- real Preview click produces candidate/ghost while canonical placement override remains absent: PASS
- real Validate click produces `READY_TO_APPLY` while canonical/journal/source stay unchanged: PASS
- real Apply click changes canonical hash exactly once: PASS
- applied certified placement override authority `CERTIFIED_TABLE_OVERRIDE`, station 500 mm: PASS
- Table station projection = 500 mm with certified Table authority: PASS
- source semantic hash and source byte hash unchanged: PASS
- singular renderer and one new active engineering command: PASS
- real Undo restores baseline canonical hash, baseline active ledger hash/command IDs, and removes placement override: PASS
- real Redo restores applied canonical hash/ledger/command IDs: PASS
- after Redo, real filter `P-011` returns two rows by design: `edge:P-011` and `support:S-007`; helper fails before pipe selection because it expected one global row
- therefore final visible P-011 `SUPPORT_GEOMETRY_POLICY_REQUIRED` assertion is **NOT YET EXECUTED** on run 7.

Artifact:
- ID `9130908187`
- name `pr1061-support-placement-64a46f924b4431c90014260ac25ddc4e4fbc61af-1`
- size `3,673,224` bytes
- SHA256 `e29d71a7afe139daf312768a7cc8ad3ea1908e0e61770e97d3eb5fc1b940b05c`
- contains failure screenshot, `error-context.md`, and `trace.zip`.

Run 7 is not the final Chromium qualification PASS because the P-011 parent-policy assertion is still pending, but it is affirmative executed evidence for the complete support-relocation lifecycle through Redo.

## Qualification History

- Run 1 `31567646893` / `66b76dcb…`: Node 5/14, Chromium skipped.
- Run 2 `31567986663` / `1a8c4096…`: Node 13/14, Chromium skipped.
- Run 3 `31568210108` / `1747775a…`: Node 14/14; Chromium reached S-007 filter; row-label test mismatch. Artifact `9130325213`.
- Run 4 `31568624253` / `d0e7effb…`: Node 14/14; Chromium selected S-007 but exposed unresolved station authority. Artifact `9130446496`.
- Run 5 `31569229327` / `c337d6fb…`: source checks pass; newly authored raw-Node browser-controller test failed on transitive CSS; Chromium skipped.
- Run 6 `31569477406` / `95b0679e…`: Node pass; Chromium hit Table-adapter readiness race. Artifact `9130757922`.
- Run 7 `31569884470` / `64a46f92…`: Node pass; real Chromium passes Table open, S-007 400→500 Stage/Preview/Validate/Apply/Undo/Redo; fails only at P-011 helper global row-count assumption. Artifact `9130908187`.

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

1. Repair ISS-1061-12 only in the existing E2E helper: after typing the real filter, require exactly one canonical row of `expectedElementType` and select that row; do not require the entire query result to be singular.
2. Re-run exact-head source checks, all three focused Node files, and real Chromium.
3. Require Chromium to repeat the already-proven S-007 lifecycle and then select P-011 through the visible Table and prove FROM node movement remains `UNREPRESENTABLE` with `SUPPORT_GEOMETRY_POLICY_REQUIRED` and disabled Stage.
4. If green, update this report with the exact successful run/artifact evidence, then execute a report-sync exact-head qualification so the final report commit itself is empirically qualified.
5. Restore #1061 to its original stacked base, then re-check stack integration/mergeability. Do not merge from source review alone.
