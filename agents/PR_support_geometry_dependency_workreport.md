# Support geometry dependency closure work report

## Scope

This slice closes the audit finding that geometry-changing 3D Edit operations could affect a support hosted by edge/component identity without recognizing that support as a governed dependency.

The slice is intentionally conservative. It does **not** move, relocate, restation, add, delete, or rewrite supports. Until those semantics are separately certified, affected support geometry blocks the operation.

## Root cause

Support rendering can resolve a host through `hostEntityId`, `edgeId`, or `attachedEdgeId`, with a unique incident-edge fallback from `support.nodeId`. Geometry movement and changed-scope discovery previously recognized supports primarily through direct node references. An edge/station-hosted support could therefore be omitted from movement policy checks, validation neighbourhoods, Table dependency revisions, and command capability truthfulness.

## Architecture decision

A shared support geometry dependency authority now resolves the support host and reports dependencies from both:

- moved support nodes; and
- affected host edges/components.

The stable fail-closed reason is `SUPPORT_GEOMETRY_POLICY_REQUIRED`.

The certified session also enforces the rule at the mutable boundary for every governed `MOVE_NODE`. This provides a backstop for direct Canvas MOVE/STRETCH and future callers even when their higher-level planner does not use the connected-run helper.

Capability authority uses the same dependency evidence. A support-dependent node move is now advertised as `UNREPRESENTABLE`, not as an action that appears available and then fails at the session boundary.

No canonical support mutation is introduced. The existing governed flow remains:

`intent -> operation plan -> candidate/Preview -> validation -> certified transaction -> canonical topology -> journal undo/redo`.

## Implementation

- Added `topology-edit-support-geometry-dependency.js` with exact host resolution, affected-edge derivation, immutable dependency evidence, and fail-closed assertion.
- Changed-scope derivation now includes supports whose resolved/candidate host edge is affected, carrying their support IDs into source-record and validation neighbourhood authority.
- Generic connected-run movement, endpoint extend/shorten movement, and edge split now fail closed when support geometry would be affected.
- Declared-slope planning now performs the same support geometry dependency check before producing `MOVE_NODE` intents.
- The certified session rejects any governed `MOVE_NODE` whose moved node/incident geometry affects unresolved support geometry, before command request creation or journal mutation.
- Command capability derives support dependencies before advertising `move-positive-z`; support-dependent nodes return `SUPPORT_GEOMETRY_POLICY_REQUIRED`.
- Table `NODE_POSITION` NODE_ONLY planning uses the same support dependency authority; CONNECTED_RUN inherits the generic movement guard.
- Table NODE_POSITION capability reports `SUPPORT_GEOMETRY_POLICY_REQUIRED` for immediately affected support-host geometry before staging.

## Tests

Added focused coverage for:

- explicit host edge/component resolution;
- unique incident-edge fallback;
- node-linked and edge-hosted dependency discovery;
- ambiguous host authority;
- hosted support inclusion in changed scope;
- generic connected-run blocking;
- PIPE_LENGTH propagation blocking;
- valve F2F propagation blocking;
- NODE_POSITION capability and NODE_ONLY planning blocking;
- declared-slope blocking;
- certified-session `MOVE_NODE` rejection with exact no-mutation journal assertions;
- support-aware command capability with an unrestrained positive control;
- production visible-user qualification that proves a supported endpoint is blocked without canonical/journal mutation before a safe endpoint succeeds;
- clean-layout/render qualification that proves support-dependent MOVE is disabled and leaves a clean draft before an unrestrained move is saved;
- remount/icon-custody qualification that performs the one-command lifecycle on the verified unrestrained `P-003, TO` endpoint across three deactivate/reactivate cycles;
- Tool Audit qualification that uses a verified unrestrained P-003 endpoint for successful MOVE_NODE coverage while support-dependent P-001 MOVE is unavailable.

Existing no-support route/Table/browser suites remain the positive-path regression authority.

## Deferred by design

- support-follow-node semantics;
- support-follow-host translation;
- station recomputation;
- support relocation;
- support add/delete;
- support property editing.

Those require their own governed support command and certified movement policy and must not be inferred by this fix.
