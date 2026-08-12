# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Mission | Certify one explicit support placement operation along the support's already-resolved host edge, without authorizing automatic parent-geometry follow or host rebinding. |
| Status | DRAFT / implementation + source qualification in progress |
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

1. The legacy support reshape receives the existing exact attachment model but drops `attachmentId`, `projectedPointCanonical`, `distanceCanonical`, and `segmentParameter`, retaining only host identity/evidence type plus an intentionally approximate endpoint `nodeId` for mid-span attachments.
2. Production commit/reopen already enters through `topology-edit-source-adapter-dispatch.js`, but initial `TopologyEdit3DViewController` session construction still imports the legacy adapter directly. Initial and committed canonical custody must use the same dispatch boundary.
3. `resolveTopologyEditSupportHostEdge()` remains the sole host authority.
4. Legacy source writeback translates support entities through approximate `support.nodeId`; certified mid-span relocation therefore requires override-aware writeback.
5. Generic support rendering prefers the canonical support node, so accepted placement may override only the projection origin while untouched support behavior remains unchanged.
6. Table projection must display the certified station after Apply while source/vendor fields retain original source evidence.
7. The governed SJSON validator projection intentionally groups support records by source APOS/POS before canonical origin. The edit runtime supplies a projection-only dataset clone whose APOS is replaced only for certified placement overrides; the actual workspace/source dataset and validator implementation remain untouched.
8. The production demo and XYZ embedded supports contain no `STATION_MM`; exact attachment projected-point/segment evidence is therefore required for a truthful real-user station editor.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| ISS-1061-01 | Correctness | FIX IN PROGRESS | Live canonical construction discarded already-resolved attachment placement facts and initial 3D session construction bypassed the dispatch wrapper that now retains them. The dispatch wrapper now retains projected point/segment/distance facts; the controller import boundary is authorized to switch to that same wrapper. No new attachment inference is introduced. |
| DEC-1061-01 | Semantics | ACCEPTED | First certified movement policy is explicit same-host station relocation. |
| DEC-1061-02 | Safety | ACCEPTED | Parent geometry remains blocked; no automatic host-follow in this PR. |
| DEC-1061-03 | Authority | ACCEPTED | Imported origin/attachment evidence is retained; placement uses a marked certified override. |
| DEC-1061-04 | Host | ACCEPTED | Shared #1036 host resolver must return exactly `RESOLVED`; no alternate lookup. |
| DEC-1061-05 | Coordinates | ACCEPTED | Station is measured from canonical host `FROM`; origin is deterministic linear interpolation on that exact edge. |
| DEC-1061-06 | Evidence conflict | ACCEPTED | Conflicting declared-station vs attachment placement evidence fails closed instead of selecting one authority. |
| DEC-1061-07 | Durable writeback | ACCEPTED | Persist certified placement as topology-edit audit attributes plus committed support geometry; rehydrate only from those explicit audit fields. Do not overwrite source `STATION_MM`/attachment evidence. |
| DEC-1061-08 | SJSON edit projection | ACCEPTED | Overlay certified APOS only in an ephemeral governed edit-projection dataset; source dataset remains immutable. |
| DEC-1061-09 | Canonical entrypoint | ACCEPTED | Initial 3D session and commit/reopen construction must both use the dispatch adapter; legacy adapter remains the internal reshape only. |
| RISK-1061-01 | Curved hosts | OPEN / FAIL-CLOSED | Initial operation rejects non-straight/non-representable host types rather than projecting by chord. |
| RISK-1061-02 | Execution | OPEN | No exact-head runner currently available. |

## Stage Roadmap

### S0 — Report-first custody — COMPLETE
The numbered report was the first changed file after the empty bootstrap.

### S1 — Placement/projection audit — COMPLETE
Mid-span node identity is explicitly not placement authority; exact host/station/writeback/projection seams are identified.

### S2 — Pure command + placement authority — IN PROGRESS
Pure placement context, command contract, resolver targets, reducer/effect validation and focused command tests are authored. Dispatch canonical construction now retains existing exact attachment placement facts; initial controller entrypoint must be aligned to the same wrapper.

### S3 — Table intent/planner/UI — IN PROGRESS
`SUPPORT_PLACEMENT` Table intent, planner, batch allowlist, capability, station editor and Stage-time revalidation are implemented. Input and Stage remain canonical no-ops.

### S4 — Projection/writeback — IN PROGRESS
Generic support glyphs and Table projection consume certified override. Durable workspace writeback/rehydration is implemented. Governed SJSON edit projection uses a projection-only APOS clone and does not mutate source data.

### S5 — Qualification/closure — PENDING
Focused command/transaction/round-trip tests are authored. Production Playwright source qualification and empirical execution remain pending; no PASS will be claimed until executed.

## Authorized Changed-File Envelope

- `agents/PR1061_workreport.md`
- `src/workspace/topology-edit-3d-view-controller-core.js` — import-boundary switch only; no controller behavior rewrite
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
- new focused Node tests for support placement command/Table transaction/writeback
- one focused Playwright support-placement qualification spec/helper if needed

No geometry planner or #1036 dependency module is authorized for weakening/modification.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| PR1054 base `7d3002df5915027f607a7db10b2f75049fe14c94` | restraint-edit source complete; current-head execution NOT_RUN |
| `da0fb665a3ca58788fad83c96ca27b0938d8d083` | empty placement bootstrap, zero changed files |
| current implementation heads | source-only review; no empirical PASS claimed |

## Next

1. Switch initial 3D canonical construction to the registered dispatch wrapper and verify exact attachment model is supplied.
2. Add the focused production Playwright S-007 same-host relocation path.
3. Static-audit tests, changed-file ledger, line budgets and review state.
4. Seal evidence and keep draft if exact-head execution is still unavailable.
