# PR 1054 Work Report — Certified Support Restraint Recovery

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1054 — `feat(3d-edit): recover certified support restraint editing` |
| Branch | `agent/certified-support-movement-semantics` |
| Original base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Current main observed | `6463b39866f68eb6476bfa41764538eb19f8b9f9` |
| Qualification base | `qualification/pr1054-exact-head@1f5dbae1613723840a09ecbf1ef2d5283d825369` — isolated workflow only |
| Bootstrap | `4140ffbd147b9cc73655d00e8264f8fb774869ff` — empty tree-equivalent commit |
| Pre-qualification implementation/test head | `85e67606b588809c96b03c8801a783edaf09620d` |
| Browser qualification source head | `57df6f795a8ca82a3d3b0f794284871d929b5f76` |
| First exact-head qualification candidate | `ff96666fccb8ff6bc25be9231228fd750485022d` |
| Second exact-head qualification candidate | `1aba6173983c7b0b090a0a67e11eac3e06ed7ca2` |
| Third exact-head qualification candidate | `20630072aa59f274b538335c7a6c5f4d534f617a` |
| Mission | Recover certified support restraint-property editing while keeping support placement/movement fail closed. |
| Engineering state | **EMPIRICAL PRODUCTION REPAIR IN PROGRESS** |
| Current execution truth | Run `31576864213` checked out exact head `20630072…`; setup/source/line-budget checks PASS; focused Node qualification **13/13 PASS**; production Chromium reached real Stage and Preview, then proved the Table restraint Preview emits no visible ghost. Production Preview repair is authorized below. |
| Merge state | Draft / unmerged until exact-head Node + Chromium evidence is green and the final report-sync head is requalified. |

## Preserved Authority

The recovered operation is intentionally narrow:

`exact SUPPORT row -> exact support + node + host custody -> explicit full restraint override -> governed SUPPORT_RESTRAINT intent -> UPDATE_SUPPORT_RESTRAINT command -> candidate Preview ghost -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo`

Still prohibited:

- editing `stationMm` or host attachment;
- moving support placement or a support node as a proxy;
- implicit support follow/restation when parent geometry moves;
- direct support/canonical writes from Table/DOM/renderer;
- replacing imported `support.restraints` evidence;
- canonical mutation during input, Stage, Preview or Validate;
- a second support-specific history stack;
- weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`;
- depending on unmerged #1051/#1053 source.

## Tested Predecessor and Current-Main Reconciliation

PR #1033 exact head `68444777aeb01f165c987975ef1555bb1b7a9a1b` triggered 17 workflows and all 17 passed. That is predecessor evidence only.

Merged #1036 remains the sole support-host authority through `resolveTopologyEditSupportHostEdge()` and the final `SUPPORT_GEOMETRY_POLICY_REQUIRED` backstop. PR1054 requires exact `RESOLVED` host custody and does not restore the predecessor's private host lookup.

Merged #1041 catalogue/target-DN custody remains intact in manually reconciled Table modules. Support restraint editing does not widen valve or geometry authority.

Current `main` has advanced 83 commits from the original PR base, but the observed intervening current-main file set is concentrated in LFEA/publication work and does not overlap PR1054's topology-edit paths. Raw GitHub PR state before temporary retarget reported `mergeable: true`, `rebaseable: true`, `mergeable_state: clean`.

## Certified SUPPORT_RESTRAINT Contract

Exact requested fields:

- `family` — required certified family token;
- `direction` — required except for `ANCHOR`;
- `gapMm` — optional finite non-negative mm;
- `travelMm` — optional finite non-negative mm.

Exact dependency custody:

- one canonical support revision;
- its canonical node revision when present;
- exactly one shared-resolver host-edge revision.

Fail closed on non-SUPPORT target, unsupported family/direction, missing non-ANCHOR direction, negative/non-finite gap/travel, unresolved/ambiguous host authority, stale support/node/host revision, candidate delta outside the target support, or loss/replacement of imported restraint evidence.

The command writes a separate canonical `support.restraint` marked `CERTIFIED_TABLE_OVERRIDE`; imported `support.restraints` remains retained evidence. A pre-existing imported `support.restraint` object is not a certified override unless `support.restraintAuthority === 'CERTIFIED_TABLE_OVERRIDE'`.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Parent geometry remains fail closed under #1036 support policy. |
| DEC-1054-02 | Scope | ACCEPTED NARROW | Restraint properties only; no placement semantics. |
| DEC-1054-03 | Host authority | ACCEPTED | Shared #1036 resolver only; exact `RESOLVED` required. |
| DEC-1054-04 | Evidence | ACCEPTED | Imported restraints retained; only marked override becomes active. |
| ISS-1054-01 | Current-main regression | RESOLVED IN SOURCE | Explicit unresolved host token rejects before override. |
| ISS-1054-02 | Qualification | E2E AUTHORED / EXECUTION IN PROGRESS | `e2e/topology-edit-table-support-restraint.spec.js` uses the real Workspace -> XYZ fixture -> 3D Edit -> Engineering Table path, selects S-007 through a typed filter and visible Select action, edits real restraint controls, and drives Stage/Preview/Validate/Apply/Undo/Redo. Controller access is read-only evidence only. |
| ISS-1054-03 | Test expectation | **RESOLVED / RUN 2+ NODE PASS** | `LOCAL_Y` test expectation now matches the unchanged deterministic `hostFrame()` cross-product convention. |
| ISS-1054-04 | Test expectation | **RESOLVED / RUN 2+ NODE PASS** | Table plan expectation now includes established deterministic `sequence: 0`; planner behavior was not changed. |
| ISS-1054-05 | Browser evidence interpretation | **RESOLVED / RUN 3 PROGRESSED** | E2E evidence now classifies an override only when `restraintAuthority === 'CERTIFIED_TABLE_OVERRIDE'`, preserving the imported baseline restraint. Run `31576864213` progressed beyond this assertion through input, Stage and Preview. |
| ISS-1054-06 | Preview correctness | **OPEN / PRODUCTION REPAIR AUTHORIZED** | Run `31576864213` proved the governed restraint candidate reaches Table Preview while `ghostGroup.children.length` remains zero. `renderTopologyEditTablePreviewGhost()` currently builds ghost content only from `controller.deriveVisual(candidateTopology)`, but ordinary `refreshView()` derives restraint glyphs separately through `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()`. A restraint-only edit therefore has no changed topology geometry to place in the generic ghost. Repair `src/workspace/viewport-productivity/topology-edit-table-workflow.js` so Preview combines existing changed topology projection with the governed support-restraint projection for changed support IDs only, using the already-approved `supportMarkerSize` policy. Add a regression assertion to the existing `tests/topology-edit-table-support-restraint.test.mjs`. Do not mutate canonical state, do not render all supports as ghost, and do not invent a second restraint geometry algorithm. |
| RISK-1054-01 | Current-head execution | OPEN | Exact-head Chromium lifecycle must reach Apply/Undo/Redo before merge. |
| RISK-1054-02 | Sibling overlap | OPEN / MANAGEABLE | #1051 overlaps small Table wiring and must reconcile whichever merges second. |

## Browser Qualification Contract

The E2E proves or fails on all of the following without guard weakening:

1. real production UI loads the XYZ engineering fixture and opens Engineering Table;
2. typed `S-007` filtering selects exactly one canonical SUPPORT row through its visible Select action;
3. family/direction/gap/travel input changes are transient and preserve canonical hash, journal/ledger, active command IDs, session version, source hashes, and renderer count;
4. Stage produces one governed intent while canonical authority remains unchanged;
5. Preview produces a visible governed changed-support restraint ghost without canonical mutation;
6. Validate reaches `READY_TO_APPLY` without canonical mutation;
7. Apply changes the target support to a `CERTIFIED_TABLE_OVERRIDE` restraint while imported restraint evidence remains unchanged;
8. support host identity and station remain unchanged;
9. source semantic/byte hashes remain unchanged;
10. Undo restores exact baseline canonical/ledger/command state and removes the certified override, revealing the original imported restraint state;
11. Redo restores exact applied canonical/ledger/command state;
12. page/console diagnostics remain clean except known favicon noise;
13. no direct controller operation method is invoked as UI coverage.

## Qualification Harness

The isolated base branch `qualification/pr1054-exact-head` contains only `.github/workflows/pr1054-exact-head-qualification.yml`. The workflow checks out `github.event.pull_request.head.sha`, provisions Node 22 and real Chromium, syntax-checks qualification sources, enforces the new E2E `<300` physical-line guard, runs `git diff --check`, executes the three focused Node files, executes the production Chromium lifecycle with trace-on and zero retries, and uploads Playwright/evidence output. The workflow file is not part of the PR1054 feature diff.

### First executed exact-head gate — Node FAIL, Chromium skipped

Run `31576192230`, job `94048733399`, exact head `ff96666fccb8ff6bc25be9231228fd750485022d`:

- setup/source/syntax/line-budget/`git diff --check`: PASS
- focused Node: **13 tests / 11 pass / 2 fail**
- stale failures: `LOCAL_Y` sign expectation and omitted deterministic `sequence: 0`
- Chromium: SKIPPED.

### Second executed exact-head gate — Node PASS, Chromium FAIL before edit

Run `31576547806`, job `94049913490`, exact head `1aba6173983c7b0b090a0a67e11eac3e06ed7ca2`:

- setup/source/syntax/line-budget/`git diff --check`: PASS
- focused Node: **13/13 PASS**
- Chromium loaded XYZ fixture, opened Engineering Table, filtered to and selected S-007
- FAIL before edit on incorrect baseline override interpretation
- artifact ID `9133425605`, size `2,012,202` bytes, SHA256 `787bf6d1d578c424a15442cee5046a46b241d3da5ab57c8028273c88221143dc`.

### Third executed exact-head gate — Node PASS, Chromium exposed missing Preview ghost

Run `31576864213`, job `94050832026`, exact head `20630072aa59f274b538335c7a6c5f4d534f617a`:

- exact checkout/setup/source/syntax/line-budget/`git diff --check`: PASS
- focused Node: **13/13 PASS**
- production Chromium loaded the real XYZ fixture, opened Engineering Table, filtered/select S-007, edited the real restraint controls, staged one governed intent and entered non-mutating Preview
- candidate/preview exists, but `ghostGroup.children.length` was **0**; the E2E failed at the required visible ghost assertion before Validate/Apply
- static trace of production source confirms Table Preview uses only generic topology `deriveVisual()` while normal support-restraint rendering is a separate governed projection path
- Playwright evidence upload: PASS
- artifact ID `9133534883`
- artifact name `pr1054-support-restraint-20630072aa59f274b538335c7a6c5f4d534f617a-1`
- artifact size `2,336,877` bytes
- artifact SHA256 `b906126882d1002552535fc3335ca28263fce9a6e0254071b818b5a822e3d53d`.

This is a real Node PASS and a real production Preview defect. The next production change is restricted to ISS-1054-06.

After a green feature/test run:

1. update this report with exact run/head/artifact evidence;
2. run the same gate again on the report-only head;
3. restore PR1054 to `main`;
4. re-check raw GitHub mergeability, reviews/comments, exact changed-file ledger, and current main;
5. merge only with `expected_head_sha` pinned to the qualified final head.

## Exact Changed-File Ledger

The current feature diff is 22 paths; the authorized Preview repair adds one existing production path, making the final ledger exactly **23** paths:

1. `agents/PR1054_workreport.md`
2. `e2e/topology-edit-table-support-restraint.spec.js`
3. `src/workspace/topology-edit/support-restraint-family.js`
4. `src/workspace/topology-edit/topology-edit-support-restraint-command.js`
5. `src/workspace/topology-edit/topology-edit-command-contract.js`
6. `src/workspace/topology-edit/topology-edit-command-resolver.js`
7. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
8. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
9. `src/workspace/topology-edit/table/topology-edit-table-support-restraint-contract.js`
10. `src/workspace/topology-edit/table/topology-edit-table-tee-reducer-contract.js` — extraction-only line-budget move; no M10 semantic change
11. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
12. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
13. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
14. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
15. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
16. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
17. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
18. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
19. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
20. `src/workspace/viewport-productivity/topology-edit-table-workflow.js` — authorized ISS-1054-06 Preview projection repair
21. `tests/topology-edit-capability-authority.test.mjs`
22. `tests/topology-edit-support-restraint-command.test.mjs`
23. `tests/topology-edit-table-support-restraint.test.mjs`

The temporary qualification workflow remains isolated on `qualification/pr1054-exact-head` and is not part of this ledger.

## Static / Source Audit

- manually reconciled current-main modules remain below the repository `<300` physical-line gate;
- new E2E line gate has passed every exact-head run;
- current valve catalogue selector and target-DN fail-closed logic remain intact;
- shared support-host resolver is imported, not duplicated;
- restraint Preview repair must reuse the same pure support-restraint geometry/projection authority as normal rendering;
- no canonical topology mutation is authorized from DOM input, Stage, Preview, Validate, renderer, or pointer movement.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `PR1033@68444777aeb01f165c987975ef1555bb1b7a9a1b` | predecessor exact head; 17/17 triggered workflows PASS |
| `85e67606b588809c96b03c8801a783edaf09620d` | PR1054 pre-report source/test candidate; static review only |
| `7d3002df5915027f607a7db10b2f75049fe14c94` | pre-qualification report-sync head; zero pull-request workflow runs |
| `57df6f795a8ca82a3d3b0f794284871d929b5f76` | browser qualification source authored |
| `ff96666fccb8ff6bc25be9231228fd750485022d` | run `31576192230`: Node 11/13, Chromium skipped |
| `1aba6173983c7b0b090a0a67e11eac3e06ed7ca2` | run `31576547806`: Node 13/13; browser baseline evidence mismatch; artifact `9133425605` |
| `20630072aa59f274b538335c7a6c5f4d534f617a` | run `31576864213`: Node 13/13; browser reached Preview and exposed missing restraint ghost; artifact `9133534883` |
| next Preview-repaired head | NOT_RUN until ISS-1054-06 source + regression test are committed |

## Handover

Repair only ISS-1054-06 by composing the changed candidate support-restraint projection into the existing Table Preview ghost. Re-run exact-head qualification and diagnose any later browser result without weakening guards. Preserve imported restraint and parent-support-policy custody. Qualify the final report head, then promote the stack in order #1054 -> #1061 -> #1066.
