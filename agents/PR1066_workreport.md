# PR 1066 Work Report — Adjustable Engineering Table Divider

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1066 — `feat(3d-edit): make Engineering Table divider adjustable` |
| Branch | `agent/engineering-table-adjustable-divider` |
| Current merged base | `main@48ee18125e01bd3efab0ac0b3f8e9d1f5b1041e6` — qualified PR #1061 merged |
| Deterministic current-main integration | `7f85b42e9d0f03a5107a23e7601ccf62364c2265` |
| Qualified feature/test head | `660198ba46706ef45900822a071ac8f947367287` |
| Isolated qualification base | `qualification/pr1066-exact-head@6d8f5d4f817cec2bff529e656b96216963baab8d` — workflow only; not a feature diff path |
| Mission | Make the internal horizontal boundary between the Engineering Table row-list pane and engineering/detail pane adjustable without acquiring engineering authority. |
| Engineering state | **FEATURE/TEST CURRENT-MAIN QUALIFIED; FINAL REPORT-ONLY HEAD REQUALIFICATION REQUIRED** |
| Empirical execution | Run `31594221966`, job `94105828074`: exact checkout/ledger/source/line gates PASS; focused Node **4/4 PASS**; real Chromium **3/3 PASS**, one worker, zero retries. |
| Evidence artifact | `9140404490` — `pr1066-exact-head-660198ba46706ef45900822a071ac8f947367287-1`; SHA256 `e2ae6879008fd5365f28131ff723b7ec602ccd019f4080cd779243be24f2c341`. |
| Merge state | Draft / unmerged. This report update creates the final report-only merge-candidate head and that exact head must pass the same gate. |

## Current-Main Reconciliation

PR #1061 merged to `main` as `48ee18125e01bd3efab0ac0b3f8e9d1f5b1041e6` after #1066 was originally authored. The old #1066 branch merge base was `9f5eb40906ff1e74ee04e263b39abbd8333ea822`.

A compare from that old merge base to current main showed **none of the six #1066 feature paths changed on main**. Current main was therefore used as the base tree and the exact six #1066 blobs were overlaid without source/test alteration. The resulting tree is `eb431b9f7ac959110429efba00dd08308b33aeae`; two-parent integration commit `7f85b42e9d0f03a5107a23e7601ccf62364c2265` preserves the original #1066 head and current main ancestry. After retarget, GitHub still reported exactly six changed files.

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

Resize interaction does not call selection, Stage, Preview, Validate, Apply, command/planner/transaction, Undo/Redo, source writeback, or renderer mutation APIs.

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
| DEC-1066-03 | Notice placement | IMPLEMENTED + CHROMIUM PASS | `Rendering rows …` belongs to the upper side of the requested divider. |
| DEC-1066-04 | Accessibility | IMPLEMENTED + CHROMIUM PASS | Pointer plus keyboard separator with ARIA range metadata. |
| DEC-1066-05 | Safety | QUALIFIED ON FEATURE/TEST HEAD | Browser authority evidence remains unchanged through resize-only pointer, keyboard, re-render and scrolling interaction. |
| RISK-1066-01 | Small windows | NODE PASS | Pure bound math reserves upper-pane space where available and clamps short-window detail height deterministically. |
| RISK-1066-02 | Re-render | CHROMIUM PASS | Split height survives a normal Table row-selection DOM re-render. |
| RISK-1066-03 | CSS geometry | RESOLVED EMPIRICALLY ON FEATURE/TEST HEAD | Real Chromium proved the requested pointer direction, opposite upper/lower geometry changes, keyboard resize and ARIA/current-height agreement within the authored tolerance. No geometry repair was needed. |
| RISK-1066-04 | Qualification | CLOSED FOR FEATURE/TEST HEAD | Exact-head source/ledger/line + Node + three real Chromium lifecycles passed on `660198ba46706ef45900822a071ac8f947367287`. Final report-only head rerun remains mandatory. |

## Exact Changed-File Ledger

Exactly **6** feature paths are authorized:

1. `agents/PR1066_workreport.md`
2. `e2e/topology-edit-table-splitter.spec.js`
3. `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`
4. `src/workspace/viewport-productivity/topology-edit-table-splitter-runtime.js`
5. `src/workspace/viewport-productivity/topology-edit-table-styles.js`
6. `tests/topology-edit-table-splitter.test.mjs`

`topology-edit-table-runtime.js` remains intentionally untouched because it is already at the repository physical-line ceiling. The temporary qualification workflow lives only on the isolated qualification base and is not an authorized feature path.

## Exact-Head Empirical Qualification

### Run 31594221966 — feature/test candidate PASS

Exact candidate head: `660198ba46706ef45900822a071ac8f947367287`.

Job `94105828074` passed:
- exact checkout of the PR head;
- exact six-file ledger gate;
- `git diff --check`;
- syntax checks and physical-line `<300` gates for implementation/test modules;
- focused Node splitter qualification: **4 tests, 4 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**;
- real Playwright Chromium: **3 tests, 3 pass**, one worker, zero retries, trace-on;
- evidence upload.

Focused Node tests passed for deterministic usable bounds, short-window clamping, pointer direction semantics, and bounded deterministic keyboard controls.

Real Chromium passed all three production UI lifecycles on the same exact head:
1. `Engineering Table row/detail divider is pointer and keyboard adjustable without engineering mutation`;
2. `S-007 support station follows the full certified Table lifecycle and keeps P-011 movement blocked`;
3. `S-007 restraint follows the certified Table lifecycle without moving support authority`.

The splitter browser lifecycle uses the visible production route:

`Workspace -> load topology-edit demo -> 3D Edit -> Engineering Table -> exact canonical EDGE -> separator drag -> keyboard resize -> row-selection re-render -> row scroll`

It proves upper -> separator -> lower DOM ordering, `MOVE_NODE / CONNECTED_RUN` visible in the lower pane, real pointer geometry movement in opposite pane directions, keyboard resize and ARIA updates, split persistence after normal Table re-render, row scrolling, and resize-only authority no-op across canonical hash, source semantic/byte hashes, journal/active-ledger/command identity, session version, staged batch/plan, preview, validation and intent count. Controller access is read-only evidence only.

### Artifact custody

Artifact `9140404490`:
- name `pr1066-exact-head-660198ba46706ef45900822a071ac8f947367287-1`;
- digest `sha256:e2ae6879008fd5365f28131ff723b7ec602ccd019f4080cd779243be24f2c341`;
- 8,786,545 bytes;
- run metadata names head branch `agent/engineering-table-adjustable-divider` and exact head `660198ba46706ef45900822a071ac8f947367287`.

Downloaded evidence inspection confirmed:
- `artifacts/pr1066-run-identity.json` contains `candidateHead: 660198ba46706ef45900822a071ac8f947367287`, base `6d8f5d4f817cec2bff529e656b96216963baab8d`, run `31594221966`, attempt `1`, PR `1066`;
- `artifacts/pr1066-playwright.json` reports `expected: 3`, `unexpected: 0`, `skipped: 0`, `flaky: 0`, and each of the three expected tests has result `passed`;
- exactly **3** Playwright `trace.zip` files are present, one for each Chromium lifecycle.

No production or test defect surfaced in this qualification run, so no source/test repair was made after current-main integration.

## Final Report-Only Gate

This report update is intentionally report-only. It creates the final merge-candidate head. **Do not edit this report again after that final head passes.**

1. Require the same exact-head workflow on the new report-only head: exact checkout/ledger/source/line PASS, focused Node 4/4 PASS, real Chromium 3/3 PASS, evidence upload PASS.
2. Restore PR base to current `main`.
3. Confirm current main has not advanced beyond the integrated main parent. If it has advanced, reconcile and requalify rather than merging stale.
4. Closure-audit raw mergeable/rebaseable/mergeable-state, exact six-file ledger, submitted reviews, review threads/comments, and absence of qualification workflow leakage.
5. Update stale PR description without changing head and mark ready only if closure is clean.
6. Merge only with the exact final report-only qualified SHA pinned as expected head, using repository merge semantics.
7. Verify the resulting `main` merge commit.
