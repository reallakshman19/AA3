# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Base | stacked on PR #1054 at `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Final source/test candidate before this report-only sync | `d08cd53d4f79c346a83ee44e2a2a6b9ee4f4291f` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Engineering state | SOURCE COMPLETE / static review clean |
| Empirical execution | **NOT_RUN** — repository workflows are retired and this agent has no exact-head local runner. |
| Merge state at source candidate | GitHub `mergeable: true`, draft; zero workflow runs and zero commit statuses. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic operation plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three meshes, support glyphs, and workspace entities remain projections/writeback only.

## Certified Semantics

This PR authorizes exactly one placement operation: **explicit same-host station relocation**.

- Host identity is resolved only by `resolveTopologyEditSupportHostEdge()`.
- Station is finite millimetres from the canonical host edge `FROM` node.
- Initial host classes are straight `PIPE`, `STRAIGHT`, or `STRAIGHT_ELEMENT` only.
- `0 <= stationMm <= hostLengthMm`; exact no-op is rejected.
- Origin is deterministic interpolation on the canonical host centerline.
- One command changes one canonical support record only.
- Support, host edge, and both host endpoint node revisions enter stale/dependency custody.
- Existing exact attachment projected-point/segment/distance evidence is retained; certified placement is a separate `placementOverride`.
- Existing certified journal remains the only engineering Undo/Redo authority.

Still prohibited: host rebinding, arbitrary support XYZ movement, moving pipe nodes as a proxy for support relocation, direct Three/entity mutation as authority, automatic support follow/restation during PIPE length/NODE_POSITION/valve/slope/split/trim/connected-run, weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`, or adding a support-specific history stack.

Parent geometry therefore remains fail-closed after this PR.

## Root Cause and Resolved Issues

| ID | Type | Status | Finding / resolution |
|---|---|---|---|
| ISS-1061-01 | Correctness | RESOLVED IN SOURCE | Live canonical support construction previously discarded exact attachment `attachmentId`, `projectedPointCanonical`, `segmentParameter`, and `distanceCanonical`, leaving an approximate endpoint `nodeId`. The dispatch adapter now retains those already-resolved facts; governed SJSON canonical build/rebuild uses that same dispatch path. No second attachment inference algorithm was introduced. |
| ISS-1061-02 | Preview correctness | RESOLVED IN SOURCE | SJSON supports use a separate governed support projection, so generic Table ghost filtering could omit support relocation and candidate derivation could momentarily publish candidate support as the normal glyph. Table Preview now restores current canonical support projection and renders an explicit candidate support ghost at the certified candidate origin. |

## Architecture Decisions

| Decision | Result |
|---|---|
| Exact placement basis | Declared station, retained attachment segment, and retained projected point must agree when multiple authorities exist; disagreement fails closed. |
| Projected-point station | If segment/station is absent, a retained `ATTACHMENT_PROJECTED_POINT` may define station only when it lies exactly on the resolved straight host segment. |
| Curved host | Fail closed; no chord-based approximation. |
| Durable writeback | Committed support center plus explicit `TOPOLOGY_EDIT_SUPPORT_*` audit attributes. Original source `STATION_MM`, source attributes, vendor fields, and immutable source snapshot are not overwritten. |
| Reopen | Audit station/segment/host/center/hash are revalidated against current canonical host geometry before `placementOverride` is rehydrated. Malformed audit fails closed. |
| SJSON live projection | Only an ephemeral governed projection-dataset clone receives certified APOS. Actual workspace/source dataset stays unchanged. |
| Table authority | Displayed station changes to `CERTIFIED_TABLE_OVERRIDE` only after Apply; original source/vendor evidence remains separately visible. |
| Parent geometry | #1036 `SUPPORT_GEOMETRY_POLICY_REQUIRED` remains intact and is explicitly regression-tested. |

## Implemented Contracts

### Pure command authority

`UPDATE_SUPPORT_PLACEMENT` is registered through:

`command request -> exact target resolution -> pure reducer -> candidate delta validation -> certified session/transaction`

The payload is `{ supportId, hostEdgeId, stationMm }`. Target resolution captures the support, exact host edge, host FROM node and host TO node. Effect validation requires exactly one changed support, no node/edge/junction/boundary/rigid/bend delta, preserved non-placement support material, and a valid certified override.

### Engineering Table

`stationMm` is a compound `SUPPORT_PLACEMENT` editor. Stage re-derives current canonical placement capability immediately before intent construction. The editor exposes exact host, host length, current station authority and bounded station input. Placement and restraint editing remain separate certified intents.

### Projection and writeback

- Generic support glyph origin: certified override first, then legacy fallback for untouched supports.
- SJSON governed support projection: candidate/live certified APOS supplied only through an ephemeral dataset clone.
- Preview: explicit support ghost; canonical/live support projection restored before ghost rendering.
- Commit: support geometry center/start/end moves only after accepted canonical transaction/writeback.
- Reopen: explicit placement audit is revalidated and rehydrated.

## Qualification Source Authored — NOT EXECUTED

### `tests/topology-edit-support-placement-command.test.mjs`

Covers exact support/host/endpoint revisions, one-support-only delta, retained evidence, bounded station, no-op, host drift, non-straight host, unresolved host, stale support/host revisions, projected-point-only station authority, conflicting attachment evidence, and repeat-command no-op rejection.

### `tests/topology-edit-table-support-placement.test.mjs`

Covers Table capability, deterministic one-command plan, support/host/node dependency revisions, non-mutating Preview/Validate, exact Apply, certified Table station projection, exact Undo/Redo, stale host rebase conflict, and preservation of `SUPPORT_GEOMETRY_POLICY_REQUIRED` for parent PIPE movement.

### `tests/topology-edit-support-placement-writeback.test.mjs`

Covers exact attachment fact retention, committed center relocation, unchanged source `STATION_MM`/vendor/source-byte custody, reopen override/hash restoration, tampered center rejection, and tampered audit-hash rejection.

### `e2e/topology-edit-table-support-placement.spec.js`

Production visible-user source path on XYZ `S-007` hosted by straight `P-011`:

`Workspace -> XYZ fixture -> 3D Edit -> Engineering Table -> select S-007 -> type station -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo -> select P-011 -> verify parent movement remains support-policy blocked`

Assertions include typing/Stage/Preview/Validate canonical no-op, real ghost existence, exact certified station after Apply, source semantic/byte custody, singular renderer, journal ledger restoration, and the P-011 support-dependency block. Controller access is read-only evidence only; no direct controller invocation is used as UI coverage.

## Static Closure Audit

- Exact changed-file ledger: **28 files**, all inside the registered envelope.
- No geometry planner or #1036 support-dependency authority changed.
- No legacy source adapter or large SJSON restraint-validator implementation changed.
- New/tight production and E2E modules checked against the repository `<300` physical-line guard; checked files remain below the ceiling.
- No submitted reviews, inline review threads, or PR conversation comments at source candidate.
- GitHub reports PR mergeable against its stacked base at source candidate.
- Exact source candidate has **zero workflow runs** and **zero commit statuses**.
- Repository search found no test fixture pinning an exact SJSON canonical hash to the prior support-record shape; existing surfaces derive hashes at runtime.

## Exact Changed-File Ledger

1. `agents/PR1061_workreport.md`
2. `e2e/topology-edit-table-support-placement.spec.js`
3. `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`
4. `src/workspace/topology-edit/support-restraint-family.js`
5. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
6. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
7. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
8. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
9. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
10. `src/workspace/topology-edit/table/topology-edit-table-projection.js`
11. `src/workspace/topology-edit/table/topology-edit-table-support-placement-contract.js`
12. `src/workspace/topology-edit/topology-edit-command-contract.js`
13. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
14. `src/workspace/topology-edit/topology-edit-command-resolver.js`
15. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
16. `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
17. `src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js`
18. `src/workspace/topology-edit/topology-edit-support-placement-command.js`
19. `src/workspace/topology-edit/topology-edit-support-placement.js`
20. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
21. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
22. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
23. `src/workspace/viewport-productivity/topology-edit-table-support-placement-editor.js`
24. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
25. `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
26. `tests/topology-edit-support-placement-command.test.mjs`
27. `tests/topology-edit-support-placement-writeback.test.mjs`
28. `tests/topology-edit-table-support-placement.test.mjs`

Any future discrepancy is a closure blocker until this report is updated before the change.

## Explicitly Not Validated

| Item | Status | Reason |
|---|---|---|
| Focused Node tests on PR1061 exact head | NOT_RUN | No exact-head execution mechanism available. |
| Production Chromium/WebGL S-007 lifecycle | NOT_RUN | Authored source only; retired workflows and unavailable local checkout prevent execution. |
| Combined stack after #1054 merge | NOT_RUN | #1061 remains stacked/draft; must re-evaluate against the eventual merged base. |
| Automatic support-follow on parent geometry | NOT_APPLICABLE | Deliberately prohibited and remains fail-closed. |
| Curved-host relocation | NOT_APPLICABLE | Deliberately unrepresentable in this slice. |

## Handover / Next Gate

1. Execute the three focused Node files and `e2e/topology-edit-table-support-placement.spec.js` on the exact PR1061 head in a real Chromium/WebGL runner.
2. Preserve fixture SHA, candidate SHA, screenshot/trace and qualification JSON evidence.
3. If execution is green, re-check stacked-base integration, reviews, ledger and mergeability before marking ready.
4. Do **not** merge based only on source review or GitHub mergeability.
5. Only after this placement slice is empirically qualified should a separate PR consider coordinated parent-geometry/support-follow semantics.
