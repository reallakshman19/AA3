# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; the stage record preserves material history.

## 0. Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| PR | #1020 · `agent/fix-topology-validation-worker-production` → `main` · OPEN / DRAFT / mergeable |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current production HEAD | `33ce5bf2d78e56a21422511c39453516c0bbe5e6` before this report update |
| Current stage | Stage 4 — dense/dynamic spreadsheet shell; deterministic vertical stretch repair |
| Engineering status | PARTIAL. Density, horizontal containment, five frozen columns, lower-region separation and safe collapsed→open drag behavior are implemented. Vertical viewport ownership remains broken. |
| Validation status | On `33ce5bf2...`: exact-head/line guard PASS, 23/23 Table Node contracts PASS, production build PASS with validation-worker asset; Table Slice 3 Chromium FAILS 3/3. |
| Current blocker | **ISS-008** — the attempted nested `%`-height flex repair overconstrained the runtime mount/populated surface. The populated section now resolves hidden/zero-height while the outer floating window and body occupy the panel. |
| Exact next action | Replace nested percentage-height flex sizing with a one-track stretch layout in `topology-edit-table-styles.js` only; keep the Chromium oracle unchanged; requalify exact head before Stage 5. |

### Handover in 60 seconds

- The original validation-worker production defect remains fixed; Vite production builds emit `topology-edit-validation-worker-*.js`.
- Stage 4 already has compact 11px styling, automatic X/Y overflow, sticky header, five frozen columns with deterministic offsets, lower-controls separation, a bounded open-window inline track, and a collapsed-panel drag guard.
- `e9345def...` fixed the native `<summary>` toggle/custom-drag race. Keep it: screenshots after that commit show the panel opening in the correct top/right location.
- `33ce5bf2...` tried `flex-direction:column` plus `height:100%` on the runtime mount and populated child. That attempt is **not correct**: latest Chromium says `.topology-edit-table--populated` is hidden and screenshots show a blank body.
- The next repair must remove percentage-height chaining and let the outer definite grid track stretch a one-cell body → runtime mount → populated surface hierarchy.
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
| ISS-005 | Defect | PARTIAL | Ancestor min-size/flex sizing caused zero-height/pointer overlap; multiple bounded repairs landed. |
| ISS-006 | Defect | IMPLEMENTED / REQUALIFY | Open-window auto column escaped to max-content; `minmax(0,1fr)` inline track landed at `d8aeadc5...`. |
| ISS-007 | Defect | IMPLEMENTED / PARTIAL-VALIDATED | Collapsed `<summary>` pointerdown seeded closed geometry into drag state; guarded at `e9345def...`. |
| **ISS-008** | Defect | **IN_PROGRESS** | Runtime mount/populated vertical ownership remains invalid; latest `%`-height repair collapses populated surface to hidden/zero-height. |
| IMP-001 | Improvement | VALIDATED | Compact typography/controls. |
| IMP-002 | Improvement | ACCEPTED | Direct governed spreadsheet cells. |
| IMP-003 | Improvement | ACCEPTED | Keyboard navigation + staged/invalid/stale cell state. |
| IMP-004 | Improvement | ACCEPTED / LATER | Windowed rendering after active-cell semantics stabilize. |
| QST-001 | Question | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. |
| RISK-001 | Risk | ACCEPTED | Spreadsheet drafts must never become a second model authority. |
| RISK-002 | Risk | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. |
| RISK-003 | Risk | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. |

### ISS-008 — current exact-browser state

**Exact head:** `33ce5bf2d78e56a21422511c39453516c0bbe5e6`.

**Pre-browser evidence:** exact-head/line budget PASS; 23/23 Table Node contracts PASS; production build PASS; bundle check PASS; validation-worker asset emitted.

**Chromium failures:**
- PIPE first-row Select is found, visible/enabled/stable, but outer body/titlebar/details intercept pointer events.
- Layout test fails earlier than previous heads: `.topology-edit-table--populated` resolves in DOM but is `hidden`.
- GATE Select has the same outer-window pointer interception.

**Artifact evidence:** floating window and body are correctly placed and fill the expected area, but the body is visually blank. This is materially different from `e9345def...`, where header/lower controls were visible but compressed near the top. Therefore the `%`-height change regressed the child surface to zero used height.

**Rejected repair:** nested `height:100%` on both runtime mount and populated child. In the current nested flex/grid context that creates an overconstrained/indefinite percentage chain rather than reliable remaining-height allocation.

**Chosen next repair:** use explicit one-track stretching instead of percentage heights:
- outer body: one-column/one-row grid with `minmax(0,1fr)` tracks;
- runtime mount: one-column/one-row grid with `minmax(0,1fr)` tracks;
- populated surface: default grid-item stretch with `min-width:0; min-height:0`; no wrapper-level `%` height or wrapper-level flex growth;
- populated surface itself remains the internal column flex that allocates header / data viewport / lower controls.

This is presentation-only and leaves projection, selection, intent, worker, transaction and history authority untouched.

## 3. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| 1 | COMPLETE | initialize work report before spreadsheet production edits |
| 2 | COMPLETE | synchronize to PR-numbered living report |
| 3 | COMPLETE | reconcile draft PR scope/metadata and exact changed files |
| 4 | PARTIAL | compact reachable dynamic X/Y spreadsheet shell |
| 5 | NOT_STARTED | direct PIPE-length cell + keyboard/draft semantics |
| 6 | NOT_STARTED | governed VALVE/TEE compound-cell integration |
| 7 | NOT_STARTED | virtualization and only bounded production-backed edit expansion |
| 8 | NOT_STARTED | final reconciliation and exact-head closure |

## 4. Stage 4 Record

- Density: compact typography, controls and cells implemented; Chromium font-size assertion passed on earlier Stage-4 heads.
- Frozen context: source-authoritative five-column set + deterministic left offsets implemented and previously validated.
- Lower-region separation: grid rows and editors/workflow use separate scroll domains.
- ISS-006: `d8aeadc5...` constrained the open-window column to `minmax(0,1fr)`; old 2848px max-content escape is no longer the first blocker.
- ISS-007: `e9345def...` changed `beginDrag()` to return when `<details>` is closed; keep this production guard.
- Failed ISS-008 attempt: `33ce5bf2...` changed runtime mount/populated child to column-flex + `height:100%`. Exact-browser evidence proves this attempt collapses the populated child and must be replaced, not papered over.

### Next Stage-4 repair — before implementation

**Objective:** make the body, runtime mount and populated surface stretch deterministically through the outer window’s definite second grid row, without percentage-height resolution.

**Expected production file:** `src/workspace/viewport-productivity/topology-edit-table-styles.js` only.

**Planned CSS semantics:** convert body and runtime mount to single-cell grid containers with `minmax(0,1fr)` tracks; remove `height:100%`/wrapper flex from the mount and populated-child wrapper rule; retain populated surface’s own internal column-flex distribution, overflow ownership, frozen columns, empty-model behavior and lower-region cap.

**Validation:** exact one-commit diff; unchanged Table Slice 3/6 Chromium; remaining table slices/main-gate. Do not start Stage 5 until these browser authorities are green.

## 5. Validation Ledger

### Exact `33ce5bf2...`

| Check | Result |
|---|---|
| Table exact-HEAD / line budget | PASS |
| Table Node contracts | PASS 23/23 |
| Production build | PASS |
| Bundle check | PASS |
| Validation-worker asset emitted | PASS |
| PIPE row reachability | FAIL; outer body/titlebar/details intercept pointer |
| Populated surface initial visibility | FAIL; DOM node resolves but is hidden |
| M06/M10 row reachability | FAIL; same outer-window interception |
| Latest screenshot | outer floating window/body visible; table body blank |

No exact-head claim should be inherited from earlier commits. Re-read all required workflows after the next production head.

## 6. Changed-File Ledger

| File | Purpose |
|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited production worker fix |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | worker regression |
| `agents/PR1020_workreport.md` | living engineering source of truth |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | density/scroll/frozen/window sizing |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | stable frozen markers + lower-region wrapper |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | safe open/drag interaction boundary |
| `e2e/topology-edit-table-authority.spec.js` | production layout + authority qualification |

No `.github/workflows/*` changes.

## 7. Next-Agent Handover

- PR/branch: #1020 / `agent/fix-topology-validation-worker-production`.
- Pre-report production HEAD: `33ce5bf2d78e56a21422511c39453516c0bbe5e6`.
- Keep the worker fix, five frozen columns, width-track repair, lower wrapper and `beginDrag()` closed-state guard.
- Next production mutation: styles only; replace the nested `%`-height flex chain with explicit single-track stretch layout.
- Leave the Chromium E2E unchanged for the first pass.
- Stage 5 must use existing cell-capability authority; PIPE length is the only direct scalar today.

## 8. Closure Record

Mission complete: **NO**. Stage 4 remains blocked by ISS-008; Stages 5-8 have not started. PR remains draft. Final-head validation and reconciliation remain pending.
