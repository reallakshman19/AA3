# Engineering Table C2 — safe 3D draft convergence

## Finding

The existing professional 3D interaction preview is node-authoritative: it identifies one exact canonical `nodeId` and a target position.

The existing Table `NODE_POSITION` intent is edge-endpoint-authoritative: it requires one exact canonical EDGE row plus `FROM` or `TO` and a matching node binding.

A node may be incident to more than one edge. Therefore the 3D controller must not select an arbitrary incident edge simply to manufacture a Table intent.

## Required behavior

### During drag / numeric preview

Keep the existing lightweight interaction preview and deterministic snapping path.

Publish a transient draft position keyed by exact node ID so the Engineering Table can display candidate FROM/TO coordinates for every row that binds that node.

This transient state is presentation-only:

- no Table intent;
- no batch;
- no journal entry;
- no canonical change;
- no projection authority change.

### At interaction settle

There are two valid cases.

1. **Explicit edge/endpoint editing context exists**
   - promote the exact target to the existing Table `NODE_POSITION` intent;
   - preserve the declared `NODE_ONLY` / `CONNECTED_RUN` movement policy;
   - stage through the shared Table draft planner.

2. **Only node identity exists**
   - retain the existing certified direct `MOVE_NODE` interaction authority for acceptance;
   - synchronize its preview into shared presentation draft state;
   - do not infer a Table edge target.

A later generic shared draft contribution contract may unify direct `MOVE_NODE` and Table operation plans, but that contract must be versioned and qualified separately.

## UI implication

Selecting or dragging a shared node may update multiple Engineering Table rows because several rows can reference the same canonical node. This is correct presentation behavior.

Editing a coordinate from a specific Table row has stronger context: the row itself supplies exact edge + endpoint identity, so it may stage `NODE_POSITION` without ambiguity.

## Acceptance tests

- one node bound to two edge rows updates both rows' transient coordinate display during 3D drag;
- no Table intent is created from node-only 3D context;
- explicit Table FROM/TO coordinate editing still creates the exact existing `NODE_POSITION` intent;
- cancel clears transient display without changing canonical/journal/session state;
- direct 3D Apply remains certified `MOVE_NODE` until a generic shared operation-plan draft contract is qualified;
- no nearest-edge or first-incident-edge inference exists anywhere in the convergence layer.
