# PR 1066 Work Report — Adjustable Engineering Table Divider

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1066 — `feat(3d-edit): make Engineering Table divider adjustable` |
| Branch | `agent/engineering-table-adjustable-divider` |
| Base | stacked on PR #1061 at `9f5eb40906ff1e74ee04e263b39abbd8333ea822` |
| Bootstrap | `fdf81ada8518486a6635e6af971d8d215e3e08ff` — empty tree-equivalent commit |
| Mission | Make the internal horizontal boundary between the Engineering Table row-list pane and engineering/detail pane user-adjustable without acquiring engineering authority. |
| State | DRAFT / report-first / implementation pending |
| Empirical execution | **NOT_RUN** — repository workflows are retired and this agent has no exact-head browser runner. |

## User-Visible Target

The requested divider is the boundary between:

1. the virtualized row-list area, including `Rendering rows 1–120 of 266 while scrolling.`; and
2. the engineering/detail area that begins with editors such as `MOVE_NODE / CONNECTED_RUN`.

This is **not** the outer Engineering Table resize handle and **not** the main 3D canvas/sidecar divider.

## Authority Boundary

This PR is presentation-only.

`pointer/keyboard splitter interaction -> bounded transient pane height -> CSS layout projection`

It must not change:

- canonical topology or source custody;
- canonical selection semantics;
- Table intent/batch/plan/candidate/validation/transaction state;
- engineering planner or compatibility/certification behavior;
- the existing journal/Undo/Redo authority;
- Three/WebGL engineering authority;
- virtualized row-window calculations other than naturally displaying more/fewer visible pixels.

No persistent application-store entry is required. The current lower-pane height may live only on the mounted `TopologyEditTableRuntime` instance so normal Table re-renders retain the user's current split during that activation.

## Architecture Audit

1. `topology-edit-table-grid-view.js` renders the populated Table as header -> scroll region -> lower region. The row-window notice currently lives at the top of the lower region.
2. `renderTopologyEditTableNodePositionEditor()` produces the `MOVE_NODE / CONNECTED_RUN` identity row inside the detail/editor region.
3. `topology-edit-table-styles.js` currently gives the row scroll region flexible remaining height while the lower region is capped at 210 px (180 px under 900 px viewport width).
4. `TopologyEditTableRuntime` already owns delegated `keydown` handling and is the correct lifetime for transient split state; the outer productivity adapter separately owns whole-window dragging.
5. Therefore the truthful requested boundary requires moving the virtualization notice to the row-list side, inserting one horizontal separator, and making the lower pane a bounded explicit flex basis.

## Interaction Contract

### Pointer

- Primary-button drag on the horizontal separator adjusts lower detail-pane height.
- Pointer capture keeps the interaction stable outside the narrow handle.
- `touch-action: none` prevents touch scrolling from fighting the resize gesture.
- Drag math is bounded by the currently available populated Table height.

### Keyboard / accessibility

- Separator uses `role="separator"`, `aria-orientation="horizontal"`, and `tabindex="0"`.
- `ArrowUp` increases the lower/detail pane; `ArrowDown` decreases it.
- `Home` moves to the minimum detail height; `End` moves to the current maximum.
- The separator exposes `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` in pixels.
- A reset gesture may restore the existing default lower-pane height, but must remain UI-only.

### Bounds

Initial constants are to be small and deterministic, with both regions remaining usable. Bounds are calculated from the actual populated Table rectangle rather than assuming the outer window size. If the available height becomes smaller after outer-window resize, the current value is clamped on the next layout application.

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1066-01 | Scope | ACCEPTED | Resize only the internal row-list/detail split. |
| DEC-1066-02 | State | ACCEPTED | Split height is transient `TopologyEditTableRuntime` UI state, never canonical/store/journal state. |
| DEC-1066-03 | Notice placement | ACCEPTED | The `Rendering rows …` notice belongs to the upper row-list pane so the requested separator sits directly below it. |
| DEC-1066-04 | Accessibility | ACCEPTED | Pointer and keyboard adjustment are both required. |
| DEC-1066-05 | Safety | ACCEPTED | Resizing must not call Stage/Preview/Validate/Apply, selection, planner, or command APIs. |
| RISK-1066-01 | Small windows | OPEN / BOUNDED | Outer Table resizing can reduce available height; splitter state must clamp to maintain usable upper and lower panes. |
| RISK-1066-02 | Re-render | OPEN | Table frequently replaces `innerHTML`; splitter handlers must be delegated or rebound without losing the transient height. |
| RISK-1066-03 | Qualification | OPEN | Browser behavior cannot be claimed PASS until exact-head Playwright/Chromium execution occurs. |

## Authorized Changed-File Envelope

No source path outside this list may change unless this report is updated **before** that path is modified.

- `agents/PR1066_workreport.md`
- new `src/workspace/viewport-productivity/topology-edit-table-splitter-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`
- `src/workspace/viewport-productivity/topology-edit-table-runtime.js`
- `src/workspace/viewport-productivity/topology-edit-table-styles.js`
- new `tests/topology-edit-table-splitter.test.mjs`
- new `e2e/topology-edit-table-splitter.spec.js`

No topology-edit canonical, command, planner, transaction, journal, support, Three/WebGL, or source-adapter module is authorized for modification.

## Qualification Plan

### Focused Node source

Pure splitter math/state tests will cover:

- default value and deterministic bounds;
- clamp after outer-container shrink;
- keyboard increments and min/max commands;
- pointer-delta direction semantics;
- no dependency on canonical/command objects.

### Production browser source

A focused Playwright spec will use the visible Engineering Table path and verify:

- the separator exists between the row-window notice and selected NODE_POSITION editor;
- dragging changes the upper/lower pane geometry in the expected directions;
- keyboard resize works and ARIA values update;
- resizing survives a normal Table re-render/row selection;
- Table row scrolling still works;
- canonical hash, session version, active command IDs, journal hash, batch/preview/validation state remain unchanged by resize-only interaction.

Empirical status remains `NOT_RUN` until those sources actually execute on the exact head.

## Next

1. Implement a small pure/delegated splitter runtime.
2. Move the row-window notice into the upper pane and insert the accessible separator.
3. Replace fixed lower max-height with bounded runtime flex basis.
4. Add focused Node and production Playwright source qualification.
5. Audit changed-file ledger, physical-line budget, PR status, and execution evidence honestly.
