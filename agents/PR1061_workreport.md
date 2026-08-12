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

`exact SUPPORT row -> shared host resolution -> explicit station draft -> governed SUPPORT_PLACEMENT intent -> deterministic plan -> Preview -> validation -> certified transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection`

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

1. Legacy support reshape receives exact attachment authority but discards `attachmentId`, `projectedPointCanonical`, `distanceCanonical`, and `segmentParameter`, retaining an intentionally approximate endpoint `nodeId` for mid-span attachments.
2. Production demo/XYZ support records do not contain `STATION_MM`; exact attachment projected-point/segment evidence is therefore necessary for a truthful station editor.
3. SJSON fidelity controller already enriches initial canonical supports with exact attachment origins. Generic non-SJSON supports without exact placement evidence remain safely unrepresentable.
4. Commit/reopen construction routes through `topology-edit-source-adapter-dispatch.js`; this wrapper now retains exact attachment facts and rehydrates certified placement audit fields.
5. SJSON `buildWorkspaceCanonical()` must also use the dispatch builder before its existing visual enrichment so a committed certified override survives refresh/reopen. Core controller does not need modification.
6. Generic support rendering historically prefers `support.nodeId`; certified override may take precedence only when present, preserving legacy untouched-support behavior.
7. SJSON support grouping prefers source APOS/POS; governed edit projection therefore uses an ephemeral dataset clone with certified APOS only, leaving workspace/source authority immutable.
8. Table must show certified station after Apply while source/vendor properties preserve original evidence.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| ISS-1061-01 | Correctness | FIX IN PROGRESS | Exact attachment placement facts were not retained consistently across initial/commit canonical construction. Dispatch now retains them; SJSON canonical rebuild seam is the remaining production alignment. No new attachment inference is introduced. |
| DEC-1061-01 | Semantics | ACCEPTED | Same-host station relocation is the only movement policy in this PR. |
| DEC-1061-02 | Safety | ACCEPTED | Parent geometry remains blocked; no support-follow policy is introduced. |
| DEC-1061-03 | Evidence | ACCEPTED | Declared station, attachment segment and projected-point evidence must agree or fail closed. |
| DEC-1061-04 | Curved hosts | ACCEPTED FAIL-CLOSED | No chord-based station approximation for bends/curved fittings. |
| DEC-1061-05 | Durable writeback | ACCEPTED | Certified placement persists as edit-audit attributes + committed support center; source `STATION_MM` and attachment evidence are not overwritten. |
| DEC-1061-06 | SJSON projection | ACCEPTED | Certified APOS is injected only into an ephemeral governed projection dataset. |
| RISK-1061-01 | Execution | OPEN | New source/tests have not executed on exact head. |

## Stage Status

### S0 — report-first custody — COMPLETE
Numbered report was the first changed file after empty bootstrap.

### S1 — architecture/placement audit — COMPLETE
Canonical host, attachment, projection, writeback and Table seams are mapped.

### S2 — pure command authority — SOURCE COMPLETE / NOT_RUN
Implemented pure placement context, governed payload, target resolution, reducer, strict effect validation and stale host/support custody. Focused command tests authored.

### S3 — Table intent/planner/UI — SOURCE COMPLETE / NOT_RUN
Implemented `SUPPORT_PLACEMENT` intent, planner, composite batch allowlist, exact capability, station editor and Stage-time current-authority revalidation. Input/Stage remain canonical no-ops.

### S4 — projection/writeback — IN PROGRESS
Generic support glyphs, Table projection, durable writeback/rehydration and SJSON ephemeral APOS projection are implemented. Remaining source change: SJSON canonical builder must use dispatch so audit override survives refresh/reopen.

### S5 — qualification/closure — PENDING
Command, Table transaction and writeback tests are authored. Focused production Playwright S-007 qualification is next. Empirical status remains NOT_RUN.

## Authorized Changed-File Envelope

- `agents/PR1061_workreport.md`
- `src/workspace/topology-edit-3d-sjson-fidelity-controller.js` — canonical builder seam only
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
- `tests/topology-edit-support-placement-command.test.mjs`
- `tests/topology-edit-table-support-placement.test.mjs`
- `tests/topology-edit-support-placement-writeback.test.mjs`
- planned `e2e/topology-edit-table-support-placement.spec.js`

Previously considered core/source/SJSON-validator files are **not** needed and must remain untouched unless this report is updated first.

No geometry planner or #1036 support-dependency module is authorized for weakening/modification.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| PR1054 base `7d3002df5915027f607a7db10b2f75049fe14c94` | restraint source complete; exact-head execution NOT_RUN |
| `da0fb665a3ca58788fad83c96ca27b0938d8d083` | empty bootstrap, zero changed files |
| current PR1061 implementation | static review only; no empirical PASS claimed |

## Next

1. Align SJSON canonical build/rebuild with dispatch wrapper while retaining existing exact-origin enrichment.
2. Author focused production Playwright path on XYZ support S-007 / straight host P-011.
3. Audit line budgets, changed-file ledger, source-only syntax risks, reviews and mergeability.
4. Seal report/PR body and keep draft if exact-head execution is still unavailable.
