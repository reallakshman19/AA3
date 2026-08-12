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
| Mission | Recover certified support restraint-property editing while keeping support placement/movement fail closed. |
| Engineering state | **EXACT-HEAD QUALIFICATION READY** |
| Current execution truth | Production visible-user Chromium qualification is authored and the PR is temporarily retargeted to the isolated runner base. Exact-head Node + Chromium execution is not yet represented as PASS. |
| Merge state | Draft / unmerged until exact-head Node + Chromium evidence is green and the final report-sync head is requalified. |

## Preserved Authority

The recovered operation is intentionally narrow:

`exact SUPPORT row -> exact support + node + host custody -> explicit full restraint override -> governed SUPPORT_RESTRAINT intent -> UPDATE_SUPPORT_RESTRAINT command -> candidate Preview -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo`

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

The command writes a separate canonical `support.restraint` marked `CERTIFIED_TABLE_OVERRIDE`; imported `support.restraints` remains retained evidence.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Parent geometry remains fail closed under #1036 support policy. |
| DEC-1054-02 | Scope | ACCEPTED NARROW | Restraint properties only; no placement semantics. |
| DEC-1054-03 | Host authority | ACCEPTED | Shared #1036 resolver only; exact `RESOLVED` required. |
| DEC-1054-04 | Evidence | ACCEPTED | Imported restraints retained; only marked override becomes active. |
| ISS-1054-01 | Current-main regression | RESOLVED IN SOURCE | Explicit unresolved host token rejects before override. |
| ISS-1054-02 | Qualification | **E2E AUTHORED / NOT_RUN** | `e2e/topology-edit-table-support-restraint.spec.js` uses the real Workspace -> XYZ fixture -> 3D Edit -> Engineering Table path, selects S-007 through a typed filter and visible Select action, edits real restraint controls, and drives Stage/Preview/Validate/Apply/Undo/Redo. Controller access is read-only evidence only. |
| RISK-1054-01 | Current-head execution | OPEN | Exact-head Node + Chromium execution is required before merge. |
| RISK-1054-02 | Sibling overlap | OPEN / MANAGEABLE | #1051 overlaps small Table wiring and must reconcile whichever merges second. |

## Browser Qualification Contract

The E2E proves or fails on all of the following without guard weakening:

1. real production UI loads the XYZ engineering fixture and opens Engineering Table;
2. typed `S-007` filtering selects exactly one canonical SUPPORT row through its visible Select action;
3. family/direction/gap/travel input changes are transient and preserve canonical hash, journal/ledger, active command IDs, session version, source hashes, and renderer count;
4. Stage produces one governed intent while canonical authority remains unchanged;
5. Preview produces a changed-support ghost/candidate without canonical mutation;
6. Validate reaches `READY_TO_APPLY` without canonical mutation;
7. Apply changes the target support to a `CERTIFIED_TABLE_OVERRIDE` restraint while imported restraint evidence remains unchanged;
8. support host identity and station remain unchanged;
9. source semantic/byte hashes remain unchanged;
10. Undo restores exact baseline canonical/ledger/command state and removes the override;
11. Redo restores exact applied canonical/ledger/command state;
12. page/console diagnostics remain clean except known favicon noise;
13. no direct controller operation method is invoked as UI coverage.

## Qualification Harness

The isolated base branch `qualification/pr1054-exact-head` contains only `.github/workflows/pr1054-exact-head-qualification.yml`. The workflow:

- checks out `github.event.pull_request.head.sha` exactly;
- provisions Node 22 and real Chromium;
- syntax-checks the three focused Node files and browser spec;
- enforces `<300` physical lines on the new E2E;
- runs `git diff --check`;
- executes the three focused Node files;
- executes the production Chromium support-restraint lifecycle with trace-on and zero retries;
- uploads Playwright/test evidence plus the authored JSON qualification record.

The workflow file is not part of the PR1054 feature diff.

After a feature/test green run:

1. update this report with exact run/head/artifact evidence;
2. run the same gate again on the report-only head;
3. restore PR1054 to `main`;
4. re-check raw GitHub mergeability, reviews/comments, exact changed-file ledger, and current main;
5. merge only with `expected_head_sha` pinned to the qualified final head.

## Exact Changed-File Ledger

The current feature diff is exactly **22** paths:

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
20. `tests/topology-edit-capability-authority.test.mjs`
21. `tests/topology-edit-support-restraint-command.test.mjs`
22. `tests/topology-edit-table-support-restraint.test.mjs`

The temporary qualification workflow is isolated on `qualification/pr1054-exact-head` and is not part of this ledger.

## Static / Source Audit

- manually reconciled current-main modules remain below the repository `<300` physical-line gate;
- recovered production modules were byte-identical to tested #1033 where later merged work did not touch them;
- `topology-edit-table-tee-reducer-contract.js` is extraction-only line-budget work;
- current valve catalogue selector and target-DN fail-closed logic remain intact;
- shared support-host resolver is imported, not duplicated;
- no canonical topology mutation is authorized from DOM input or pointer movement.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `PR1033@68444777aeb01f165c987975ef1555bb1b7a9a1b` | predecessor exact head; 17/17 triggered workflows PASS |
| `85e67606b588809c96b03c8801a783edaf09620d` | PR1054 pre-report source/test candidate; static review only |
| `7d3002df5915027f607a7db10b2f75049fe14c94` | pre-qualification report-sync head; zero pull-request workflow runs |
| `57df6f795a8ca82a3d3b0f794284871d929b5f76` | browser qualification source authored; exact-head execution NOT_RUN at report time |
| current report-sync head | trigger exact-head Node + Chromium qualification |

## Handover

Do not merge historical evidence as if it were current-head evidence. Complete the exact-head Node + Chromium gate, preserve imported restraint and parent-support-policy custody, qualify the final report head, and only then promote the stack in order #1054 -> #1061 -> #1066.
