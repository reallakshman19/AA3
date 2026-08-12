# PR 1054 Work Report — Certified Support Restraint Recovery

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1054 — `feat(3d-edit): recover certified support restraint editing` |
| Branch | `agent/certified-support-movement-semantics` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap | `4140ffbd147b9cc73655d00e8264f8fb774869ff` — empty tree-equivalent commit |
| Implementation/test head | `85e67606b588809c96b03c8801a783edaf09620d` |
| Mission | Recover the already-qualified support **restraint-property** edit onto current main while keeping support placement/movement fail closed. |
| Status | DRAFT / source recovery complete / static audit complete / exact-head execution unavailable |
| Pending siblings | #1051 TEE/reducer and #1053 NODE_POSITION remain draft/unmerged with exact-head empirical execution `NOT_RUN`; this PR does not depend on their source. |

## Preserved Authority

The recovered operation is intentionally narrow:

`exact SUPPORT row -> exact support + node + host custody -> explicit full restraint override -> governed SUPPORT_RESTRAINT intent -> UPDATE_SUPPORT_RESTRAINT command -> candidate Preview -> validation -> certified transaction -> canonical topology -> existing journal Undo/Redo`

Still prohibited:

- editing `stationMm` or host attachment;
- moving a support node or support placement;
- implicit support follow/restation when parent geometry moves;
- direct support/canonical writes from Table/DOM/renderer;
- replacing imported `support.restraints` evidence;
- mutation during input, Stage, Preview or Validate;
- a second support-specific history stack;
- weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`;
- depending on unmerged #1051/#1053 source.

## S1 Audit — COMPLETE

### Tested predecessor

PR #1033 (`feat(3d-edit): certify support restraint editing`) implemented the same narrow operation. Its exact head `68444777aeb01f165c987975ef1555bb1b7a9a1b` triggered **17 workflows and all 17 completed successfully**, including main-gate, Table Slices 1/2/3/6/7/8, R1 reachability, Tool Audit, SJSON render/interaction, authoring suites, non-FEA, and catalogue exact-head qualification.

PR #1033 was stacked on an older node-position branch and never merged. Its boundary remains correct: `UPDATE_SUPPORT_RESTRAINT` changes family/direction/gap/travel only and **does not change station, host attachment, or node geometry**.

### Current-main reconciliation

Merged #1036 introduced shared support-host authority `resolveTopologyEditSupportHostEdge()` and the final `SUPPORT_GEOMETRY_POLICY_REQUIRED` backstop. PR1054 therefore does **not** recover #1033's private host lookup. The current command requires the #1036 resolver to return exact `RESOLVED` host custody before command resolution/planning.

Merged #1041 later strengthened valve catalogue and target-DN custody. Those current-main changes are preserved in the manually merged Table intent/runtime files. PR1054 does not widen or replace valve authority.

### Canonical/source custody

The Table support projection exposes:

- `hostEntityId` — read-only;
- `stationMm` — canonical/source-observed and read-only;
- `supportType`, `direction`, `gapMm`, `travelMm` — one compound certified restraint edit.

The command writes a separate canonical `support.restraint` marked `CERTIFIED_TABLE_OVERRIDE` while retaining imported `support.restraints`. `supportRestraintRows()` prefers the override only when that marker is present.

## S2 Semantic Decision — COMPLETE

### Authorized operation: SUPPORT_RESTRAINT

Exact requested fields:

- `family` — explicit certified family token;
- `direction` — explicit direction token; optional only for `ANCHOR`;
- `gapMm` — optional finite non-negative number;
- `travelMm` — optional finite non-negative number.

Exact target custody:

- one canonical support revision;
- its canonical node revision when `nodeId` is present;
- exactly one shared-resolver host edge revision.

Fail closed on non-SUPPORT target, unsupported family/direction, missing direction outside ANCHOR, negative/non-finite gap/travel, unresolved/ambiguous host authority, stale support/node/host revision, candidate delta outside the target support, or loss/replacement of imported restraint evidence.

### Explicitly deferred

- support station editing/restationing;
- host rebinding;
- support world-position relocation;
- parent-geometry host-follow translation;
- automatic support movement during NODE_POSITION/PIPE_LENGTH/other geometry edits.

Merged #1036 remains final for all geometry-dependent support movement: parent geometry fails closed until a separate placement policy is certified.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Existing support-dependent parent geometry blocking remains final. |
| DEC-1054-02 | Scope | ACCEPTED NARROW | Recover restraint-property editing only; no placement semantics. |
| DEC-1054-03 | Integration | ACCEPTED | Build from current main only; #1051/#1053 remain independent drafts. |
| DEC-1054-04 | Predecessor | ACCEPTED | Reuse byte-identical tested #1033 modules where later merged PRs did not touch them. |
| DEC-1054-05 | Host authority | ACCEPTED | Current command uses #1036 `resolveTopologyEditSupportHostEdge()` and requires `RESOLVED`. |
| DEC-1054-06 | Evidence | ACCEPTED | Imported restraint evidence remains; only marked override becomes active. |
| ISS-1054-01 | Current-main regression | RESOLVED IN SOURCE | Added focused rejection when an explicit support host token is unresolved; no override is written. |
| RISK-1054-01 | Current-head execution | OPEN | Historical predecessor is green; current-main adaptation has no exact-head runner. |
| RISK-1054-02 | Sibling overlap | OPEN / MANAGEABLE | #1051 also edits Table cell/runtime wiring. Whichever merges second must rebase the small overlap. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE

PR opened from current main with an empty bootstrap; this numbered report was the first changed file.

### S1 — Canonical/support authority audit — COMPLETE

Recovered #1033 authority and reconciled it with merged #1036/#1041.

### S2 — Semantic decision — COMPLETE

Only SUPPORT_RESTRAINT is authorized; placement remains deferred.

### S3 — Current-main contract recovery — COMPLETE

Recovered command contract/resolver/reducer/effect dispatch, restraint-family geometry, Table columns/planner/batch authority, and added the current-main shared-host strengthening.

### S4 — UI/test recovery — COMPLETE IN SOURCE

Recovered the compound support editor and focused command/Table transaction tests. Current #1036 capability coverage now expects restraint fields to require explicit compound input while station remains read-only. Added shared-host unresolved regression.

### S5 — execution/merge custody — BLOCKED ON EXACT-HEAD EXECUTION

The current implementation/test candidate `85e67606b588809c96b03c8801a783edaf09620d` is mergeable against unchanged main, has zero reviews/threads/comments, zero workflow runs, and zero commit statuses. Historical #1033 execution is retained as predecessor evidence only; it is not represented as current-head PASS.

## Changed-File Ledger

Actual PR diff is exactly these 21 paths:

1. `agents/PR1054_workreport.md`
2. `src/workspace/topology-edit/support-restraint-family.js`
3. `src/workspace/topology-edit/topology-edit-support-restraint-command.js`
4. `src/workspace/topology-edit/topology-edit-command-contract.js`
5. `src/workspace/topology-edit/topology-edit-command-resolver.js`
6. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
7. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
8. `src/workspace/topology-edit/table/topology-edit-table-support-restraint-contract.js`
9. `src/workspace/topology-edit/table/topology-edit-table-tee-reducer-contract.js` — extraction-only line-budget move; no M10 semantic change
10. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
11. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
12. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
13. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
14. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
15. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
16. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
17. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
18. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
19. `tests/topology-edit-capability-authority.test.mjs`
20. `tests/topology-edit-support-restraint-command.test.mjs`
21. `tests/topology-edit-table-support-restraint.test.mjs`

`src/workspace/topology-edit/professional/topology-edit-support-geometry-dependency.js` was reused as authority and **not modified**.

## Static / Source Audit

- Manually merged current-main modules (`topology-edit-table-intent.js`, `topology-edit-table-edit-capability.js`, Table cell/runtime wiring, support command) are directly confirmed below 300 physical lines.
- Other recovered production files are byte-identical to the #1033 exact head that passed the repository guard/workflow matrix.
- `topology-edit-table-tee-reducer-contract.js` is an extraction-only move required to preserve the Table-intent line budget; TEE reducer semantics are unchanged.
- Properties view renders both existing NODE_POSITION and recovered SUPPORT_RESTRAINT editors.
- Current valve catalogue selector and exact target-DN fail-closed logic remain intact.
- Shared support host resolver is imported, not duplicated.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | current integration base, unchanged during PR1054 source recovery |
| `4140ffbd147b9cc73655d00e8264f8fb774869ff` | empty bootstrap, zero changed files |
| `PR1033@68444777aeb01f165c987975ef1555bb1b7a9a1b` | predecessor exact head; 17/17 triggered workflows PASS |
| `85e67606b588809c96b03c8801a783edaf09620d` | current-main source/test candidate; static audit complete; empirical execution NOT_RUN |
| report-sync head | report-only change after implementation candidate |

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| exact PR1054 Node/browser execution | NOT_RUN | `.github/workflows` retired by #1043; no local checkout/runner available |
| support station/host relocation | NOT_AUTHORIZED | separate placement semantics required |
| parent-geometry support follow | NOT_AUTHORIZED | #1036 fail-closed policy remains final |
| #1051/#1053 combined state | NOT_RUN | sibling drafts remain unmerged |

## Handover

1. Keep PR1054 draft/unmerged until exact-head execution is available or the qualification limitation is explicitly accepted.
2. Do not interpret historical #1033 PASS as current-head PASS.
3. If #1051 merges before #1054, rebase the small Table cell/runtime overlap and retain both feature additions.
4. If #1054 merges before #1051, #1051 must perform the reciprocal rebase.
5. Future support **placement/movement** semantics must be a separate report/PR; do not extend SUPPORT_RESTRAINT into station/host mutation.
