# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Mission | Certify one explicit support placement operation along the support's already-resolved host edge, without authorizing automatic parent-geometry follow or host rebinding. |
| Status | DRAFT / report-first / architecture audit in progress |
| Empirical execution | NOT_RUN until an exact-head runner is available; retired workflows are not to be restored solely for this slice. |

## Required Authority Path

`exact SUPPORT row -> exact shared host resolution -> explicit station draft -> governed SUPPORT_STATION intent -> deterministic same-host placement plan -> candidate Preview -> validation -> certified transaction -> canonical support placement override -> existing journal Undo/Redo -> Three/support projection`

Canonical topology remains the engineering authority. The support entity/mesh is projection only.

## Semantic Decision

### Authorized

**Explicit same-host station relocation.**

- The support keeps the exact host edge resolved by `resolveTopologyEditSupportHostEdge()`.
- The user supplies one finite station in millimetres measured from the canonical host edge `FROM` node.
- Station must satisfy `0 <= stationMm <= current host length` and must materially change the effective support placement.
- The effective origin is deterministically interpolated on the exact host centerline.
- The command changes exactly one canonical support record and no node/edge/junction/boundary/rigid/bend record.
- Imported attachment origin, segment parameter, source geometry and source attachment evidence remain retained as prior/source authority; certified placement is a distinct marked override.
- Host edge/support revisions are captured and stale changes fail closed.
- Undo/Redo uses the existing journal only.

### Still prohibited

- host rebinding;
- arbitrary world XYZ support movement;
- moving a pipe node to move a support;
- direct support entity/Three writes as engineering authority;
- changing attachment-model source evidence;
- automatic support follow/restation during PIPE_LENGTH, NODE_POSITION, valve F2F, slope, split, trim, connected-run, or other geometry edits;
- weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`;
- a second support-specific Undo stack.

Parent geometry therefore remains fail-closed even after this PR. A later coordinated geometry+support policy would have to be separately certified.

## Architecture Audit Findings

1. `enrichCanonicalSupportsWithExactOrigins()` already retains exact attachment-projected support origin plus `originAuthority`, `attachmentId`, `attachmentSegmentParameter`, and attachment distance. This is imported placement evidence and must not be overwritten silently.
2. The attachment model exposes `projectedPointCanonical` and normalized `segmentParameter`; these are evidence, not command authority.
3. `resolveTopologyEditSupportHostEdge()` is the merged #1036 shared host authority and must remain the sole host resolver.
4. Current source writeback translates support entities using `support.nodeId`. This is unsuitable for certified mid-span relocation because geometric attachments can use an approximate endpoint node; explicit placement must instead project from the certified support placement override.
5. Support glyph materialization consumes an explicit overlay origin; the engineering change therefore belongs upstream in canonical/support projection, never in Three.
6. Table currently exposes `stationMm` but PR #1054 deliberately leaves it read-only. This PR may make only that field editable through a compound governed support-placement intent.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1061-01 | Semantics | ACCEPTED | First certified movement policy is explicit same-host station relocation. |
| DEC-1061-02 | Safety | ACCEPTED | Parent geometry remains blocked; no automatic host-follow in this PR. |
| DEC-1061-03 | Authority | ACCEPTED | Imported origin/attachment evidence is retained; placement uses a marked certified override. |
| DEC-1061-04 | Host | ACCEPTED | Shared #1036 host resolver must return exactly `RESOLVED`; no alternate lookup. |
| DEC-1061-05 | Coordinates | ACCEPTED | Station is measured from canonical host `FROM`; origin is deterministic linear interpolation on that exact edge. |
| RISK-1061-01 | Curved hosts | OPEN / FAIL-CLOSED | A two-node canonical edge does not encode an independent support centerline parameterization for elbow arcs. Initial operation must reject non-straight/non-representable host types rather than project by chord. |
| RISK-1061-02 | Source writeback | OPEN | Existing support writeback uses resolved node and must be made override-aware without changing imported source authority before Apply. |
| RISK-1061-03 | SJSON grouped projection | OPEN | Source-validator support grouping can prefer source positions; edit projection must display certified override without rewriting source-only validation authority. |
| RISK-1061-04 | Execution | OPEN | No exact-head runner currently available. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE

This report is the first changed file after the empty bootstrap.

### S1 — Placement/projection audit — IN PROGRESS

Trace canonical support placement, shared host resolution, support overlay projection, source writeback, Table station projection and transaction changed-scope rules.

### S2 — Pure command + placement authority — PENDING

Introduce a small pure placement authority and governed command. Required failures: missing/ambiguous host, non-straight host, stale target, negative/out-of-range/no-op station, non-finite geometry, imported-evidence mutation, and any topology delta outside one support.

### S3 — Table intent/planner/UI — PENDING

Expose station editing only for exactly eligible SUPPORT rows. Input/Stage/Preview/Validate remain non-mutating. Stage re-resolves current host authority before creating the intent.

### S4 — Projection/writeback — PENDING

Three/support overlay consumes effective certified placement from canonical topology. Workspace source entity is patched only after accepted canonical transaction/writeback. Imported attachment/source evidence remains separately retained.

### S5 — Qualification/closure — PENDING

Focused Node contracts plus production Playwright source qualification for Stage/Preview/Validate no-op, ghost, Apply exact station, source custody, Undo/Redo exactness, stale host/support conflicts and parent-geometry block preservation. Empirical results remain `NOT_RUN` until actually executed.

## Authorized Changed-File Envelope

Production files may be modified only within this declared envelope unless this report is updated **before** an additional path is changed:

- `agents/PR1061_workreport.md`
- new `src/workspace/topology-edit/topology-edit-support-placement.js`
- new `src/workspace/topology-edit/topology-edit-support-placement-command.js`
- `src/workspace/topology-edit/topology-edit-command-contract.js`
- `src/workspace/topology-edit/topology-edit-command-resolver.js`
- `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
- `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
- `src/workspace/topology-edit/topology-edit-source-adapter.js`
- `src/workspace/topology-edit/support-restraint-family.js`
- `src/workspace/topology-edit/topology-edit-sjson-visual-authority.js`
- new `src/workspace/topology-edit/table/topology-edit-table-support-placement-contract.js`
- `src/workspace/topology-edit/table/topology-edit-table-columns.js`
- `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
- `src/workspace/topology-edit/table/topology-edit-table-intent.js`
- `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
- `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
- new `src/workspace/viewport-productivity/topology-edit-table-support-placement-editor.js`
- `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
- `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
- `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
- new focused Node tests for support placement command/Table transaction
- one focused Playwright support-placement qualification spec/helper if needed

No geometry planner or #1036 dependency module is authorized for weakening/modification in this stage.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| PR1054 base `7d3002df5915027f607a7db10b2f75049fe14c94` | restraint-edit source complete; current-head execution NOT_RUN |
| `da0fb665a3ca58788fad83c96ca27b0938d8d083` | empty placement bootstrap, zero changed files |
| report-first head | report only; no production behavior change |

## Next

1. Finish projection/writeback audit.
2. Implement pure effective-placement authority + command first.
3. Add Table operation only after pure contract is fail-closed.
4. Preserve `SUPPORT_GEOMETRY_POLICY_REQUIRED` for every parent geometry path.
