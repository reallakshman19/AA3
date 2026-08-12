# PR 1054 Work Report — Certified Support Restraint Recovery

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1054 — `feat(3d-edit): recover certified support restraint editing` |
| Branch | `agent/certified-support-movement-semantics` |
| Original base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Current main observed before qualification | `6463b39866f68eb6476bfa41764538eb19f8b9f9` |
| Qualification base | `qualification/pr1054-exact-head@1f5dbae1613723840a09ecbf1ef2d5283d825369` — isolated workflow only |
| Bootstrap | `4140ffbd147b9cc73655d00e8264f8fb774869ff` — empty tree-equivalent commit |
| Preview production repair source | `414985e617bd90024d993f11961cec353af515a8` |
| Fully green feature/test head | `ff6dcfec6aff5110d5f7a9efe60005e1ab1ed060` |
| Mission | Recover certified support restraint-property editing while keeping support placement/movement fail closed. |
| Engineering state | **GREEN FEATURE/TEST HEAD; EVIDENCE METADATA REPAIR IN PROGRESS** |
| Current execution truth | Run `31577803188` on exact head `ff6dcfec…` passed exact-head/source/line checks, focused Node **14/14**, full production Chromium S-007 lifecycle, and evidence upload. The embedded qualification JSON has `candidateHead:null` because the E2E reads the wrong workflow env name; exact-head identity remains independently proven by checkout logs and artifact name. Repair is authorized below before final closure. |
| Merge state | Draft / unmerged. Final self-identifying evidence run and report-only exact-head rerun still required. |

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
| ISS-1054-01 | Current-main regression | RESOLVED IN SOURCE | Explicit unresolved host token rejects before override. |
| ISS-1054-02 | Qualification | RESOLVED / RUN 5 PASS | Real production Chromium qualification exists and passed on `ff6dcfec…`. |
| ISS-1054-03 | Test expectation | RESOLVED / RUN 2+ PASS | `LOCAL_Y` expectation aligned with unchanged deterministic host frame. |
| ISS-1054-04 | Test expectation | RESOLVED / RUN 2+ PASS | Deterministic planner `sequence:0` expectation restored; planner unchanged. |
| ISS-1054-05 | Browser evidence interpretation | RESOLVED / RUN 3+ PASS | Imported active restraint is not mislabeled as certified override. |
| ISS-1054-06 | Preview correctness | RESOLVED / RUN 5 PASS | Changed support restraint Preview now reuses existing support-restraint geometry/projection authority and renders only changed support ghost content. |
| ISS-1054-07 | Regression expectation | RESOLVED / RUN 5 PASS | Support marker retains support pick identity; restraint-direction segment retains deterministic restraint pick identity plus support cross-reference. |
| ISS-1054-08 | Evidence lineage | **OPEN / E2E-ONLY REPAIR AUTHORIZED** | Green run `31577803188` produced artifact whose name and checkout log identify exact head `ff6dcfec…`, but JSON field `candidateHead` is null because E2E reads `TOPOLOGY_EDIT_TARGET_HEAD_SHA` while workflow exports `TARGET_HEAD_SHA`. Change only the JSON assignment to use `process.env.TARGET_HEAD_SHA` (optionally fallback to the old name). Do not alter lifecycle assertions or production source. Re-run exact-head qualification after this metadata-only test change. |
| RISK-1054-01 | Stack integration | OPEN | #1061 also touches Table workflow and must reconcile/requalify after #1054 promotion. |

## Production Preview Repair

`src/workspace/viewport-productivity/topology-edit-table-workflow.js` now composes the normal changed topology ghost with support-restraint projection for changed support IDs only:

- derives candidate support glyphs with existing `deriveAllSupportRestraintGeometry()`;
- projects with existing `projectSupportGeometryToViewport()`;
- uses approved viewport `supportMarkerSize` policy;
- includes only support overlays whose `supportId` is in `candidate.changedCanonicalIds`;
- merges projected elements/segments into the existing one-shot ghost payload;
- never mutates canonical topology during Preview.

The regression test proves one support marker + one restraint-direction segment, correct support/restraint pick identity, and unchanged canonical hash.

## Production Browser Qualification Contract

The E2E uses only visible production controls for operation coverage:

`Workspace -> XYZ fixture -> 3D Edit -> Engineering Table -> type S-007 -> visible Select -> family/direction/gap/travel -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo`

Controller access is read-only evidence only. It proves transient non-mutation, one governed intent, visible ghost, `READY_TO_APPLY`, certified override, source-hash custody, host/station custody, exact Undo/Redo ledger state, one renderer, and clean diagnostics except known favicon noise.

## Isolated Exact-Head Harness

`qualification/pr1054-exact-head` contains only `.github/workflows/pr1054-exact-head-qualification.yml`. It checks out `github.event.pull_request.head.sha`, installs Node 22 and real Chromium, runs syntax/line/`git diff --check`, executes focused Node tests, executes Chromium with zero retries and trace-on, and uploads evidence. The workflow file is not in the feature diff.

## Executed Gates

### Run 1 — `31576192230`, head `ff96666f…`

Setup/source gates PASS; Node 11/13; stale LOCAL_Y and sequence expectations; Chromium skipped.

### Run 2 — `31576547806`, head `1aba6173…`

Node 13/13 PASS; Chromium reached S-007 then exposed imported-restraint/override evidence mismatch. Artifact `9133425605`, SHA256 `787bf6d1d578c424a15442cee5046a46b241d3da5ab57c8028273c88221143dc`.

### Run 3 — `31576864213`, head `20630072…`

Node 13/13 PASS; Chromium reached real Stage/Preview and exposed missing restraint ghost. Artifact `9133534883`, SHA256 `b906126882d1002552535fc3335ca28263fce9a6e0254071b818b5a822e3d53d`.

### Run 4 — `31577391318`, head `41fb076e…`

Source gates PASS; Node 13/14; only new ghost pick-identity expectation failed; Chromium skipped.

### Run 5 — **FULL FEATURE/TEST PASS**

Run `31577803188`, job `94053777113`, exact head `ff6dcfec6aff5110d5f7a9efe60005e1ab1ed060`:

- exact checkout: PASS;
- Node 22 / dependency / real Chromium provisioning: PASS;
- exact-head assertion, four syntax checks, E2E `<300` gate, `git diff --check`: PASS;
- focused Node: **14 tests / 14 pass / 0 fail**;
- production Chromium: **1 test / 1 pass / 0 fail**, zero retries, 27.7 s;
- real lifecycle completed through Stage, visible Preview ghost, Validate, Apply, Undo and Redo;
- evidence upload: PASS;
- artifact ID `9133902966`;
- artifact name `pr1054-support-restraint-ff6dcfec6aff5110d5f7a9efe60005e1ab1ed060-1`;
- artifact size `2,951,129` bytes;
- artifact SHA256 `32d387cb4dd7f5a07240cdae65d8e78c6ee74cb9bb6d5c4326c2cfea5554d65b`.

Artifact JSON records:

- support `support:S-007` on host `P-011`;
- requested override `LINE_STOP`, `+X`, gap `5 mm`, travel `20 mm`;
- baseline canonical `fnv1a64:20f31e91953113ff`;
- Stage retains baseline authority and creates exactly one intent;
- Preview retains baseline authority and creates **2 ghost children**;
- Validate status `READY_TO_APPLY` with baseline authority unchanged;
- Apply canonical `fnv1a64:1a286953bd2c23bd`, one active command, session version 1;
- source semantic `fnv1a64:805bd0142552c16a` and source byte `fnv1a64:da6a34816255a850` unchanged throughout;
- Undo returns exact baseline canonical/active-ledger/empty active command IDs;
- Redo returns exact applied canonical/active-ledger/command ID;
- renderer count remains 1;
- host remains `P-011`; station evidence remains unchanged;
- certified override is `CERTIFIED_TABLE_OVERRIDE` and Table fields match requested values.

The browser/Node qualification is valid. ISS-1054-08 exists only to make the embedded JSON package self-identify the exact head instead of relying on surrounding run/artifact identity.

## Exact Changed-File Ledger

Feature diff remains exactly **23** paths:

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

The temporary workflow remains isolated and is not in this ledger.

## Static / Source Audit

- new E2E is below `<300` physical lines and the exact-head line gate passes;
- shared #1036 host resolver remains authoritative;
- parent support geometry still fails closed;
- valve catalogue/target-DN guards remain intact;
- Preview reuses normal support-restraint geometry/projection authority;
- no canonical mutation occurs during input/Stage/Preview/Validate;
- no second history stack exists.

## Next Gate

1. Fix only ISS-1054-08 in the E2E evidence JSON head field.
2. Re-run exact-head Node + Chromium qualification on that metadata-corrected feature/test head.
3. Update this report with the new self-identifying artifact and mark all issues resolved.
4. Exact-head qualify the resulting report-only final head.
5. Restore PR1054 to `main`; re-check current main, raw mergeability, reviews/comments, exact 23-file ledger.
6. Merge only with the qualified final expected head SHA.
7. Reconcile/requalify upper stack in order #1061 then #1066.
