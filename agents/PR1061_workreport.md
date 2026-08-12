# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Current merged base | `main@4482dcc481939c3af1068aea2e2db47baec63984` — qualified PR #1054 merged |
| Deterministic integration commit | `8d36d7779d86cba4c1729427fc725b242c55dcfb` |
| Qualified feature/test head | `911d8c85a0734c1c43e2eaea1fb3faf974e21ba8` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host without host rebinding or automatic parent-geometry follow. |
| Engineering state | **FEATURE/TEST CURRENT-MAIN INTEGRATION QUALIFIED; FINAL REPORT-ONLY HEAD REQUALIFICATION REQUIRED** |
| Empirical execution | Run `31581095610`, job `94064177677`: exact checkout/source/line gates PASS; focused Node **28/28 PASS**; real Chromium **2/2 PASS**, one worker, zero retries. |
| Evidence artifact | `9135220193` — `pr1061-post1054-911d8c85a0734c1c43e2eaea1fb3faf974e21ba8-1`; SHA256 `69f636558027890bcdd54914ee418763b08e8129c6ef046497eab040ef364e79`. |
| Merge state | Draft / unmerged. The report-only head created by this report update must pass the same exact-head gate before closure audit. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three/workspace objects remain projection/writeback only.

## Certified Semantics

Only explicit same-host station relocation is authorized: exact shared host resolution, straight host only, finite bounded station from canonical FROM, exact no-op rejection, deterministic interpolation, one-support delta, support/host/both endpoint revision custody, imported attachment evidence retained separately from `placementOverride`, existing journal only. Host rebinding, arbitrary XYZ movement, node proxy movement, automatic follow/restation, curved-host approximation, direct Three authority and support-specific history remain prohibited. `SUPPORT_GEOMETRY_POLICY_REQUIRED` remains fail closed.

## Empirical Issue Register

| ID | Status | Finding / resolution |
|---|---|---|
| ISS-1061-01..12 | RESOLVED / prior exact-head PASS | Original placement authority, evidence, writeback/reopen, Table lifecycle, production row selection and parent support-policy issues were resolved and qualified before final #1054 merge. |
| ISS-1061-13 | RESOLVED / RUN 31581095610 PASS | #1054 restraint Preview and #1061 placement Preview are composed in one transient ghost: generic changed topology + explicit placement support marker + governed changed-support restraint projection; placement suppresses duplicate support markers. |
| ISS-1061-14 | RESOLVED / RUN 31581095610 PASS | Placement marker policy is required only after at least one changed support has a finite certified placement override. Restraint-only Preview does not enter placement-marker-specific policy; actual placement remains fail closed if marker policy is missing. |
| ISS-1061-15 | RESOLVED / RUN 31581095610 PASS | Restraint Undo asserts exact equality to the complete pre-transaction support record, preserving imported restraint/host/station/support custody independent of imported representation. |
| ISS-1061-16 | RESOLVED / RUN 31581095610 PASS | Integrated station capability assertions now match certified placement semantics: `stationMm` is `NEEDS_INPUT/EXPLICIT_SUPPORT_STATION_REQUIRED` with `details.intentKind === 'SUPPORT_PLACEMENT'`; `hostEntityId` remains `BLOCKED/READ_ONLY_PROPERTY`. No production capability widening was introduced. |
| RISK-1061-01 | CLOSED FOR FEATURE/TEST HEAD | Combined placement + restraint Node and both real Chromium lifecycles passed on exact head `911d8c85a0734c1c43e2eaea1fb3faf974e21ba8`. Final report-only exact-head rerun remains mandatory before merge. |

## Preview Composition Contract

Preview combines:
1. generic candidate topology projection for changed non-support objects;
2. certified placement marker at `placementOverride.origin` for changed placement supports;
3. governed restraint projection through #1054 `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()`.

Placement is the sole support-marker authority when present; restraint direction segments may coexist. Restraint-only Preview does not require placement-specific marker policy unless an actual placement marker exists. Preview never mutates canonical/journal/source authority.

## Deterministic Main Integration

A direct retarget to merged main was dirty because #1054 and #1061 overlapped the Table workflow. Integration was materialized deterministically: current-main tree as base, PR1061 feature blobs overlaid, reconciled workflow used for the overlapping feature path. Tree `7f0ad400b26cccd32e390939e5e3de454b2d9846`; two-parent commit `8d36d7779d86cba4c1729427fc725b242c55dcfb` with merged main as second parent. GitHub then reported clean.

## Current Dual Qualification

Isolated base `qualification/pr1061-post1054-exact-head` contains only a temporary workflow. It exact-checks `github.event.pull_request.head.sha`, exports both `TARGET_HEAD_SHA` and `TOPOLOGY_EDIT_TARGET_HEAD_SHA`, checks source/syntax/line/`git diff --check`, runs the six focused Node files, then both placement and restraint production Chromium specs with one worker, zero retries and trace-on, and uploads both JSON evidence reports plus traces.

### Run 31581095610 — current-main feature/test integration PASS

Exact head `911d8c85a0734c1c43e2eaea1fb3faf974e21ba8`, job `94064177677`:
- exact checkout/setup/source/syntax/line/`git diff --check`: PASS;
- focused Node: **28 tests, 28 pass, 0 fail, 0 skipped/cancelled/todo**;
- real Chromium: **2 tests, 2 pass**, one worker, zero retries;
- placement lifecycle: PASS;
- restraint lifecycle regression on the same exact head: PASS;
- evidence upload: PASS.

Artifact `9135220193`, name `pr1061-post1054-911d8c85a0734c1c43e2eaea1fb3faf974e21ba8-1`, digest `sha256:69f636558027890bcdd54914ee418763b08e8129c6ef046497eab040ef364e79`.

Both uploaded JSON reports self-identify candidate head `911d8c85a0734c1c43e2eaea1fb3faf974e21ba8`.

Placement evidence records XYZ fixture support `S-007` on host `P-011`, station `400 -> 500` mm over an `800` mm straight host. Stage/Preview/Validate leave canonical/source/journal unchanged; Preview reports `ghostChildCount: 2`; Validate reports `READY_TO_APPLY`; Apply creates one `CERTIFIED_TABLE_OVERRIDE` placement with segment parameter `0.625`, origin `{x:6960,y:1650,z:3450}`, and placement hash `fnv1a64:02c87186a14aae96`; imported origin remains `{x:6860,y:1650,z:3450}`; source semantic/byte hashes remain unchanged; Undo restores exact baseline and Redo restores exact applied state; renderer count is one.

Restraint evidence on the same exact head records requested `LINE_STOP`, `+X`, gap `5` mm, travel `20` mm. Stage/Preview/Validate leave canonical/source/journal unchanged; Preview reports `ghostChildCount: 2`; Validate reports `READY_TO_APPLY`; Apply creates one certified restraint override; source hashes remain unchanged; Undo restores exact baseline and Redo restores exact applied state; renderer count is one.

## Prior Qualification / Repair History

- Pre-final-#1054 placement head `a1056c1b9807095be806e67038a1ddfc43b7f770` passed Node + real Chromium in run `31570325923`; artifact `9131076959`, SHA256 `0c2509a450b67a968bcff36bc4ac26eace05f27a2522cc958bcf77048beb5717`. Report head `f0a66d9d2157285adca5557ed820b045128b4134` passed run `31570553278`. Those remain prior feature evidence, not current-main integration evidence.
- Run `31579891323` found eager placement-marker policy entry during restraint-only Preview and a representation-specific restraint Undo assertion.
- Run `31580658197` cleared those defects and exposed exactly two stale merged-#1054 station-capability expectations.
- Run `31581095610` cleared all bounded integration repairs and passed combined Node plus both real Chromium lifecycles.

## Exact Changed-File Ledger

The authorized post-#1054 integration ledger is exactly **30** paths:

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
29. `tests/topology-edit-table-support-restraint.test.mjs`
30. `tests/topology-edit-capability-authority.test.mjs`

Temporary qualification workflows remain isolated and are not feature files.

## Final Gate

This report update is intentionally report-only and creates the final merge-candidate head. Do not edit the report again after the final exact-head run.

1. Require the same exact-head qualification on this report-only head: source/syntax/line/`git diff --check` PASS, focused Node 28/28 PASS, real Chromium 2/2 PASS, evidence upload PASS.
2. Restore PR base to `main`.
3. Closure-audit current main SHA, raw mergeable/rebaseable/mergeable-state, exact 30-file ledger, submitted reviews, review threads and comments, and absence of temporary qualification workflow leakage.
4. Update stale PR description without changing head; mark ready only after closure audit is clean.
5. Merge only with the exact qualified report-only head SHA pinned as expected head.
6. Verify the resulting `main` merge commit, then reconcile/requalify #1066.
