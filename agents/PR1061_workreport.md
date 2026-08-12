# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Status | DRAFT / implementation + source qualification in progress |
| Empirical execution | NOT_RUN; repository workflows were retired and this agent still has no exact-head local runner. |

## Required Authority Path

`exact SUPPORT row -> shared host resolution -> explicit station draft -> governed SUPPORT_PLACEMENT intent -> deterministic plan -> Preview ghost -> validation -> certified transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection`

Canonical topology remains engineering authority. Meshes and workspace entities are projections/writeback only.

## Certified Semantics

Authorized operation: **explicit same-host station relocation**.

- host identity comes only from `resolveTopologyEditSupportHostEdge()`;
- station is finite millimetres from canonical host `FROM`;
- initial host classes are straight `PIPE` / `STRAIGHT` / `STRAIGHT_ELEMENT` only;
- `0 <= stationMm <= hostLengthMm`, no-op rejected;
- origin is exact interpolation on the canonical host centerline;
- command changes one support record only;
- support + host edge + both host endpoint node revisions are captured;
- imported attachment/source evidence is retained separately from `placementOverride`;
- existing certified journal owns Undo/Redo.

Still prohibited: host rebinding, arbitrary XYZ movement, moving pipe nodes as a support proxy, direct Three/entity authority, automatic support follow/restation during PIPE length/NODE_POSITION/valve/slope/split/trim/connected-run, weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`, or any support-specific history stack.

## Architecture Findings

1. Legacy support reshape receives exact attachment authority but discards placement facts and retains an intentionally approximate endpoint `nodeId` for mid-span attachments.
2. Production demo/XYZ support records contain no `STATION_MM`; exact attachment projected-point/segment evidence is required for truthful station editing.
3. SJSON fidelity controller enriches initial supports with exact attachment origins; commit/reopen dispatch now also retains these facts and rehydrates certified placement audit fields.
4. SJSON canonical construction now uses the dispatch builder before the existing exact-origin enrichment, so certified audit custody survives refresh/reopen.
5. Generic support rendering historically prefers `support.nodeId`; certified override precedes it only when present.
6. SJSON support grouping prefers source APOS/POS; governed edit projection uses an ephemeral dataset clone with certified APOS only.
7. Generic Table Preview ghost filtering does not include separately-rendered SJSON supports. Candidate visual derivation can also temporarily publish the candidate as the normal support projection. Support-placement Preview therefore needs an explicit support ghost marker and must restore the live support projection to current canonical state before rendering that ghost.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| ISS-1061-01 | Correctness | RESOLVED IN SOURCE | Exact attachment placement facts are retained by live dispatch construction; SJSON build/rebuild now uses the same wrapper. No new attachment inference was introduced. |
| ISS-1061-02 | Preview correctness | OPEN / FIX AUTHORIZED | Support placement candidate can bypass the generic ghost packet because SJSON supports are a separate governed projection. Table workflow must render an explicit candidate support ghost and restore current canonical support projection after candidate derivation. |
| DEC-1061-01 | Semantics | ACCEPTED | Same-host station relocation is the only movement policy in this PR. |
| DEC-1061-02 | Safety | ACCEPTED | Parent geometry remains blocked; no support-follow policy is introduced. |
| DEC-1061-03 | Evidence | ACCEPTED | Declared station, attachment segment and projected-point evidence must agree or fail closed. |
| DEC-1061-04 | Curved hosts | ACCEPTED FAIL-CLOSED | No chord-based station approximation for bends/curved fittings. |
| DEC-1061-05 | Durable writeback | ACCEPTED | Certified placement persists as edit-audit attributes + committed support center; source evidence is not overwritten. |
| DEC-1061-06 | SJSON projection | ACCEPTED | Certified APOS is injected only into an ephemeral governed projection dataset. |
| RISK-1061-01 | Execution | OPEN | New source/tests have not executed on exact head. |

## Stage Status

### S0 — report-first custody — COMPLETE
Numbered report was the first changed file after empty bootstrap.

### S1 — architecture/placement audit — COMPLETE
Canonical host, attachment, projection, writeback and Table seams are mapped.

### S2 — pure command authority — SOURCE COMPLETE / NOT_RUN
Pure placement context, governed payload, target resolution, reducer, strict effect validation and stale host/support custody are implemented. Focused command tests authored.

### S3 — Table intent/planner/UI — SOURCE COMPLETE / NOT_RUN
`SUPPORT_PLACEMENT` intent, planner, composite allowlist, capability, station editor and Stage-time revalidation are implemented. Input/Stage remain canonical no-ops.

### S4 — projection/writeback — IN PROGRESS
Generic support glyphs, Table station projection, durable writeback/rehydration, SJSON canonical rebuild and ephemeral APOS projection are implemented. Explicit Preview ghost restoration is the remaining source item.

### S5 — qualification/closure — PENDING
Command, Table transaction and writeback tests are authored. Focused production Playwright S-007 qualification is next. Empirical status remains NOT_RUN.

## Authorized Changed-File Envelope

- `agents/PR1061_workreport.md`
- `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`
- new `src/workspace/topology-edit/topology-edit-support-placement.js`
- new `src/workspace/topology-edit/topology-edit-support-placement-command.js`
- `src/workspace/topology-edit/topology-edit-command-contract.js`
- `src/workspace/topology-edit/topology-edit-command-resolver.js`
- `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
- `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
- `src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js`
- `src/workspace/topology-edit/support-restraint-family.js`
- `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
- new `src/workspace/topology-edit/table/topology-edit-table-support-placement-contract.js`
- `src/workspace/topology-edit/table/topology-edit-table-columns.js`
- `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
- `src/workspace/topology-edit/table/topology-edit-table-intent.js`
- `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
- `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
- `src/workspace/topology-edit/table/topology-edit-table-projection.js`
- new `src/workspace/viewport-productivity/topology-edit-table-support-placement-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
- `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
- `tests/topology-edit-support-placement-command.test.mjs`
- `tests/topology-edit-table-support-placement.test.mjs`
- `tests/topology-edit-support-placement-writeback.test.mjs`
- planned `e2e/topology-edit-table-support-placement.spec.js`

No geometry planner or #1036 support-dependency module is authorized for weakening/modification.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| PR1054 base `7d3002df5915027f607a7db10b2f75049fe14c94` | restraint source complete; exact-head execution NOT_RUN |
| bootstrap `da0fb665a3ca58788fad83c96ca27b0938d8d083` | empty tree-equivalent commit |
| current PR1061 implementation | static review only; no empirical PASS claimed |

## Next

1. Close `ISS-1061-02` with an explicit candidate support ghost and canonical support-projection restore.
2. Author focused production Playwright path on XYZ S-007 / straight host P-011.
3. Audit line budgets, changed-file ledger, source-only syntax risks, reviews and mergeability.
4. Seal report/PR body and keep draft if exact-head execution is still unavailable.
