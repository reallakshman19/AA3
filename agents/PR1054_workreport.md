# PR 1054 Work Report — Certified Support Restraint Recovery

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1054 — `feat(3d-edit): recover certified support restraint editing` |
| Branch | `agent/certified-support-movement-semantics` |
| Original base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Qualification base | `qualification/pr1054-exact-head@1f5dbae1613723840a09ecbf1ef2d5283d825369` — isolated workflow only |
| Bootstrap | `4140ffbd147b9cc73655d00e8264f8fb774869ff` — empty tree-equivalent commit |
| Preview production repair source | `414985e617bd90024d993f11961cec353af515a8` |
| Final qualified feature/test head | `bef97eb80fe4ca1020b5071259895996a8104684` |
| Mission | Recover certified support restraint-property editing while keeping support placement/movement fail closed. |
| Engineering state | **FEATURE/TEST QUALIFIED; FINAL REPORT-HEAD QUALIFICATION PENDING** |
| Empirical execution | Run `31578119806` on exact head `bef97eb8…`: source/line checks PASS, focused Node **14/14 PASS**, production Chromium **1/1 PASS**, evidence upload PASS, and embedded JSON self-identifies the exact head. |
| Merge state | Draft / unmerged. This report-only head must pass the same exact-head gate before restoring the PR to `main` and merging. |

## Preserved Authority

`exact SUPPORT row -> exact support + node + host custody -> transient restraint draft -> governed SUPPORT_RESTRAINT intent -> UPDATE_SUPPORT_RESTRAINT command -> candidate Preview ghost -> validation -> certified transaction -> canonical topology/journal -> Three projection`

Still prohibited: station/host editing, support placement movement, implicit support follow/restation, direct DOM/renderer canonical writes, replacement of imported evidence, mutation during input/Stage/Preview/Validate, a second support history stack, weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`, or bypassing planner/certification.

## Certified SUPPORT_RESTRAINT Contract

Requested fields:

- `family` — required certified family token;
- `direction` — required except `ANCHOR`;
- `gapMm` — optional finite non-negative mm;
- `travelMm` — optional finite non-negative mm.

Dependency custody: exact support revision, its canonical node revision when present, and exactly one shared-resolver host-edge revision. Invalid family/direction/gap/travel, unresolved/ambiguous host, stale revisions, non-target deltas, or evidence loss fail closed.

A committed override is recognized only when `support.restraintAuthority === 'CERTIFIED_TABLE_OVERRIDE'`; imported restraint evidence remains distinct and retained.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Parent geometry remains fail closed under #1036 support policy. |
| DEC-1054-02 | Scope | ACCEPTED NARROW | Restraint properties only; no placement semantics. |
| DEC-1054-03 | Host authority | ACCEPTED | Shared #1036 resolver only; exact `RESOLVED` required. |
| DEC-1054-04 | Evidence | ACCEPTED | Imported restraints retained; only marked override becomes active. |
| ISS-1054-01 | Current-main regression | RESOLVED | Explicit unresolved host token rejects before override. |
| ISS-1054-02 | Qualification | RESOLVED | Production visible-user Chromium lifecycle passes on exact feature/test head. |
| ISS-1054-03 | Test expectation | RESOLVED | `LOCAL_Y` expectation matches unchanged deterministic host frame. |
| ISS-1054-04 | Test expectation | RESOLVED | Deterministic planner `sequence: 0` expectation restored; planner unchanged. |
| ISS-1054-05 | Browser evidence interpretation | RESOLVED | Imported active restraint is not mislabeled as certified override. |
| ISS-1054-06 | Preview correctness | RESOLVED | Changed support restraint Preview reuses existing restraint geometry/projection authority and renders only changed-support ghost content. |
| ISS-1054-07 | Regression expectation | RESOLVED | Support marker retains support pick identity; restraint-direction segment retains deterministic restraint pick identity plus support cross-reference. |
| ISS-1054-08 | Evidence lineage | **RESOLVED / RUN 6 PASS** | Qualification JSON now reads `TARGET_HEAD_SHA` and records exact `candidateHead: bef97eb80fe4ca1020b5071259895996a8104684`, matching workflow checkout and artifact name. |
| RISK-1054-01 | Stack integration | OPEN | #1061 also touches Table workflow and must reconcile/requalify after #1054 promotion. |

## Production Preview Repair

`src/workspace/viewport-productivity/topology-edit-table-workflow.js` composes the normal changed topology ghost with support-restraint projection for changed support IDs only:

- derives candidate support glyphs with existing `deriveAllSupportRestraintGeometry()`;
- projects with existing `projectSupportGeometryToViewport()`;
- uses approved viewport `supportMarkerSize` policy;
- includes only overlays whose `supportId` is in `candidate.changedCanonicalIds`;
- merges projected elements/segments into the existing one-shot ghost payload;
- never mutates canonical topology during Preview.

The focused regression test proves one support marker plus one restraint-direction segment, correct support/restraint pick identity, and unchanged canonical hash.

## Production Browser Qualification

Visible operation path only:

`Workspace -> XYZ fixture -> 3D Edit -> Engineering Table -> type S-007 -> visible Select -> family/direction/gap/travel -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo`

Controller access is read-only evidence only. No controller operation method is invoked as UI coverage.

### Final feature/test gate — Run 6 PASS

Run `31578119806`, job `94054827376`, exact head `bef97eb80fe4ca1020b5071259895996a8104684`:

- exact checkout: PASS;
- Node 22 / dependency / real Chromium provisioning: PASS;
- exact-head assertion: PASS;
- four `node --check` checks: PASS;
- E2E `<300` physical-line gate: PASS;
- `git diff --check`: PASS;
- focused Node: **14 tests / 14 pass / 0 fail**;
- production Chromium: **1 test / 1 pass / 0 fail**, zero retries, 20.9 s;
- evidence upload: PASS;
- artifact ID `9134026212`;
- artifact name `pr1054-support-restraint-bef97eb80fe4ca1020b5071259895996a8104684-1`;
- artifact size `2,808,762` bytes;
- artifact SHA256 `4152f74e1fb025f704cf71f6de0df8d817d2f9fa4320129c8c822b662208d056`.

Downloaded artifact JSON was inspected and records:

- `candidateHead: bef97eb80fe4ca1020b5071259895996a8104684` — exact self-identification PASS;
- fixture `topology-edit-demo-20-v1-XYZ-10-COMPONENT-BRANCH-v1` via repository fixture path;
- support `support:S-007` on exact host `P-011`;
- requested certified override `LINE_STOP`, `+X`, gap `5 mm`, travel `20 mm`;
- baseline canonical `fnv1a64:20f31e91953113ff`;
- Stage retains baseline canonical/journal/source authority and creates exactly one intent;
- Preview retains baseline authority and creates **2 ghost children**;
- Validate reaches `READY_TO_APPLY` with baseline authority unchanged;
- Apply canonical `fnv1a64:1a286953bd2c23bd`, active command `command:0:0f55244f044b26e4`, session version 1;
- source semantic `fnv1a64:805bd0142552c16a` and source byte `fnv1a64:da6a34816255a850` unchanged throughout;
- Undo restores exact baseline canonical, active ledger `fnv1a64:2f92bebe1af0a67d`, and empty active command IDs;
- Redo restores exact applied canonical, active ledger `fnv1a64:c7a7460b9375b3ac`, and exact command ID;
- renderer count remains exactly 1;
- host remains `P-011`; support station evidence remains unchanged;
- committed override authority is `CERTIFIED_TABLE_OVERRIDE` and Table fields match requested values.

Run 6 supersedes Run 5 for final feature/test evidence because its embedded JSON is self-identifying.

## Earlier Diagnostic Runs

- Run `31576192230`: setup/source PASS; Node 11/13; stale LOCAL_Y and sequence test expectations; Chromium skipped.
- Run `31576547806`: Node 13/13 PASS; browser exposed imported-restraint/override evidence mismatch; artifact `9133425605`.
- Run `31576864213`: Node 13/13 PASS; browser reached real Stage/Preview and exposed missing restraint ghost; artifact `9133534883`.
- Run `31577391318`: source gates PASS; Node 13/14; only new ghost pick-identity expectation failed; Chromium skipped.
- Run `31577803188`: Node 14/14 and Chromium 1/1 PASS; artifact `9133902966`; embedded JSON head field null, prompting ISS-1054-08 metadata-only correction.

## Isolated Exact-Head Harness

`qualification/pr1054-exact-head` contains only `.github/workflows/pr1054-exact-head-qualification.yml`. It checks out `github.event.pull_request.head.sha`, installs Node 22 and real Chromium, runs syntax/line/`git diff --check`, executes the focused Node suite, executes Chromium with zero retries and trace-on, and uploads evidence. The workflow file is not in the PR feature diff.

## Exact Changed-File Ledger

Feature diff is exactly **23** paths:

1. `agents/PR1054_workreport.md`
2. `e2e/topology-edit-table-support-restraint.spec.js`
3. `src/workspace/topology-edit/support-restraint-family.js`
4. `src/workspace/topology-edit/topology-edit-support-restraint-command.js`
5. `src/workspace/topology-edit/topology-edit-command-contract.js`
6. `src/workspace/topology-edit/topology-edit-command-resolver.js`
7. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
8. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
9. `src/workspace/topology-edit/table/topology-edit-table-support-restraint-contract.js`
10. `src/workspace/topology-edit/table/topology-edit-table-tee-reducer-contract.js`
11. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
12. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
13. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
14. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
15. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
16. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
17. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
18. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
19. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
20. `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
21. `tests/topology-edit-capability-authority.test.mjs`
22. `tests/topology-edit-support-restraint-command.test.mjs`
23. `tests/topology-edit-table-support-restraint.test.mjs`

The temporary qualification workflow remains isolated and is not in this ledger.

## Static / Architecture Audit

- E2E remains below `<300` physical lines and exact-head line gate passes;
- shared #1036 host resolver remains authoritative;
- parent support geometry still fails closed;
- valve catalogue/target-DN guards remain intact;
- Preview reuses normal support-restraint geometry/projection authority;
- no canonical mutation occurs during input/Stage/Preview/Validate;
- no second history stack exists;
- no mesh or Three object becomes engineering authority.

## Final Closure Gate

This report update is report-only. Before merge:

1. exact-head qualify this resulting report-only head with the same Node + real Chromium gate;
2. restore PR #1054 from the isolated qualification base to `main`;
3. re-read current `main`, raw PR mergeability/rebaseability, reviews/comments, and exact 23-file ledger;
4. merge only with `expected_head_sha` pinned to the final qualified report head;
5. then reconcile/requalify upper stack in order #1061 -> #1066.
