# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Current merged base | `main@4482dcc481939c3af1068aea2e2db47baec63984` — qualified PR #1054 merged |
| Deterministic integration commit | `8d36d7779d86cba4c1729427fc725b242c55dcfb` |
| Latest dual-gate candidate | `6225083733131775c475c2b504be4948d89f5f4d` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host without host rebinding or automatic parent-geometry follow. |
| Engineering state | **POST-#1054 INTEGRATION TEST RECONCILIATION IN PROGRESS** |
| Empirical execution | Run `31580658197`, job `94062764867`: exact checkout/setup/source/line gates PASS; combined Node fails only two stale #1054 station-capability expectations; Chromium correctly skipped. |
| Merge state | Draft / unmerged. Current-main dual Node + real Chromium qualification is mandatory. |

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
| ISS-1061-14 | **RESOLVED / RUN 31580658197 PASSED THIS REGRESSION** | Placement marker policy is now required only after at least one changed support has a finite certified placement override. Restraint-only Preview no longer enters placement-marker-specific policy; actual placement remains fail closed if policy is missing. |
| ISS-1061-15 | **RESOLVED / RUN 31580658197 PASSED THIS REGRESSION** | Restraint Undo regression now asserts exact equality to the complete pre-transaction support record, preserving imported restraint/host/station/support custody independent of imported representation. |
| **ISS-1061-16** | **OPEN / TEST-ONLY INTEGRATION REPAIR AUTHORIZED** | Run `31580658197` now fails exactly two merged-#1054 expectations because #1061 intentionally certifies `stationMm`. `tests/topology-edit-capability-authority.test.mjs` and `tests/topology-edit-table-support-restraint.test.mjs` still expect support station capability `BLOCKED/READ_ONLY_PROPERTY`; actual integrated capability is correctly `NEEDS_INPUT/EXPLICIT_SUPPORT_STATION_REQUIRED` with `details.intentKind === 'SUPPORT_PLACEMENT'`. Update those tests to assert certified station relocation while continuing to assert `hostEntityId` remains `BLOCKED/READ_ONLY_PROPERTY`. Do not widen host rebinding or change production capability code. |
| RISK-1061-01 | OPEN | Combined placement + restraint Node and both real Chromium lifecycles must pass on the same exact post-#1054 head. |

## Preview Composition Contract

Preview combines:
1. generic candidate topology projection for changed non-support objects;
2. certified placement marker at `placementOverride.origin` for changed placement supports;
3. governed restraint projection through #1054 `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()`.

Placement is the sole support-marker authority when present; restraint direction segments may coexist. Restraint-only Preview does not require placement-specific marker policy unless an actual placement marker exists. Preview never mutates canonical/journal/source authority.

## Deterministic Main Integration

A direct retarget to merged main was dirty because #1054 and #1061 overlapped the Table workflow. Integration was materialized deterministically: current-main tree as base, PR1061 feature blobs overlaid, reconciled workflow used for the overlapping feature path. Tree `7f0ad400b26cccd32e390939e5e3de454b2d9846`; two-parent commit `8d36d7779d86cba4c1729427fc725b242c55dcfb` with merged main as second parent. GitHub then reported clean.

## Current Dual Qualification

Isolated base `qualification/pr1061-post1054-exact-head` contains only a temporary workflow. It exact-checks the PR head, Node 22, real Chromium, syntax/line/`git diff --check`, six focused Node files, then both placement and restraint production Chromium specs with one worker, zero retries and trace-on.

### Run 31579891323 — first post-#1054 dual gate

Head `1f181f87a255026229112d33d0c6a3416923f4a2`, job `94060327966`:
- checkout/setup/source/line PASS;
- Node 20/22 PASS;
- failures: eager placement marker policy on restraint-only Preview and representation-specific Undo assertion;
- Chromium skipped.

### Run 31580658197 — bounded repairs progressed

Head `6225083733131775c475c2b504be4948d89f5f4d`, job `94062764867`:
- exact checkout/setup/source/syntax/line/`git diff --check`: PASS;
- ISS-1061-14 restraint Preview regression: PASS;
- ISS-1061-15 exact support Undo restoration: PASS;
- only failures are two stale station capability assertions:
  - `tests/topology-edit-capability-authority.test.mjs`: expected `BLOCKED`, actual `NEEDS_INPUT`;
  - `tests/topology-edit-table-support-restraint.test.mjs`: expected `BLOCKED`, actual `NEEDS_INPUT`;
- production capability source explicitly maps `SUPPORT_PLACEMENT` to `NEEDS_INPUT`, reason `EXPLICIT_SUPPORT_STATION_REQUIRED`, intent `SUPPORT_PLACEMENT`;
- Chromium skipped after Node failure;
- no browser PASS claimed.

## Prior Qualification

Pre-final-#1054 placement head `a1056c1b9807095be806e67038a1ddfc43b7f770` passed Node + real Chromium in run `31570325923`; artifact `9131076959`, SHA256 `0c2509a450b67a968bcff36bc4ac26eace05f27a2522cc958bcf77048beb5717`. Report head `f0a66d9d2157285adca5557ed820b045128b4134` passed run `31570553278`. Those are feature evidence, not current-main integration evidence.

## Exact Changed-File Ledger

The authorized post-#1054 integration ledger becomes exactly **30** paths: the original 28 PR1061 paths plus two merged-main regression tests required to prove #1054 behavior survives while station relocation becomes certified.

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
29. `tests/topology-edit-table-support-restraint.test.mjs` — post-#1054 integration regression and certified-station expectation.
30. `tests/topology-edit-capability-authority.test.mjs` — post-#1054 capability regression; assert station certified while host remains read-only.

Temporary qualification workflows remain isolated and are not feature files.

## Next Gate

1. Repair only ISS-1061-16 in the two test files: station `NEEDS_INPUT/EXPLICIT_SUPPORT_STATION_REQUIRED/SUPPORT_PLACEMENT`; host remains `BLOCKED/READ_ONLY_PROPERTY`.
2. Re-run combined Node + dual real-Chromium exact-head gate.
3. Record exact evidence and qualify the report-only final head again.
4. Restore base to `main`; closure-audit mergeability/reviews/comments/30-file ledger; merge only with expected qualified head SHA.
5. Reconcile/requalify #1066 afterward.
