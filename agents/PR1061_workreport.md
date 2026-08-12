# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Mission | Certify one explicit support placement operation along the support's already-resolved host edge, without authorizing automatic parent-geometry follow or host rebinding. |
| Status | DRAFT / pure command + Table integration in progress |
| Empirical execution | NOT_RUN until an exact-head runner is available; retired workflows are not to be restored solely for this slice. |

## Required Authority Path

`exact SUPPORT row -> exact shared host resolution -> explicit station draft -> governed SUPPORT_PLACEMENT intent -> deterministic same-host placement plan -> candidate Preview -> validation -> certified transaction -> canonical support placement override -> existing journal Undo/Redo -> Three/support projection`

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
- Host edge, both host endpoint nodes and support revisions are captured and stale changes fail closed.
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
6. Table currently exposes `stationMm`; this PR may make only that field editable through a compound governed support-placement intent while host identity remains read-only.
7. Generic support rendering currently prefers the canonical support node, so accepted placement must override only that projection origin while untouched support behavior remains unchanged.
8. Table projection must display the certified station after Apply rather than continuing to show stale source station evidence.
9. Workspace commit planning already routes canonical writeback through `topology-edit-source-adapter-dispatch.js`. That wrapper is the narrow integration point for replacing legacy node-based support center writeback with the certified override and for rehydrating that override on subsequent workspace-canonical rebuilds; the immutable source snapshot remains untouched.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1061-01 | Semantics | ACCEPTED | First certified movement policy is explicit same-host station relocation. |
| DEC-1061-02 | Safety | ACCEPTED | Parent geometry remains blocked; no automatic host-follow in this PR. |
| DEC-1061-03 | Authority | ACCEPTED | Imported origin/attachment evidence is retained; placement uses a marked certified override. |
| DEC-1061-04 | Host | ACCEPTED | Shared #1036 host resolver must return exactly `RESOLVED`; no alternate lookup. |
| DEC-1061-05 | Coordinates | ACCEPTED | Station is measured from canonical host `FROM`; origin is deterministic linear interpolation on that exact edge. |
| DEC-1061-06 | Evidence conflict | ACCEPTED | Conflicting declared-station vs attachment-segment evidence fails closed instead of selecting one authority. |
| DEC-1061-07 | Durable writeback | ACCEPTED | Persist certified placement as topology-edit audit attributes plus committed support geometry; rehydrate only from those explicit audit fields. Do not overwrite source `STATION_MM`/attachment evidence. |
| RISK-1061-01 | Curved hosts | OPEN / FAIL-CLOSED | A two-node canonical edge does not encode an independent support centerline parameterization for elbow arcs. Initial operation rejects non-straight/non-representable host types rather than projecting by chord. |
| RISK-1061-02 | Source writeback | IN PROGRESS | Dispatch wrapper must overwrite legacy approximate-node center only for certified placement and reject malformed audit rehydration. |
| RISK-1061-03 | SJSON grouped projection | OPEN | Source-validator support grouping can prefer source positions; edit projection must display certified override without rewriting source-only validation authority. |
| RISK-1061-04 | Execution | OPEN | No exact-head runner currently available. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE

This report is the first changed file after the empty bootstrap.

### S1 — Placement/projection audit — COMPLETE

Canonical source placement, shared host resolution, support overlays, writeback, Table station projection and changed-scope semantics have been traced. Mid-span node identity is explicitly not placement authority.

### S2 — Pure command + placement authority — IN PROGRESS

Pure placement context, command contract, resolver targets, reducer and effect validation are implemented in source. Focused command tests are authored. Required failures include missing/ambiguous host, non-straight host, conflicting source evidence, stale support/host, negative/out-of-range/no-op station, non-finite geometry and any topology delta outside one support.

### S3 — Table intent/planner/UI — IN PROGRESS

`SUPPORT_PLACEMENT` Table intent, planner, exact capability, station editor and Stage-time revalidation are implemented in source. Input and Stage remain canonical no-ops.

### S4 — Projection/writeback — IN PROGRESS

Generic support glyphs and Table projection consume an accepted certified override while untouched supports retain prior behavior. Durable workspace writeback/rehydration is now authorized through the dispatch wrapper. Source `STATION_MM`, attachment geometry and immutable source snapshot stay unchanged.

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
- `src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js`
- `src/workspace/topology-edit/support-restraint-family.js`
- `src/workspace/topology-edit/topology-edit-sjson-visual-authority.js`
- `src/workspace/topology-edit/topology-edit-sjson-restraint-projection.js`
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
- new focused Node tests for support placement command/Table transaction
- one focused Playwright support-placement qualification spec/helper if needed

No geometry planner or #1036 dependency module is authorized for weakening/modification in this stage.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| PR1054 base `7d3002df5915027f607a7db10b2f75049fe14c94` | restraint-edit source complete; current-head execution NOT_RUN |
| `da0fb665a3ca58788fad83c96ca27b0938d8d083` | empty placement bootstrap, zero changed files |
| current implementation heads | source-only review in progress; no empirical PASS claimed |

## Next

1. Implement durable support placement writeback/rehydration in the registered source-adapter dispatch wrapper.
2. Make SJSON grouped support projection prefer certified placement only in edit projection.
3. Add Table transaction/rebase/Undo/Redo focused tests and durable commit-roundtrip coverage.
4. Add production Playwright source qualification while preserving `NOT_RUN` until an actual runner executes it.
