# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; the stage record preserves material history.

## 0. Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| PR | #1020 · `agent/fix-topology-validation-worker-production` → `main` · OPEN / DRAFT / mergeable |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current production HEAD | `e1c5c0b7fe54c8cd8d8c31f872e6bd523bf7c672` before this report update |
| Current stage | Stage 4 — dense/dynamic spreadsheet shell; browser geometry diagnosis |
| Engineering status | PARTIAL. Density, horizontal containment, five frozen columns, lower-region separation and safe collapsed→open drag behavior are implemented. Vertical viewport ownership remains unresolved. |
| Validation status | On `e1c5c0b7...`: `main-gate` PASS; Table Slice 3/6 source, architecture, governed relation/transaction and production-build gates PASS; both fail only in the shared Chromium table lifecycle. |
| Current blocker | **ISS-008** — the latest absolute-inset runtime mount makes `.topology-edit-table--populated` hidden/zero-height even though the outer floating window is correctly placed and visibly full-sized. |
| Exact next action | Add geometry-only diagnostics to the existing Stage-4 Chromium layout test, preserving every current assertion. Measure the bounding boxes/computed layout of details → body → runtime mount → populated surface → data scroll before another production CSS mutation. |

### Handover in 60 seconds

- The original validation-worker production defect remains fixed; exact Vite builds emit `topology-edit-validation-worker-*.js`.
- Stage 4 already has compact 11px styling, automatic X/Y overflow, sticky header, five frozen columns with deterministic offsets, lower-controls separation, a bounded open-window inline track, and a collapsed-panel drag guard.
- `e9345def...` fixed the native `<summary>` toggle/custom-drag race. Keep it: the floating table now opens at the correct top/right location.
- `33ce5bf2...` nested `%` heights hid the populated surface and was rejected.
- `95a5ecaa...` restored populated visibility but left `.topology-edit-table__scroll.clientHeight === 0` before/after resize.
- `e1c5c0b7...` tried a positioned body + absolute `inset:5px` runtime mount. Exact Chromium now shows a blank table body and reports `.topology-edit-table--populated` hidden; reject this sizing model.
- After four bounded CSS experiments, the next change is test-only evidence collection, not another speculative production layout edit.
- Stage 5 direct cell editing remains blocked until Stage 4 is green.

## 1. Engineering Invariants

1. Canonical topology is the only model authority.
2. Table/DOM draft state never mutates canonical topology before certified Apply.
3. Preview and validation are non-mutating; Apply remains the governed mutation boundary and one applied batch remains one undo unit.
4. Existing column descriptors plus `deriveTopologyEditTableCellCapability` control editability. `AVAILABLE` can be direct; `NEEDS_INPUT` requires compound governed input; blocked/unrepresentable fields are not arbitrary text.
5. Catalogue-controlled and derived values are never guessed.
6. Stale revisions fail closed or explicitly rebase.
7. Stage 4 browser geometry and pointer reachability must be green before spreadsheet edit semantics expand.
8. No new CI workflows, dependency upgrades, broad refactors, hidden fallbacks or backup files for this assignment.

## 2. Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| ISS-001 | Defect | VALIDATED | Production validation worker requires Vite-recognizable `new Worker(new URL(...))`. |
| ISS-002 | Defect | IMPLEMENTED | Removed fixed `min(48vh,470px)` inner table cap / competing scroll behavior. |
| ISS-003 | Defect | VALIDATED | Frozen authority is Select, Tag, Type, Connect From, Connect To; CSS/test aligned. |
| ISS-004 | Defect | IN_PROGRESS | Data viewport must consume remaining resizable height. |
| ISS-005 | Defect | PARTIAL | Ancestor min-size/flex sizing caused zero-height/pointer overlap; bounded repairs landed. |
| ISS-006 | Defect | IMPLEMENTED / REQUALIFY | Open-window auto column escaped to max-content; `minmax(0,1fr)` inline track landed at `d8aeadc5...`. |
| ISS-007 | Defect | IMPLEMENTED / PARTIAL-VALIDATED | Collapsed `<summary>` pointerdown seeded closed geometry into drag state; guarded at `e9345def...`. |
| **ISS-008** | Defect | **IN_PROGRESS** | Direct-child block-size transfer through the native `<details>` floating window remains invalid; current absolute-inset attempt hides the populated surface. |
| IMP-001 | Improvement | VALIDATED | Compact typography/controls. |
| IMP-002 | Improvement | ACCEPTED | Direct governed spreadsheet cells. |
| IMP-003 | Improvement | ACCEPTED | Keyboard navigation + staged/invalid/stale cell state. |
| IMP-004 | Improvement | ACCEPTED / LATER | Windowed rendering after active-cell semantics stabilize. |
| QST-001 | Question | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. |
| RISK-001 | Risk | ACCEPTED | Spreadsheet drafts must never become a second model authority. |
| RISK-002 | Risk | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. |
| RISK-003 | Risk | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. |

### ISS-008 — exact `e1c5c0b7...` evidence

**One-commit scope:** from report head `809a7437...`, exactly `topology-edit-table-styles.js`, 3 additions / 3 deletions. No runtime, intent, transaction or workflow file changed.

**Pre-browser authority:** Table Slice 3 exact-head/line budget PASS; 23/23 Table Node contracts PASS; production build PASS; validation-worker asset emitted. Table Slice 6 architecture guards, governed M06/M10 contracts, retained transactions, bundle ownership and production build all PASS.

**Chromium result:** both Table Slice 3 and Slice 6 fail only in the shared production Table Canvas lifecycle. Slice 3 fails all three tests:
- PIPE Select is found/visible/enabled/stable but outer `<details>`/titlebar geometry intercepts pointer events.
- Layout test fails immediately because `.topology-edit-table--populated` resolves in DOM but is hidden.
- GATE Select has the same outer-window interception.

**Artifact evidence:** the titlebar is correctly located near the top/right after ISS-007, and the large floating window/body is visibly present, but the body is blank. The projection/grid remains in the DOM/accessibility snapshot. This is presentation geometry, not projection or engineering-authority loss.

**Rejected layout attempts:**
- `33ce5bf2...`: nested `%` heights — populated surface hidden.
- `95a5ecaa...`: one-track descendant grids — populated surface visible but data-scroll height remained exactly zero.
- `e1c5c0b7...`: positioned body + absolute inset mount — populated surface hidden again.

**Next evidence step:** instrument the existing browser test only. Capture computed style + bounding rectangles for the floating `<details>`, direct body, runtime mount, populated surface, header, data scroll and lower region. Attach the JSON before the unchanged visibility/resize assertions. No production mutation until those measurements are available.

## 3. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| 1 | COMPLETE | initialize work report before spreadsheet production edits |
| 2 | COMPLETE | synchronize to PR-numbered living report |
| 3 | COMPLETE | reconcile draft PR scope/metadata and exact changed files |
| 4 | PARTIAL | compact reachable dynamic X/Y spreadsheet shell |
| 5 | NOT_STARTED | direct PIPE-length cell + keyboard/draft semantics |
| 6 | NOT_STARTED | governed VALVE/TEE compound-cell integration |
| 7 | NOT_STARTED | virtualization and bounded production-backed edit expansion |
| 8 | NOT_STARTED | final reconciliation and exact-head closure |

## 4. Stage 4 Record

- Density: compact typography, controls and cells implemented; browser font-size assertion passed on earlier Stage-4 heads.
- Frozen context: source-authoritative five-column set + deterministic left offsets implemented and previously validated.
- Lower-region separation: data rows and editors/workflow use separate scroll domains.
- ISS-006: `d8aeadc5...` constrained the open-window inline track; old 2848px max-content escape moved out of the failure path.
- ISS-007: `e9345def...` prevents custom drag startup while `<details>` is collapsed; keep this guard.
- ISS-008 remains. Repeated source/contract/build green + browser-only failures prove this is isolated to production floating-window layout/reachability.

### Geometry-diagnostic substage — before implementation

**Objective:** obtain exact browser boxes/computed layout at the failing boundary without altering product behavior or weakening test expectations.

**Expected file:** `e2e/topology-edit-table-authority.spec.js` only.

**Planned instrumentation:** extend the existing layout test signature with `testInfo`; before `expect(surface).toBeVisible()`, measure panel/body/mount/surface/header/scroll/lower using `getBoundingClientRect()` and `getComputedStyle()`, then attach JSON as `engineering-table-geometry`. Existing density, overflow, frozen, compact-width/height and resize-growth assertions remain unchanged.

**Decision rule after evidence:** if the direct body itself lacks the second-row block size, move the open native `<details>` from grid to explicit column flex and give the direct body `flex:1 1 0`. If body is healthy but mount is zero, repair only mount sizing. No speculative semantic changes.

## 5. Validation Ledger

### Exact `e1c5c0b7...`

| Check | Result |
|---|---|
| `main-gate` | PASS |
| Table Slice 3 exact-HEAD / line budget | PASS |
| Table Node contracts | PASS 23/23 |
| Table Slice 3 production build | PASS |
| Validation-worker asset emitted | PASS |
| Table Slice 6 architecture / M06-M10 / transactions / bundle / build | PASS |
| Table Slice 3 Chromium | FAIL 3/3 |
| Table Slice 6 Chromium | FAIL |
| Populated surface visibility | FAIL: hidden |
| Latest screenshot | floating window/body visible and correctly placed; table content blank |

## 6. Changed-File Ledger

| File | Purpose |
|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited production worker fix |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | worker regression |
| `agents/PR1020_workreport.md` | living engineering source of truth |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | density/scroll/frozen/window sizing |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | stable frozen markers + lower-region wrapper |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | safe open/drag interaction boundary |
| `e2e/topology-edit-table-authority.spec.js` | production layout + authority qualification / next geometry evidence |

No `.github/workflows/*` changes.

## 7. Next-Agent Handover

- PR/branch: #1020 / `agent/fix-topology-validation-worker-production`.
- Production head before this report: `e1c5c0b7fe54c8cd8d8c31f872e6bd523bf7c672`.
- Keep the worker fix, five frozen columns, width-track repair, lower wrapper and `beginDrag()` collapsed-state guard.
- Next commit is **test-only geometry instrumentation**, not production CSS.
- Preserve all existing Chromium assertions.
- Stage 5 must use existing cell-capability authority; PIPE length is the only direct scalar today.

## 8. Closure Record

Mission complete: **NO**. Stage 4 remains blocked by ISS-008; Stages 5-8 have not started. PR remains draft. Final-head validation and reconciliation remain pending.
