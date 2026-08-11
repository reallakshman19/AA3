# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; the stage record preserves material history.

## 0. Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| PR | #1020 · `agent/fix-topology-validation-worker-production` → `main` · OPEN / DRAFT / mergeable |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current production HEAD | `95a5ecaaa67a6f1002da1530266f9b9e0fe883d5` before this report update |
| Current stage | Stage 4 — dense/dynamic spreadsheet shell; definite runtime-mount height repair |
| Engineering status | PARTIAL. Density, horizontal containment, five frozen columns, lower-region separation and safe collapsed→open drag behavior are implemented. Data viewport height remains zero. |
| Validation status | On `95a5ecaa...`: `main-gate`, Table Slice 4, SJSON render/interaction and non-FEA input check PASS. Table Slice 3 and Slice 6 FAIL only in Chromium after their source/contracts/build gates pass. |
| Current blocker | **ISS-008** — outer panel/body are correctly sized, populated surface is visible, but `.topology-edit-table__scroll.clientHeight === 0` before and after panel resize because body → runtime-mount block-size transfer is still indefinite. |
| Exact next action | Give the runtime mount a definite inset containing block in `topology-edit-table-styles.js` only: positioned body, absolute `inset:5px` mount, column flex mount, populated child flex-fill; no percentage-height chain. Keep the Chromium oracle unchanged. |

### Handover in 60 seconds

- The production validation-worker fix remains healthy; exact production builds emit `topology-edit-validation-worker-*.js`.
- Stage 4 already has compact 11px styling, automatic X/Y overflow, sticky header, five frozen columns with deterministic offsets, lower-controls separation, a bounded open-window inline track, and a safe collapsed-panel drag guard.
- `e9345def...` fixed the native `<summary>` toggle/custom-drag race; keep it. The Engineering Table now opens in the correct top/right location.
- `33ce5bf2...` tried nested `%` heights and made the populated surface hidden; rejected.
- `95a5ecaa...` replaced that with one-track grid stretching. This restores populated-surface visibility and keeps the outer panel correct, but the data viewport is still exactly `0px` high. Header and lower region therefore occupy the same row-hit geometry and intercept clicks.
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
| **ISS-008** | Defect | **IN_PROGRESS** | Populated surface is visible but its internal data-scroll flex item receives zero block size because runtime mount height is not definite. |
| IMP-001 | Improvement | VALIDATED | Compact typography/controls. |
| IMP-002 | Improvement | ACCEPTED | Direct governed spreadsheet cells. |
| IMP-003 | Improvement | ACCEPTED | Keyboard navigation + staged/invalid/stale cell state. |
| IMP-004 | Improvement | ACCEPTED / LATER | Windowed rendering after active-cell semantics stabilize. |
| QST-001 | Question | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. |
| RISK-001 | Risk | ACCEPTED | Spreadsheet drafts must never become a second model authority. |
| RISK-002 | Risk | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. |
| RISK-003 | Risk | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. |

### ISS-008 — exact `95a5ecaa...` evidence

**Pre-browser authority:** exact-head/line-budget PASS; 23/23 Table Node contracts PASS; production build PASS; bundle check PASS; validation-worker asset emitted. Slice 6 also passes architecture guards, governed M06/M10 contracts, retained transaction contracts and production build before reaching the same browser failure.

**Chromium failures:**
- PIPE first-row Select is visible/enabled/stable, but pointer events are intercepted by `.topology-edit-table__scroll`, `.topology-edit-table__header` and `.topology-edit-table__lower`.
- Layout test reaches the populated surface, density, overflow and frozen-column assertions. After setting panel `720x460`, the data-scroll `clientHeight` is `0`. Increasing the panel height to `760px` grows the panel by >120px, but data-scroll remains `0`; expected growth >80px.
- GATE Select has the same sibling-interception pattern, so M06/M10 editors remain unreachable by a real click.

**Artifact evidence:** floating window/body are correctly placed and visibly occupy the panel. Header and lower controls sit at the top with a large blank remainder; no data rows are visually allocated. The projection/grid remains present in the DOM/accessibility tree. This isolates the defect to block-size transfer, not projection or engineering authority.

**Rejected repairs:**
- nested `height:100%` on mount/child (`33ce5bf2...`) — made the populated surface hidden;
- one-track grid stretch alone (`95a5ecaa...`) — restores visibility but still leaves the scroll flex item at zero height.

**Chosen next repair:** make the already-proven full-height body a containing block and give the runtime mount an explicit definite inset size without percentages:
- body: `position:relative; display:block; padding:0`;
- runtime mount: `position:absolute; inset:5px; display:flex; flex-direction:column; min-width:0; min-height:0`;
- populated child: `flex:1 1 0; min-width:0; min-height:0; height:auto`;
- populated surface itself retains its internal column flex that allocates header / data viewport / lower controls.

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

- Density: compact typography, controls and cells implemented; browser font-size assertion has passed.
- Frozen context: source-authoritative five-column set + deterministic left offsets implemented and previously validated.
- Lower-region separation: grid rows and editors/workflow use separate scroll domains.
- ISS-006: `d8aeadc5...` constrained the open-window column to `minmax(0,1fr)`; old 2848px max-content escape is no longer the first blocker.
- ISS-007: `e9345def...` changed `beginDrag()` to return when `<details>` is closed; keep this guard.
- Rejected ISS-008 attempt: `33ce5bf2...` nested percentage heights hid the populated surface.
- Partial ISS-008 attempt: `95a5ecaa...` uses one-track grid stretch; populated surface is visible, but its data viewport remains exactly zero-height.

### Next Stage-4 repair — before implementation

**Objective:** make the runtime mount’s block size definite from the already-correct body rectangle, without percentage-height resolution.

**Expected production file:** `src/workspace/viewport-productivity/topology-edit-table-styles.js` only.

**Planned CSS semantics:** positioned body + absolute `inset:5px` runtime mount + column-flex mount + flex-fill populated child. Preserve populated internal flex distribution, frozen columns, overflow ownership, empty-model behavior and lower-region cap.

**Validation:** exact one-commit diff; unchanged Table Slice 3/6 Chromium; remaining table slices/main-gate. Do not start Stage 5 until the browser authorities are green.

## 5. Validation Ledger

### Exact `95a5ecaa...`

| Check | Result |
|---|---|
| `main-gate` | PASS |
| Table Slice 4 | PASS |
| SJSON render authority | PASS |
| SJSON interaction authority | PASS |
| non-FEA input check | PASS |
| Table Slice 3 exact-HEAD / line budget | PASS |
| Table Node contracts | PASS 23/23 |
| Production build / bundle | PASS |
| Validation-worker asset emitted | PASS |
| Table Slice 6 pre-browser architecture/contracts/build | PASS |
| Table Slice 3 Chromium | FAIL 3/3 |
| Table Slice 6 Chromium | FAIL |
| Populated surface visibility | PASS |
| Data-scroll compact `clientHeight` | FAIL: `0` |
| Data-scroll resize growth | FAIL: remains `0`, expected >80px |
| PIPE row reachability | FAIL: sibling regions intercept |
| GATE/TEE row reachability | FAIL: same geometry |

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
- Pre-report production HEAD: `95a5ecaaa67a6f1002da1530266f9b9e0fe883d5`.
- Keep the worker fix, five frozen columns, width-track repair, lower wrapper and `beginDrag()` closed-state guard.
- Next production mutation: styles only; give the runtime mount a definite inset size from the body rectangle, no percentages.
- Leave Chromium E2E unchanged.
- Stage 5 must use existing cell-capability authority; PIPE length is the only direct scalar today.

## 8. Closure Record

Mission complete: **NO**. Stage 4 remains blocked by ISS-008; Stages 5-8 have not started. PR remains draft. Final-head validation and reconciliation remain pending.
