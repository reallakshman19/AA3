# Engineering Table geometry authority addendum

This addendum supersedes the endpoint-geometry projection portion of `engineering-table-batch-a-b-runtime-diff.md`.

## Decision

Do **not** add FROM/TO X/Y/Z, node/port identity, or delta fields to the hashed `TopologyEditTableProjection.v1` solely to make them visible in the Engineering Table.

The existing projection hash is embedded in Table edit authority. Adding presentation-only geometry fields there would change projection and intent hashes for otherwise unchanged certified edits.

Instead, add a presentation-only virtual geometry adapter above the projection.

## Virtual fields

For an exact canonical EDGE row and the current canonical topology, resolve:

- `fromNodeId`, `toNodeId`
- `fromPortKey`, `toPortKey`
- `fromX`, `fromY`, `fromZ`
- `toX`, `toY`, `toZ`
- `deltaX`, `deltaY`, `deltaZ`

Rules:

- endpoint node identity comes only from the row's exact `portBindings`;
- coordinates come only from the exact canonical node;
- delta values are display-only derivations from those two points;
- ambiguous/missing endpoint bindings return unresolved values;
- the adapter owns no authority hash and is never passed into `createTopologyEditTableIntent` as the projection.

## Editing

Coordinate cells use `deriveTopologyEditTableNodePositionCapability` against the unchanged certified projection plus current canonical topology.

First release behavior:

- FROM coordinate cells route to the existing FROM `NODE_POSITION` editor;
- TO coordinate cells route to the existing TO `NODE_POSITION` editor;
- `deltaX/Y/Z`, node IDs and port keys remain read-only;
- existing `NODE_ONLY` / `CONNECTED_RUN` policy remains mandatory;
- support/junction/boundary/rigid/bend dependency blockers remain fail-closed.

## Candidate/draft overlay

When a `NODE_POSITION` intent is staged, the virtual geometry adapter may overlay the staged/candidate position for presentation, but canonical projection authority remains unchanged until Apply.

## Qualification invariant

Profile switching and virtual field rendering must leave all of the following unchanged before Apply:

- canonical topology hash;
- Table projection hash;
- journal hash;
- session version;
- active ledger hash;
- existing PIPE/VALVE/TEE/SUPPORT intent semantics.
