# PR 1054 Work Report — Certified Support Restraint Recovery

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1054 — `design(3d-edit): certify support movement semantics` |
| Branch | `agent/certified-support-movement-semantics` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap | `4140ffbd147b9cc73655d00e8264f8fb774869ff` — empty tree-equivalent commit |
| Mission | Recover the already-qualified support **restraint-property** edit onto current main while keeping support placement/movement fail closed. |
| Status | DRAFT / S1 audit complete / S2 semantic decision complete / implementation authorized |
| Pending sibling qualifications | #1051 TEE/reducer and #1053 NODE_POSITION remain draft/unmerged with exact-head empirical execution `NOT_RUN`; this PR does not depend on their source. |

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

### Tested predecessor discovered

PR #1033 (`feat(3d-edit): certify support restraint editing`) already implemented the exact narrow operation needed here. Its exact head `68444777aeb01f165c987975ef1555bb1b7a9a1b` triggered **17 workflows and all 17 completed successfully**, including:

- `main-gate`;
- Table Slices 1, 2, 3, 6, 7 and 8;
- 3D Edit R1 Real User Reachability;
- 3D Edit Tool Audit;
- SJSON Render and Interaction Authority;
- Authoring Foundation;
- Inline Component, Valve Assembly and Tee/Olet authoring;
- non-FEA input/check/load calculation;
- Catalogue Pipe Segment Exact Head.

PR #1033 was stacked on the node-position branch and never merged. Its explicit boundary was already correct: `UPDATE_SUPPORT_RESTRAINT` changes family/direction/gap/travel only and **does not change station, host attachment or node geometry**.

### Current-main changes since #1033

Merged #1036 introduced the shared support-host authority `resolveTopologyEditSupportHostEdge()` and the final `SUPPORT_GEOMETRY_POLICY_REQUIRED` backstop. Therefore PR1054 will **not** copy #1033's private host-edge resolver. The recovered command will reuse the #1036 shared resolver and require exact `RESOLVED` host custody before staging/planning a support restraint override.

Merged #1041 later touched Table intent/runtime wiring for valve catalogue custody. Those changes remain authoritative; PR1054 will merge the support-restraint additions into the current files rather than replacing them with #1033-era versions.

### Canonical/source custody

Current Table support projection exposes:

- `hostEntityId` — canonical/read-only;
- `stationMm` — canonical or source-observed/read-only;
- `supportType`, `direction`, `gapMm`, `travelMm` — currently visible but deliberately uncertified.

The recovered command writes a separate canonical `support.restraint` override marked `CERTIFIED_TABLE_OVERRIDE` while retaining imported `support.restraints` evidence. `supportRestraintRows()` prefers the override only when the marker is present; source evidence is otherwise unchanged.

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

Fail closed on:

- non-SUPPORT Table target;
- unsupported family/direction;
- missing direction outside ANCHOR;
- negative/non-finite gap or travel;
- unresolved or ambiguous host authority;
- stale support/node/host revision;
- any candidate topology delta outside the one target support;
- loss/replacement of imported restraint evidence.

### Explicitly deferred operations

- `RESTATION_SUPPORT_ON_HOST` — NOT AUTHORIZED;
- support host rebinding — NOT AUTHORIZED;
- support world-position relocation — NOT AUTHORIZED;
- parent-geometry `FOLLOW_HOST_TRANSLATION` — NOT AUTHORIZED;
- automatic support movement during NODE_POSITION/PIPE_LENGTH/other geometry edits — NOT AUTHORIZED.

The merged #1036 fail-closed policy remains final for all of these.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1054-01 | Safety | ACCEPTED | Existing support-dependent parent geometry blocking remains final. |
| DEC-1054-02 | Scope | SUPERSEDED NARROWER | Do not solve placement in this PR; recover restraint-property editing only. |
| DEC-1054-03 | Integration | ACCEPTED | Build from current main only; #1051/#1053 remain independent drafts. |
| DEC-1054-04 | Predecessor | ACCEPTED | PR #1033 is the tested implementation authority; recover its narrow semantics rather than inventing a new model. |
| DEC-1054-05 | Host authority | ACCEPTED | Replace #1033 private lookup with #1036 `resolveTopologyEditSupportHostEdge()` and require exact RESOLVED host custody. |
| DEC-1054-06 | Evidence | ACCEPTED | Imported `support.restraints` is retained; only marked `CERTIFIED_TABLE_OVERRIDE` becomes active override evidence. |
| RISK-1054-01 | Current-head execution | OPEN | #1033 has strong exact-head historical PASS evidence, but the current-main adaptation still needs its own execution before merge. |
| RISK-1054-02 | Sibling merge conflict | OPEN / MANAGEABLE | #1051 also edits Table cell/runtime wiring. PR1054 remains independent; whichever merges second must rebase those small wiring additions. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE

PR opened from current main with empty bootstrap; this report was the first changed file.

### S1 — Canonical/support authority audit — COMPLETE

Recovered PR1033 authority and reconciled it with merged #1036/#1041.

### S2 — Semantic decision — COMPLETE

Only `SUPPORT_RESTRAINT` is authorized. Placement/movement remains explicitly deferred.

### S3 — Current-main contract recovery — IN PROGRESS

Port the tested command/Table contracts with one deliberate strengthening: shared exact host resolution from #1036.

### S4 — UI/test recovery — PENDING

Recover the compound support editor and focused command/Table transaction tests. Preserve host/station read-only behavior.

### S5 — execution/merge custody — PENDING

Historical #1033 execution is evidence, not a substitute for exact PR1054 execution. If no current runner exists, leave PR1054 draft/unmerged with `NOT_RUN` current-head status.

## Authorized Changed-File Ledger

Registered before source modification:

1. `agents/PR1054_workreport.md`
2. `src/workspace/topology-edit/support-restraint-family.js`
3. `src/workspace/topology-edit/professional/topology-edit-support-geometry-dependency.js` — **read/reuse only; no change expected**
4. `src/workspace/topology-edit/topology-edit-support-restraint-command.js` — new
5. `src/workspace/topology-edit/topology-edit-command-contract.js`
6. `src/workspace/topology-edit/topology-edit-command-resolver.js`
7. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
8. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
9. `src/workspace/topology-edit/table/topology-edit-table-support-restraint-contract.js` — new
10. `src/workspace/topology-edit/table/topology-edit-table-tee-reducer-contract.js` — new, extraction-only line-budget move from current Table intent
11. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
12. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
13. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
14. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
15. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
16. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js` — new
17. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
18. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
19. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
20. `tests/topology-edit-capability-authority.test.mjs`
21. `tests/topology-edit-support-restraint-command.test.mjs` — new
22. `tests/topology-edit-table-support-restraint.test.mjs` — new

No other path is authorized without first updating this ledger.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | current integration base |
| `4140ffbd147b9cc73655d00e8264f8fb774869ff` | empty bootstrap, zero changed files |
| `PR1033@68444777aeb01f165c987975ef1555bb1b7a9a1b` | predecessor exact head; 17/17 triggered workflows PASS |
| PR1054 current-main adaptation | pending implementation/execution |

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| current-head support restraint execution | NOT_RUN | current-main adaptation not yet complete |
| support station/host relocation | NOT_AUTHORIZED | separate placement semantics required |
| parent-geometry support follow | NOT_AUTHORIZED | #1036 fail-closed policy remains final |
| #1051/#1053 combined state | NOT_RUN | sibling drafts remain unmerged |

## Next

1. Recover command/Table contracts using shared #1036 host resolution.
2. Recover compound editor and focused tests without enabling station/host edits.
3. Audit `<300` line budgets and current-main source overlap.
4. Seek exact-head execution; otherwise keep draft/unmerged and report `NOT_RUN` truthfully.
