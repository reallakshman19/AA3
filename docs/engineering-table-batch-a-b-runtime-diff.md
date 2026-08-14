# Engineering Table Batch A/B runtime diff

This document is the exact implementation contract for the first runtime upgrade. It intentionally maximizes reuse of existing certified modules and does not introduce a new canonical mutation path.

## Batch A — repair current field/editor contracts

### `topology-edit-table-columns.js`

1. Add explicit presentation metadata to descriptors:
   - `group`: `IDENTITY | GEOMETRY | SPECIFICATION | FITTING | SUPPORT | CONNECTIVITY | AUTHORITY`
   - `editMode`: `READ_ONLY | DERIVED | DIRECT | COMPOUND`
2. Preserve `readOnly` and `editor` for compatibility during migration.
3. Fix TEE declarations:
   - `runDnMm` -> `BRANCH_RECONFIGURE` compound editor
   - `branchDnMm` -> keep `BRANCH_RECONFIGURE`
   - add `downstreamDnMm` -> `BRANCH_RECONFIGURE`
   - add `branchPortKey` -> `BRANCH_RECONFIGURE`
   - add `reducerCanonicalId` -> `BRANCH_RECONFIGURE`
   - `branchAngleDeg` -> explicit read-only until a real angle-changing operation is certified
4. Rename the visible valve edit affordance from scalar-looking `Valve Type` to operation-oriented `Valve Replacement` while keeping `VALVE_REPLACE` authority.

### `topology-edit-table-projection.js`

For TEE junction rows, prefer canonical `branchRelation` values when present:

- `runDnMm = branchRelation.runNominalSizeMm ?? record.runDiameterMm ?? source RUN_DN`
- `branchDnMm = branchRelation.teeBranchNominalSizeMm ?? record.branchDiameterMm ?? source BRANCH_DN`
- `downstreamDnMm = branchRelation.downstreamNominalSizeMm`
- `branchPortKey = branchRelation.branchPortKey ?? record.branchPortKey`
- `reducerCanonicalId = branchRelation.reducerEdgeId`

This is required because `UPDATE_JUNCTION_BRANCH_RELATION` already writes those values into canonical `junction.branchRelation`. The table must reflect the accepted canonical relation instead of hiding it.

## Batch B — focused profiles + endpoint geometry visibility

### Reuse `topology-edit-table-column-profiles.js`

The additive module already committed on this branch defines:

- `GEOMETRY`
- `SPECIFICATION`
- `SUPPORT`
- `CONNECTIVITY`
- `AUTHORITY`
- `ALL`

The runtime should consume that module instead of rebuilding another profile registry.

### `topology-edit-table-view-state.js`

Add `columnProfile` to view state, default `GEOMETRY` for the interactive Engineering Table. Accept a `PROFILE` reducer action. Validate against `topologyEditTableColumnProfileNames()`.

Selection, sorting, filtering and engineering hashes remain unaffected; this is presentation state only.

### `topology-edit-table-properties-view.js`

Extend `topologyEditTableVisibleColumns(projection, profile)`:

1. build the current deterministic union exactly as today;
2. for `ALL`, return the union unchanged;
3. for another profile, obtain the allowed keys from `topologyEditTableColumnProfile(profile, presentElementTypes)`;
4. filter the union without changing descriptor identity or order.

Do not rebuild the canonical projection from profile state.

### `topology-edit-table-grid-view.js`

Add a compact profile control beside Filter:

`Geometry | Specification | Supports | Connectivity | Authority | All`

Each control uses `data-table-profile`, `aria-pressed`, and the current view-state profile. Pass `runtime.viewState.columnProfile` into `topologyEditTableVisibleColumns`.

### `topology-edit-table-runtime.js`

Handle `data-table-profile` clicks by reducing view state with `PROFILE`, reset horizontal table scroll, and render. No session/canonical call occurs.

## Endpoint geometry fields

### Projection

Every canonical EDGE row should expose display fields derived from the already-authoritative endpoint nodes/bindings:

- `fromNodeId`, `toNodeId`
- `fromPortKey`, `toPortKey`
- `fromX`, `fromY`, `fromZ`
- `toX`, `toY`, `toZ`
- `deltaX`, `deltaY`, `deltaZ`

Authority:

- node IDs and coordinates: `CANONICAL`
- port keys: `CANONICAL` when exact binding exists, otherwise `UNRESOLVED`
- delta values: `DERIVED_DISPLAY`

No new geometry value is invented.

### Column presentation

Expose endpoint coordinate columns as `NODE_POSITION` compound-edit fields in the first release. Clicking a FROM field must select the row and focus the existing FROM node editor; clicking a TO field must focus the existing TO editor.

This deliberately reuses:

- `deriveTopologyEditTableNodePositionCapability`
- `renderTopologyEditTableNodePositionEditor`
- `stageTopologyEditNodePosition`
- existing `NODE_ONLY` / `CONNECTED_RUN` policy
- existing batch planner / candidate / validation / Apply path

It avoids prematurely inventing a second direct-cell position staging path.

`deltaX/Y/Z` and node/port identity remain read-only display fields.

## Batch C entry condition

Only after shared draft coordination exists should X/Y/Z become true spreadsheet direct cells. At that point a one-axis edit can safely stage a complete endpoint position from canonical/draft coordinates and synchronize the 3D candidate without relying on lower-pane DOM values.

## Required regression assertions

1. Accepted TEE relation projects the exact run/branch/downstream DN, branch port and reducer identity.
2. `branchAngleDeg` does not claim an editor.
3. Geometry profile exposes endpoint XYZ and length but hides material/class fields.
4. Specification profile exposes DN/schedule/material/class fields but not endpoint XYZ.
5. Profile switching changes no canonical hash, journal hash or session version.
6. Clicking FROM X focuses the existing FROM node editor; TO Z focuses the TO editor.
7. NODE_POSITION staging still uses existing capability fail-closed rules for support/junction/boundary/rigid/bend dependants.
8. Existing PIPE length, support, valve and TEE workflows remain transaction-identical.
