# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Current merged base | `main@4482dcc481939c3af1068aea2e2db47baec63984` — exact-head-qualified PR #1054 merged |
| Deterministic integration commit | `8d36d7779d86cba4c1729427fc725b242c55dcfb` — parents reconciled feature + merged main |
| Dual-gate trigger head | `1f181f87a255026229112d33d0c6a3416923f4a2` — tree-equivalent to integration tree |
| Prior pre-#1054 qualified feature head | `a1056c1b9807095be806e67038a1ddfc43b7f770` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host without host rebinding or automatic parent-geometry follow. |
| Engineering state | **POST-#1054 INTEGRATION REPAIR IN PROGRESS** |
| Empirical execution | Dual run `31579891323`, job `94060327966`: exact checkout/setup/source/line gates PASS; combined Node **20/22 PASS**; Chromium correctly skipped. Two bounded integration issues are registered below before repair. |
| Merge state | Draft / unmerged. Prior pre-#1054 green evidence is not current-main integration evidence. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three meshes and workspace entities remain projection/writeback only.

## Certified Semantics

Only **explicit same-host station relocation** is authorized:

- host resolved only by `resolveTopologyEditSupportHostEdge()`;
- straight `PIPE` / `STRAIGHT` / `STRAIGHT_ELEMENT` only;
- finite station from canonical host FROM, bounded to `[0, hostLengthMm]`;
- exact no-op rejects;
- deterministic centerline interpolation;
- one command changes one support only;
- support, host edge, FROM node and TO node revisions enter stale/dependency custody;
- imported attachment evidence remains separate from certified `placementOverride`;
- existing certified journal is the only Undo/Redo authority.

Still prohibited: host rebinding, arbitrary XYZ support movement, node proxy movement, automatic support follow/restation, curved-host chord approximation, direct Three/entity authority, a second support history stack, or weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`.

## Empirical Issue Register

| ID | Status | Finding / resolution |
|---|---|---|
| ISS-1061-01..12 | RESOLVED / prior exact-head PASS | Original placement authority, evidence, writeback/reopen, Table lifecycle, production row selection and parent support-policy issues were resolved and qualified before final #1054 merge. |
| ISS-1061-13 | RESOLVED IN INTEGRATION SOURCE / REQUALIFICATION REQUIRED | #1054 restraint Preview and #1061 placement Preview are composed in one transient ghost path: generic changed topology + explicit certified placement support marker + governed changed-support restraint segments, with placement marker suppressing duplicate support markers. |
| **ISS-1061-14** | **OPEN / PRODUCTION REPAIR AUTHORIZED** | Dual run `31579891323` failed the #1054 restraint-only Preview regression because `supportPlacementGhostElements()` calls `supportMarkerSizeMm(runtime)` before determining that there is no certified placement override. This wrongly makes a restraint-only Preview depend on placement-marker policy before any placement marker is rendered. Repair only `src/workspace/viewport-productivity/topology-edit-table-workflow.js`: first select changed supports with certified placement overrides, return `[]` immediately when none exist, and only then require marker policy. Do not weaken the marker policy for actual placement previews. |
| **ISS-1061-15** | **OPEN / TEST-ONLY ASSERTION REPAIR AUTHORIZED** | The same run's second failure occurs after Undo in the merged #1054 restraint lifecycle. The transaction already proves exact prior canonical hash and active-ledger restoration, but the test asserts the representation-specific condition `support.restraint === undefined`. Integrated canonical custody legitimately exposes imported REST evidence in `support.restraint` while `restraintAuthority` is not certified. Replace only that field-shape assertion with exact equality to the complete pre-transaction support record captured before Preview. This is stronger: Undo must restore all imported restraint, host, station and support fields exactly, regardless of which non-certified imported representation is active. |
| RISK-1061-01 | OPEN | Combined placement + restraint Node and Chromium lifecycles must pass on the same post-#1054 exact integration head. |

## Post-#1054 Preview Composition Contract

The integrated Preview must preserve three independent projection sources without duplicate authority:

1. generic candidate topology projection for changed non-support objects;
2. explicit certified placement marker at `placementOverride.origin` for changed support placement;
3. governed restraint projection for changed supports using the existing #1054 `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()` path and approved `supportMarkerSize` policy.

For a changed support with certified placement override, the placement marker is the sole support marker; restraint direction segments may coexist. A restraint-only Preview must remain fully valid without entering placement-marker-specific code beyond proving that no placement override exists. Preview never mutates canonical/journal/source state.

## Deterministic Current-Main Integration

GitHub retarget initially reported a conflict because #1054 and #1061 both touched the Table workflow. The integration was materialized deterministically instead of taking an implicit merge:

- current merged-main tree used as the base;
- exactly the 28 PR1061 feature blobs overlaid;
- only overlapping current-main feature path was the Table workflow, reconciled report-first;
- resulting tree `7f0ad400b26cccd32e390939e5e3de454b2d9846`;
- two-parent commit `8d36d7779d86cba4c1729427fc725b242c55dcfb` with parents reconciled feature head and `main@4482dcc…`;
- raw GitHub state then reported clean and exactly 28 changed files.

## Current Dual Exact-Head Qualification

Isolated base `qualification/pr1061-post1054-exact-head` contains only a temporary workflow. It checks out the exact PR head, installs Node 22 and real Chromium, syntax/line/`git diff --check` verifies both slices, runs six focused Node files, then runs both production Chromium specs with one worker, zero retries and trace-on.

Run `31579891323`, job `94060327966`, exact trigger head `1f181f87a255026229112d33d0c6a3416923f4a2`:

- exact checkout: PASS;
- Node/dependency/Chromium setup: PASS;
- exact-head/source/syntax/line-budget/`git diff --check`: PASS;
- combined Node: **22 tests / 20 pass / 2 fail**;
- all support-placement command, writeback, placement Table lifecycle and stale-host tests: PASS;
- support-restraint capability/command/plan tests: PASS except the two bounded integration assertions above;
- Chromium: SKIPPED after Node failure;
- no browser evidence was claimed or produced.

## Prior Placement Qualification

Before final #1054 merge, feature/test head `a1056c1b9807095be806e67038a1ddfc43b7f770` passed real Node + Chromium in run `31570325923`; artifact ID `9131076959`, SHA256 `0c2509a450b67a968bcff36bc4ac26eace05f27a2522cc958bcf77048beb5717`. Report head `f0a66d9d2157285adca5557ed820b045128b4134` also passed run `31570553278`. These remain feature evidence only and are not represented as current-main integration qualification.

## Exact Changed-File Ledger

PR feature ledger remains exactly **28** paths; both authorized repairs use existing paths:

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

The merged-main restraint test used by the dual gate is intentionally **not** added to this PR ledger; its authorized assertion repair is an integration-only correction on the feature branch and must be reconciled into the final tree without claiming it as new PR feature scope. If GitHub's final changed-file ledger expands because the test differs from merged main, update this report before closure and treat that expansion explicitly.

## Next Gate

1. Repair ISS-1061-14 lazily without weakening actual placement marker policy.
2. Repair ISS-1061-15 by asserting exact pre-transaction support restoration.
3. Re-run the same combined Node + dual real-Chromium exact-head gate.
4. Record exact evidence, then qualify the report-only final head again.
5. Restore PR base to `main`, closure-audit mergeability/reviews/comments/file ledger, and merge only with expected qualified head SHA.
6. Reconcile/requalify #1066 only after #1061 merges.
