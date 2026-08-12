# PR 1066 Work Report — Adjustable Engineering Table Divider

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1066 — `feat(3d-edit): make Engineering Table divider adjustable` |
| Branch | `agent/engineering-table-adjustable-divider` |
| Current merged base | `main@48ee18125e01bd3efab0ac0b3f8e9d1f5b1041e6` — qualified PR #1061 merged |
| Deterministic current-main integration | `7f85b42e9d0f03a5107a23e7601ccf62364c2265` |
| Original source/test candidate | `8fd5229a7c65931c14fefaa3b725fcd97d777e88` |
| Mission | Make the internal horizontal boundary between the Engineering Table row-list pane and engineering/detail pane adjustable without acquiring engineering authority. |
| Engineering state | **CURRENT-MAIN INTEGRATED / QUALIFICATION PENDING** |
| Empirical execution | **NOT_RUN on the current-main candidate** — exact-head Node + production Chromium qualification is required before merge. |
| Merge state | Draft / unmerged. |

## Current-Main Reconciliation

PR #1061 merged to `main` as `48ee18125e01bd3efab0ac0b3f8e9d1f5b1041e6` after #1066 was originally authored. The old #1066 branch merge base was `9f5eb40906ff1e74ee04e263b39abbd8333ea822`.

A compare from that old merge base to current main showed **none of the six #1066 feature paths changed on main**. Current main was therefore used as the base tree and the exact six #1066 blobs were overlaid without source/test alteration. The resulting tree is `eb431b9f7ac959110429efba00dd08308b33aeae`; two-parent integration commit `7f85b42e9d0f03a5107a23e7601ccf62364c2265` preserves the original #1066 head and current main ancestry. After retarget, GitHub still reports exactly six changed files.

No support-placement/restraint, topology command, planner, transaction, source-adapter, journal, or Three authority path is part of this diff.

## User-Visible Result

The adjustable line is exactly the boundary between:

1. the upper virtualized row-list area, including `Rendering rows … while scrolling` when the row window is active; and
2. the lower engineering/detail area that begins with editors such as `MOVE_NODE / CONNECTED_RUN`.

The virtualization notice is on the upper side of the divider. This feature does not change the outer Engineering Table window resize handle or the main 3D canvas/sidecar layout.

## Authority Boundary

Presentation only:

`pointer/keyboard separator interaction -> bounded transient detail-pane height -> CSS flex-basis`

The split height lives only on the mounted `TopologyEditTableRuntime` as `tableDetailPaneHeightPx`; active pointer state lives only as `tableSplitterDrag`. Ordinary Table DOM re-renders reuse the transient height during the activation. No application store, canonical record, operation intent, planner, certification, transaction, journal, source writeback, or Three engineering authority receives either value.

Resize interaction must not call selection, Stage, Preview, Validate, Apply, command/planner/transaction, Undo/Redo, source writeback, or renderer mutation APIs.

## Interaction Contract

### Pointer

- primary-button drag only;
- pointer capture keeps the gesture stable outside the handle;
- dragging upward grows the lower/detail pane;
- dragging downward grows the upper row-list pane;
- updates clamp to deterministic usable-pane bounds;
- `touch-action: none` prevents touch scrolling from competing with resize.

### Keyboard / accessibility

- `role="separator"`;
- `aria-orientation="horizontal"`;
- `tabindex="0"`;
- `ArrowUp`: +24 px detail height;
- `ArrowDown`: -24 px detail height;
- `Home`: minimum detail height;
- `End`: current maximum detail height;
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` expose the current pixel range/value.

### Bounds

- default detail height: 210 px;
- minimum detail height: 96 px;
- reserved minimum upper row-list height: 120 px;
- splitter height used by bound math: 8 px;
- maximum derives from the populated Table rectangle and header height;
- re-render and interaction entry re-clamp the current value.

CSS keeps independent scrolling in the upper table and lower engineering/detail pane.

## Engineering Register

| ID | Type | Status | Finding / resolution |
|---|---|---|---|
| DEC-1066-01 | Scope | ACCEPTED | Internal row-list/detail split only. |
| DEC-1066-02 | State | ACCEPTED | Transient Table runtime state only; no engineering/store/journal state. |
| DEC-1066-03 | Notice placement | IMPLEMENTED | `Rendering rows …` belongs to the upper side of the requested divider. |
| DEC-1066-04 | Accessibility | IMPLEMENTED | Pointer plus keyboard separator with ARIA range metadata. |
| DEC-1066-05 | Safety | IMPLEMENTED IN SOURCE | Handlers update only transient height/drag state, CSS custom property, ARIA attributes and resize affordance state. |
| RISK-1066-01 | Small windows | BOUNDED IN SOURCE | Pure bound math reserves upper-pane space where the available Table rectangle permits it. |
| RISK-1066-02 | Re-render | RESOLVED IN SOURCE | Newly rendered separators rebind handlers; runtime height survives DOM replacement and is re-applied. |
| RISK-1066-03 | CSS geometry | OPEN FOR BROWSER QUALIFICATION | Header/splitter margins may make observed browser geometry differ by a few pixels from pure theoretical bound math. Qualification must assert actual bounded direction/range behavior rather than invent authority from CSS. |
| RISK-1066-04 | Qualification | OPEN | Current-main exact-head Node and real Chromium execution is pending. |

## Exact Changed-File Ledger

Exactly **6** feature paths are authorized:

1. `agents/PR1066_workreport.md`
2. `e2e/topology-edit-table-splitter.spec.js`
3. `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`
4. `src/workspace/viewport-productivity/topology-edit-table-splitter-runtime.js`
5. `src/workspace/viewport-productivity/topology-edit-table-styles.js`
6. `tests/topology-edit-table-splitter.test.mjs`

`topology-edit-table-runtime.js` remains intentionally untouched because it is already at the repository physical-line ceiling. No qualification workflow may enter the feature diff.

## Qualification Sources

### Focused Node

`tests/topology-edit-table-splitter.test.mjs` covers deterministic min/max calculation, default 210 px height, lower/upper clamping, short-container clamp, pointer direction semantics, keyboard increments/Home/End, and unsupported-key no-op behavior.

### Production Chromium

`e2e/topology-edit-table-splitter.spec.js` uses the visible path:

`Workspace -> load topology-edit demo -> 3D Edit -> Engineering Table -> exact canonical EDGE -> separator drag -> keyboard resize -> row-selection re-render -> row scroll`

It must prove:
- DOM order upper -> separator -> lower;
- lower pane visibly exposes the engineering editor (`MOVE_NODE / CONNECTED_RUN` on the fixture path);
- virtualization notice, when present, remains above the separator;
- real pointer drag changes upper/lower geometry in opposite directions;
- keyboard resize changes geometry and ARIA metadata;
- split height persists through a normal Table re-render;
- row scrolling still works;
- canonical hash, source hashes, journal hash, active ledger/command IDs, session version, staged batch/plan, preview, validation and intent count remain unchanged throughout resize-only interaction;
- page/console diagnostics remain clean except any existing explicit favicon allowance.

Controller access in the browser spec is read-only evidence only; no direct controller operation invocation counts as UI coverage.

## Qualification Gate

1. Run source/syntax/physical-line/`git diff --check` gates on the exact PR head.
2. Run the focused splitter Node test.
3. Run the real Playwright Chromium splitter lifecycle with one worker, zero retries and trace-on.
4. Prefer a relevant Engineering Table lifecycle smoke/regression on the same head if it can reuse already-qualified production UI paths without widening feature scope.
5. Upload machine-readable evidence + traces tied to the exact candidate head.
6. If any defect appears, register it here **before** changing production or test source, then repair narrowly without weakening assertions.
7. After a green feature/test head, update this report with exact evidence and re-run the same gate on the resulting final report-only head.
8. Do not modify this report again after the final report-only head is green.
9. Closure-audit exact six-file ledger, raw mergeability, reviews/threads/comments and current main, then head-pinned merge only if clean.

## Merge Decision

Keep PR #1066 **draft and unmerged** until its exact current-main head passes focused Node plus real production Chromium qualification. GitHub mergeability and static review are not empirical execution evidence.
