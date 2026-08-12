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
| Browser qualification source | `57df6f795a8ca82a3d3b0f794284871d929b5f76` |
| Preview production repair source | `414985e617bd90024d993f11961cec353af515a8` |
| Current regression-test head | `41fb076e28dfd9d113cd8c26f7e0988bb2303356` |
| Mission | Recover certified support restraint-property editing while keeping support placement/movement fail closed. |
| Engineering state | **EMPIRICAL REGRESSION TEST REPAIR IN PROGRESS** |
| Current execution truth | Run `31577391318` checked out exact head `41fb076e…`; exact-head/source/line checks PASS; focused Node **13/14 PASS**; only the newly added ghost regression test failed because it expected the restraint-direction segment to pick the support ID instead of its established deterministic restraint ID. Chromium correctly skipped. |
| Merge state | Draft / unmerged until exact-head Node + Chromium evidence is green and the final report-sync head is requalified. |

## Preserved Authority

The recovered operation remains intentionally narrow:

`exact SUPPORT row -> exact support + node + host custody -> explicit full restraint override -> governed SUPPORT_RESTRAINT intent -> UPDATE_SUPPORT_RESTRAINT command -> candidate Preview ghost -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo -> Three projection`

Still prohibited:

- editing `stationMm` or host attachment;
- moving support placement or a support node as a proxy;
- implicit support follow/restation when parent geometry moves;
- direct support/canonical writes from Table/DOM/renderer;
- replacing imported `support.restraints` evidence;
- canonical mutation during input, Stage, Preview or Validate;
- a second support-specific history stack;
- weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`;
- depending on unmerged sibling source.

## Current-Main / Stack Reconciliation

PR #1033 exact head `68444777aeb01f165c987975ef1555bb1b7a9a1b` had 17/17 triggered workflow PASS; that is predecessor evidence only.

Merged #1036 remains the sole support-host authority through `resolveTopologyEditSupportHostEdge()` and the final `SUPPORT_GEOMETRY_POLICY_REQUIRED` backstop. PR1054 requires exact `RESOLVED` host custody and does not restore a private host lookup.

Merged #1041 catalogue/target-DN custody remains intact. Support restraint editing does not widen valve or parent-geometry authority.

Current `main` observed at `6463b39866f68eb6476bfa41764538eb19f8b9f9` was 83 commits ahead of the original base. The intervening current-main file set observed during this qualification was concentrated in LFEA/publication work and did not overlap PR1054's topology-edit paths. Raw GitHub PR state before temporary qualification retarget reported `mergeable: true`, `rebaseable: true`, `mergeable_state: clean`.

## Certified SUPPORT_RESTRAINT Contract

Requested fields:

- `family` — required certified family token;
- `direction` — required except for `ANCHOR`;
- `gapMm` — optional finite non-negative mm;
- `travelMm` — optional finite non-negative mm.

Dependency custody:

- one canonical support revision;
- its canonical node revision when present;
- exactly one shared-resolver host-edge revision.

Fail closed on non-SUPPORT target, unsupported family/direction, missing non-ANCHOR direction, negative/non-finite gap/travel, unresolved/ambiguous host authority, stale support/node/host revision, candidate delta outside the target support, or loss/replacement of imported restraint evidence.

The command writes a canonical `support.restraint` marked `CERTIFIED_TABLE_OVERRIDE`; imported `support.restraints` remains retained evidence. A pre-existing imported `support.restraint` object is not a certified override unless `support.restraintAuthority === 'CERTIFIED_TABLE_OVERRIDE'`.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Parent geometry remains fail closed under #1036 support policy. |
| DEC-1054-02 | Scope | ACCEPTED NARROW | Restraint properties only; no placement semantics. |
| DEC-1054-03 | Host authority | ACCEPTED | Shared #1036 resolver only; exact `RESOLVED` required. |
| DEC-1054-04 | Evidence | ACCEPTED | Imported restraints retained; only marked override becomes active. |
| ISS-1054-01 | Current-main regression | RESOLVED IN SOURCE | Explicit unresolved host token rejects before override. |
| ISS-1054-02 | Qualification | E2E AUTHORED / EXECUTION IN PROGRESS | Production browser spec uses real Workspace -> XYZ fixture -> 3D Edit -> Engineering Table -> S-007 -> visible restraint controls -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo. Controller access is read-only evidence only. |
| ISS-1054-03 | Test expectation | RESOLVED / RUN 2+ PASS | `LOCAL_Y` expectation now matches unchanged deterministic `hostFrame()` convention. |
| ISS-1054-04 | Test expectation | RESOLVED / RUN 2+ PASS | Table plan expectation now includes established deterministic `sequence: 0`; planner unchanged. |
| ISS-1054-05 | Browser evidence interpretation | RESOLVED / RUN 3 PROGRESSED | E2E classifies an override only under explicit `CERTIFIED_TABLE_OVERRIDE` authority, preserving imported baseline restraint. |
| ISS-1054-06 | Preview correctness | RESOLVED IN SOURCE / REGRESSION RUNNING | Table Preview now composes changed-support restraint projection through existing `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()` using approved `supportMarkerSize`; only changed support IDs are ghosted; canonical state remains untouched. |
| ISS-1054-07 | Regression expectation | **OPEN / TEST-ONLY REPAIR AUTHORIZED** | Run `31577391318` passed 13/14 Node tests. The only failure was the new ghost regression assertion: expected `ghost.segments[0].pickTarget.objectId === 'support:s1'`, actual deterministic value `restraint:table:dca482e3b29da93c`. Existing projection contract intentionally gives support marker `objectKind:'support', objectId:supportId`, while a `RESTRAINT_DIRECTION` segment uses `objectKind:'restraint', objectId:restraintId` and separately carries `supportId`. Repair only `tests/topology-edit-table-support-restraint.test.mjs` to assert the marker's support identity and the segment's restraint identity/support cross-reference. Do not change production projection identity. |
| RISK-1054-01 | Current-head execution | OPEN | Exact-head Chromium lifecycle must reach Apply/Undo/Redo before merge. |
| RISK-1054-02 | Sibling overlap | OPEN / MANAGEABLE | Upper stack #1061 also touches Table workflow and must reconcile/requalify after #1054 promotion. |

## Browser Qualification Contract

The production E2E must prove:

1. real XYZ engineering fixture loads and Engineering Table opens;
2. typed `S-007` filtering selects one canonical SUPPORT row through visible Select;
3. restraint input is transient and preserves canonical/journal/source/renderer authority;
4. Stage produces one governed intent without canonical mutation;
5. Preview produces a visible changed-support restraint ghost without canonical mutation;
6. Validate reaches `READY_TO_APPLY` without canonical mutation;
7. Apply creates the requested `CERTIFIED_TABLE_OVERRIDE` while imported restraint evidence stays unchanged;
8. host identity and station stay unchanged;
9. source semantic/byte hashes stay unchanged;
10. Undo restores exact baseline canonical/ledger/command state and imported restraint state;
11. Redo restores exact applied canonical/ledger/command state;
12. page/console diagnostics stay clean except known favicon noise;
13. no direct controller operation method is invoked as UI coverage.

## Qualification Harness

The isolated base branch `qualification/pr1054-exact-head` contains only `.github/workflows/pr1054-exact-head-qualification.yml`. The workflow checks out `github.event.pull_request.head.sha`, provisions Node 22 and real Chromium, syntax-checks qualification sources, enforces the E2E `<300` line gate, runs `git diff --check`, executes the three focused Node files, executes real Chromium with trace-on/zero retries, and uploads evidence. The workflow is not in the feature diff.

## Executed Exact-Head Gates

### Run 1 — Node FAIL, Chromium skipped

Run `31576192230`, job `94048733399`, head `ff96666fccb8ff6bc25be9231228fd750485022d`:

- setup/source/syntax/line/`git diff --check`: PASS
- focused Node: **11/13 PASS**
- stale failures: LOCAL_Y sign expectation and omitted deterministic `sequence: 0`
- Chromium skipped.

### Run 2 — Node PASS, Chromium baseline-evidence mismatch

Run `31576547806`, job `94049913490`, head `1aba6173983c7b0b090a0a67e11eac3e06ed7ca2`:

- setup/source/line: PASS
- focused Node: **13/13 PASS**
- real Chromium loaded XYZ, opened Table, filtered/select S-007
- failed before edit on imported-restraint/override evidence interpretation
- artifact `9133425605`, size `2,012,202`, SHA256 `787bf6d1d578c424a15442cee5046a46b241d3da5ab57c8028273c88221143dc`.

### Run 3 — Node PASS, Chromium exposed missing Preview ghost

Run `31576864213`, job `94050832026`, head `20630072aa59f274b538335c7a6c5f4d534f617a`:

- setup/source/line: PASS
- focused Node: **13/13 PASS**
- real Chromium loaded XYZ, opened Table, selected S-007, edited controls, staged one intent and entered Preview
- Preview candidate existed but generic ghost group remained empty
- artifact `9133534883`, size `2,336,877`, SHA256 `b906126882d1002552535fc3335ca28263fce9a6e0254071b818b5a822e3d53d`.

### Run 4 — Preview production repair present; new regression expectation FAIL

Run `31577391318`, job `94052525630`, exact head `41fb076e28dfd9d113cd8c26f7e0988bb2303356`:

- exact checkout: PASS
- Node 22 setup / `npm ci` / Chromium installation: PASS
- exact-head assertion and all four syntax checks: PASS
- E2E `<300` line gate: PASS
- `git diff --check`: PASS
- focused Node: **14 tests / 13 pass / 1 fail**
- all existing command/capability/Table atomic lifecycle tests: PASS
- only failure: newly added Preview ghost identity assertion expected support ID on restraint-direction segment; actual deterministic restraint ID `restraint:table:dca482e3b29da93c`
- projection contract confirms marker identity is support-level and direction segment identity is restraint-level with support cross-reference
- Chromium: SKIPPED because Node gate failed
- no Playwright artifact existed; upload step correctly warned no files were available.

This run does not invalidate the production ghost repair. The next source change is restricted to ISS-1054-07 test expectations.

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

The temporary qualification workflow remains isolated and is not in this ledger.

## Static / Source Audit

- manually reconciled current-main modules remain below repository `<300` physical-line gate;
- new E2E line gate has passed each exact-head run;
- current valve catalogue selector and target-DN fail-closed logic remain intact;
- shared support-host resolver is imported, not duplicated;
- Preview reuses the normal pure support-restraint geometry/projection authority;
- no canonical mutation is authorized from DOM input, Stage, Preview, Validate, renderer, or pointer movement.

## Next Gate

1. Repair only ISS-1054-07 in the regression test: support marker must pick `support:s1`; restraint direction segment must pick its deterministic restraint ID and carry `supportId:'support:s1'`.
2. Re-run exact-head Node + Chromium qualification.
3. If full feature/test head is green, update this report with exact run/artifact evidence.
4. Exact-head qualify that report-only final head again.
5. Restore PR1054 to `main`, re-check raw mergeability/current main/reviews/comments/23-file ledger, and merge only with the qualified expected head SHA.
6. Reconcile/requalify upper stack in order #1061 then #1066.
