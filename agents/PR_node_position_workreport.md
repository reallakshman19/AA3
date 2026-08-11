# Certified Engineering Table Node Position — Work Report

## Scope

This stacked change implements the first deferred certified-engineering slice after PR #1020: exact node/connected-run coordinate editing from the Engineering Table without introducing direct canonical coordinate writes.

## Authority chain

`selected canonical EDGE → node-position capability receipt → immutable NODE_POSITION intent → deterministic operation plan → candidate Preview → incremental validation → certified Table transaction → canonical topology → existing journal undo/redo`

Canonical topology remains the only engineering authority. The editor only supplies requested coordinates and movement policy; it never mutates nodes directly.

## Certified operations

- `NODE_ONLY`
  - moves one exact FROM or TO endpoint through the existing governed `MOVE_NODE` command;
  - captures the expected canonical node position and rejects stale coordinate authority;
  - derives the changed scope from the moved node and its incident edges.
- `CONNECTED_RUN`
  - treats the selected edge as the boundary between the anchored side and moving side;
  - translates the complete plain connected component on the selected endpoint side using the existing `planMoveConnectedRun` authority;
  - rejects cycles where the anchor is reachable without crossing the selected edge.

## Fail-closed policy

This slice intentionally rejects node moves when a moved node participates in a junction, support, boundary, rigid, or bend record. Those records can carry engineering semantics or cached geometry that require operation-specific certified policies. They will be addressed by the later support/fitting slices rather than silently sheared or left stale.

Batches containing `NODE_POSITION` also reject overlapping `MOVE_NODE` closures before candidate construction, preventing coordinate edits from silently summing translations on the same node.

## UI

Every selected canonical EDGE row exposes a **Certified node position** editor below the Table properties. FROM and TO endpoints are resolved from exact row bindings. Each endpoint shows X/Y/Z coordinates and an explicit movement mode (`NODE_ONLY` or `CONNECTED_RUN`). The Stage action routes through the same Table batch planner and workflow used by other certified Engineering Table edits.

## Tests

`tests/topology-edit-table-node-position.test.mjs` covers:

- exact endpoint capability resolution;
- deterministic NODE_ONLY `MOVE_NODE` compilation;
- CONNECTED_RUN translation of the complete moving-side plain run;
- stale expected-position rejection;
- dependent-record fail-closed behavior;
- overlapping move-closure rejection;
- non-mutating Preview and Validate;
- atomic Apply;
- exact journal undo and redo.

## Deferred after this slice

1. certified support editing and support/geometry coupling policy;
2. broader fitting/catalogue scalar operations;
3. direct spreadsheet coordinate-cell affordances once node-operation authority is stable;
4. multi-cell paste/fill orchestration over already-certified operations.
