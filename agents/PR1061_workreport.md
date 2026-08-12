# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Current merged base | `main@4482dcc481939c3af1068aea2e2db47baec63984` — qualified PR #1054 merged |
| Deterministic integration commit | `8d36d7779d86cba4c1729427fc725b242c55dcfb` |
| Dual-gate trigger head | `1f181f87a255026229112d33d0c6a3416923f4a2` |
| Prior pre-#1054 qualified feature head | `a1056c1b9807095be806e67038a1ddfc43b7f770` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host without host rebinding or automatic parent-geometry follow. |
| Engineering state | **POST-#1054 INTEGRATION REPAIR IN PROGRESS** |
| Empirical execution | Run `31579891323`, job `94060327966`: exact checkout/setup/source/line gates PASS; combined Node **20/22 PASS**; Chromium skipped after Node failure. |
| Merge state | Draft / unmerged. Current-main dual-slice requalification is mandatory. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three/workspace objects remain projection/writeback only.

## Certified Semantics

Only explicit same-host station relocation is authorized: exact shared host resolution, straight host only, finite bounded station from canonical FROM, exact no-op rejection, deterministic interpolation, one-support delta, support/host/both endpoint revision custody, imported attachment evidence retained separately from `placementOverride`, existing journal only. Host rebinding, arbitrary XYZ movement, node proxy movement, automatic follow/restation, curved-host approximation, direct Three authority and support-specific history remain prohibited. `SUPPORT_GEOMETRY_POLICY_REQUIRED` remains fail closed.

## Empirical Issue Register

| ID | Status | Finding / resolution |
|---|---|---|
| ISS-1061-01..12 | RESOLVED / prior exact-head PASS | Original placement authority, evidence, writeback/reopen, Table lifecycle, production row selection and parent support-policy issues were resolved and qualified before final #1054 merge. |
| ISS-1061-13 | RESOLVED IN INTEGRATION SOURCE / REQUALIFICATION REQUIRED | #1054 restraint Preview and #1061 placement Preview are composed in one transient ghost: generic changed topology + explicit placement support marker + governed changed-support restraint projection; placement suppresses duplicate support markers. |
| ISS-1061-14 | **OPEN / PRODUCTION REPAIR AUTHORIZED** | Run `31579891323` proves `supportPlacementGhostElements()` eagerly calls `supportMarkerSizeMm(runtime)` even when no placement override exists, so restraint-only Preview can fail before restraint projection. In `src/workspace/viewport-productivity/topology-edit-table-workflow.js`, first select changed certified placement supports; return `[]` when none; only then require marker policy. Actual placement Preview must still fail closed when marker policy is missing. |
| ISS-1061-15 | **OPEN / TEST-ONLY REPAIR AUTHORIZED** | Run `31579891323` also shows the merged #1054 Undo regression is representation-specific: it checks `support.restraint === undefined` even though integrated imported custody can expose a non-certified REST object. In `tests/topology-edit-table-support-restraint.test.mjs`, capture the complete pre-transaction support record and assert exact deep equality after Undo. This strengthens the invariant: every imported restraint/host/station/support field must be restored exactly. |
| RISK-1061-01 | OPEN | Combined placement + restraint Node and real Chromium lifecycles must pass on the same exact post-#1054 head. |

## Preview Composition Contract

Preview combines:
1. generic candidate topology projection for changed non-support objects;
2. certified placement marker at `placementOverride.origin` for changed placement supports;
3. governed restraint projection through #1054 `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()`.

Placement is the sole support-marker authority when present; restraint direction segments may coexist. Restraint-only Preview must not require placement-specific marker policy until an actual placement marker is selected. Preview never mutates canonical/journal/source authority.

## Deterministic Main Integration

A direct retarget to merged main was dirty because #1054 and #1061 overlapped the Table workflow. Integration was materialized deterministically: current-main tree as base, PR1061 feature blobs overlaid, reconciled workflow used for the sole overlapping feature path. Tree `7f0ad400b26cccd32e390939e5e3de454b2d9846`; two-parent commit `8d36d7779d86cba4c1729427fc725b242c55dcfb` with merged main as second parent. GitHub then reported clean.

## Current Dual Qualification

Isolated base `qualification/pr1061-post1054-exact-head` contains only a temporary workflow. It exact-checks the PR head, Node 22, real Chromium, syntax/line/`git diff --check`, six focused Node files, then both placement and restraint production Chromium specs with one worker, zero retries and trace-on.

Run `31579891323`, job `94060327966`, head `1f181f87a255026229112d33d0c6a3416923f4a2`:
- checkout/setup/source/syntax/line gates PASS;
- Node **22 total / 20 pass / 2 fail**;
- all placement command/writeback/Table/stale-host tests PASS;
- restraint capability/command/plan tests PASS except ISS-1061-14/15;
- Chromium SKIPPED;
- no browser PASS claimed.

## Prior Qualification

Pre-final-#1054 placement head `a1056c1b9807095be806e67038a1ddfc43b7f770` passed Node + real Chromium in run `31570325923`; artifact `9131076959`, SHA256 `0c2509a450b67a968bcff36bc4ac26eace05f27a2522cc958bcf77048beb5717`. Report head `f0a66d9d2157285adca5557ed820b045128b4134` passed run `31570553278`. Those are feature evidence, not current-main integration evidence.

## Exact Changed-File Ledger

The authorized post-#1054 integration ledger becomes exactly **29** paths. The original 28 PR1061 paths remain plus one merged-main regression test required to prove #1054 behavior survives integration:

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
29. `tests/topology-edit-table-support-restraint.test.mjs` — post-#1054 integration regression; assertion-only repair under ISS-1061-15.

Temporary qualification workflows remain isolated and are not feature files.

## Next Gate

1. Repair ISS-1061-14 lazily without weakening actual placement marker policy.
2. Repair ISS-1061-15 with exact pre-transaction support equality.
3. Re-run combined Node + dual real-Chromium exact-head gate.
4. Record exact evidence and qualify the report-only final head again.
5. Restore base to `main`; closure-audit mergeability/reviews/comments/29-file ledger; merge only with expected qualified head SHA.
6. Reconcile/requalify #1066 afterward.
