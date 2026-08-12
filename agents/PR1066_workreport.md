# PR 1066 Work Report — Adjustable Engineering Table Divider

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1066 — `feat(3d-edit): make Engineering Table divider adjustable` |
| Branch | `agent/engineering-table-adjustable-divider` |
| Base | stacked on PR #1061 at `9f5eb40906ff1e74ee04e263b39abbd8333ea822` |
| Bootstrap | `fdf81ada8518486a6635e6af971d8d215e3e08ff` — empty tree-equivalent commit |
| Final source/test candidate before this report-only sync | `8fd5229a7c65931c14fefaa3b725fcd97d777e88` |
| Mission | Make the internal horizontal boundary between the Engineering Table row-list pane and engineering/detail pane adjustable without acquiring engineering authority. |
| Engineering state | SOURCE COMPLETE / static diff audit clean |
| Empirical execution | **NOT_RUN** — repository workflows are retired and this agent has no exact-head browser runner. |
| Merge state at source candidate | GitHub `mergeable: true`, draft; zero workflow runs and zero commit statuses. |

## User-Visible Result

The adjustable line is exactly the boundary between:

1. the virtualized row-list area, including `Rendering rows 1–120 of 266 while scrolling.` when the row window is active; and
2. the engineering/detail area that begins with editors such as `MOVE_NODE / CONNECTED_RUN`.

The virtualization notice was moved to the upper row-list pane. The new separator follows it, and the engineering/detail pane follows the separator. This does not change the outer Engineering Table window resize handle or the main 3D canvas/sidecar layout.

## Authority Boundary

This PR is presentation-only:

`pointer/keyboard separator interaction -> bounded transient detail-pane height -> CSS flex-basis`

The split height is stored only as `tableDetailPaneHeightPx` on the mounted `TopologyEditTableRuntime` object so ordinary Table `innerHTML` re-renders retain the current split during that activation. No application store, canonical record, command, planner, transaction, journal, or Three authority receives this value.

Resize interaction does **not** call Stage, Preview, Validate, Apply, selection, command, planner, transaction, Undo/Redo, source writeback, or renderer mutation APIs.

## Implemented Interaction Contract

### Pointer

- Primary-button drag on the separator adjusts the lower/detail pane.
- Dragging upward grows engineering details; dragging downward grows the row-list pane.
- Pointer capture keeps the gesture stable outside the 8 px handle.
- `touch-action: none` prevents touch scrolling from competing with resize.
- Every update is clamped to deterministic usable-pane bounds.

### Keyboard / accessibility

- `role="separator"`
- `aria-orientation="horizontal"`
- `tabindex="0"`
- `ArrowUp`: grow detail pane by 24 px
- `ArrowDown`: shrink detail pane by 24 px
- `Home`: minimum detail height
- `End`: current maximum detail height
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` expose current pixel authority.

### Bounds

- default detail height: 210 px;
- minimum detail height: 96 px;
- reserved minimum upper row-list height: 120 px;
- splitter height used by bound math: 8 px;
- maximum is derived from the actual populated Table rectangle and current header height;
- the current value is re-clamped whenever the Table re-renders or the user starts/continues an adjustment.

The CSS retains independent scrolling in the row table and lower engineering/details pane.

## Engineering Register

| ID | Type | Status | Finding / resolution |
|---|---|---|---|
| DEC-1066-01 | Scope | ACCEPTED | Internal row-list/detail split only. |
| DEC-1066-02 | State | ACCEPTED | Transient Table runtime property only; no engineering/store/journal state. |
| DEC-1066-03 | Notice placement | IMPLEMENTED | `Rendering rows …` is now on the upper side of the requested divider. |
| DEC-1066-04 | Accessibility | IMPLEMENTED | Pointer plus keyboard separator with ARIA range metadata. |
| DEC-1066-05 | Safety | IMPLEMENTED IN SOURCE | Resize handlers update only the runtime height property, CSS custom property, ARIA attributes, and resize affordance dataset. |
| RISK-1066-01 | Small windows | BOUNDED | Pure bound math clamps detail height while reserving upper-pane height where the available Table rectangle permits it. |
| RISK-1066-02 | Re-render | RESOLVED IN SOURCE | Every newly rendered separator binds its own handlers; runtime height survives the DOM replacement and is re-applied after render. |
| RISK-1066-03 | Qualification | OPEN | No exact-head Chromium/Playwright execution is available, so no browser PASS is claimed. |

## Exact Changed-File Ledger

1. `agents/PR1066_workreport.md`
2. `e2e/topology-edit-table-splitter.spec.js`
3. `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`
4. `src/workspace/viewport-productivity/topology-edit-table-splitter-runtime.js`
5. `src/workspace/viewport-productivity/topology-edit-table-styles.js`
6. `tests/topology-edit-table-splitter.test.mjs`

No topology canonical, command, planner, transaction, journal, support, source-adapter, or Three/WebGL module changed. `topology-edit-table-runtime.js` was intentionally left untouched because it is already at the repository physical-line ceiling.

## Qualification Source Authored — NOT EXECUTED

### `tests/topology-edit-table-splitter.test.mjs`

Covers:

- deterministic `{ min, max }` calculation;
- default 210 px detail height;
- lower/upper clamping;
- short outer-container clamp;
- pointer direction semantics;
- keyboard increments plus Home/End bounds;
- unsupported keys as no-ops.

### `e2e/topology-edit-table-splitter.spec.js`

Uses the visible production path:

`Workspace -> load topology-edit demo -> 3D Edit -> Engineering Table -> select canonical EDGE -> drag separator -> keyboard resize -> select another row -> scroll row list`

Assertions cover:

- separator DOM ordering as upper -> separator -> lower;
- selected EDGE lower pane visibly contains `MOVE_NODE / CONNECTED_RUN`;
- row-window notice, when present, is inside the upper pane;
- real pointer drag changes upper/lower geometry in opposite directions;
- keyboard resize changes geometry and updates ARIA metadata;
- split height survives a normal Table row-selection re-render;
- row scrolling remains functional;
- canonical hash, source hashes, journal hash, active ledger/command IDs, session version, staged batch/plan, preview, validation, and intent count remain unchanged throughout resize-only interaction;
- page/console diagnostics remain clean except the existing favicon allowance.

Controller access in the spec is read-only evidence only; no direct controller invocation is used as UI coverage.

## Static Closure Audit

- Exact source/test candidate: `8fd5229a7c65931c14fefaa3b725fcd97d777e88`.
- GitHub reports PR #1066 mergeable against its stacked #1061 base.
- Exact candidate has **zero workflow runs** and **zero commit statuses**.
- No submitted PR reviews or inline review threads at source candidate.
- Exact changed-file count: **6**.
- New/modified implementation and E2E modules were checked at physical line 300; no content exists at or beyond that line.
- Existing already-full `topology-edit-table-runtime.js` was not modified.
- No engineering authority file is in the diff.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| base `9f5eb40906ff1e74ee04e263b39abbd8333ea822` | PR #1061 report-sync head; divider absent |
| bootstrap `fdf81ada8518486a6635e6af971d8d215e3e08ff` | tree-equivalent / zero changed files |
| source/test candidate `8fd5229a7c65931c14fefaa3b725fcd97d777e88` | source complete, six-file diff, static audit clean, mergeable, zero statuses/runs, browser execution NOT_RUN |

## Merge Decision

Keep PR #1066 **draft and unmerged** until an exact-head runner executes the focused Node and production Playwright qualification sources. GitHub mergeability is not treated as qualification evidence.
