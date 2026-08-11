# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; historical notes preserve material Stage-4 findings.

## 0. Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| PR | #1020 · `agent/fix-topology-validation-worker-production` → `main` · OPEN / DRAFT / mergeable |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Diagnostic HEAD | `2549ed2a15a061e9c632aa162ef3ed0430847c7a` before this report update |
| Current stage | Stage 4 — dense/dynamic spreadsheet shell; native-details content-wrapper bypass |
| Engineering status | PARTIAL. Density, horizontal containment, five frozen columns, lower-region separation and safe collapsed→open drag behavior are implemented. Vertical viewport ownership is now measured and root-caused. |
| Validation status | Diagnostic head: exact-head/line guard PASS, 23/23 Table Node contracts PASS, production build PASS; Chromium intentionally still FAILS on unchanged layout/reachability assertions. |
| Current blocker | **ISS-008** — Chromium’s native `<details>` content wrapper owns the second grid row; the direct `.topology-edit-table-window__body` remains auto-sized at `0px`, so every descendant viewport is starved of block size. |
| Exact next action | Production CSS only: absolutely fill the direct body beneath the 36px titlebar relative to the positioned `<details>` panel, then make the runtime mount normal column-flex/flex-fill. This bypasses the native content wrapper’s block-size transfer without touching engineering authority. |

### Handover in 60 seconds

- Validation worker fix remains healthy; production builds emit `topology-edit-validation-worker-*.js`.
- Stage 4 already has compact 11px styling, automatic X/Y overflow, sticky header, five frozen columns with deterministic offsets, lower-controls separation, a bounded inline track, and the `beginDrag()` closed-state guard from `e9345def...`.
- The diagnostic receipt is now exact, not inferred: panel = `1120×720`, panel grid rows = `36px 682px`, **direct body height = 0**, mount = 0, populated surface = 0, scroll clientHeight = 0. Header still lays out at ~40px and the scroll border at 2px, which explains the pointer-overlap symptoms.
- This proves the second `682px` grid track belongs to the browser’s internal details-content wrapper rather than the direct body element. Further descendant flex/grid tuning cannot solve the missing body block size.
- Next production fix therefore bypasses that wrapper for sizing: body `position:absolute; inset:36px 0 0`, then ordinary flex-fill descendants.
- Stage 5 direct cell editing remains blocked until Stage 4 Chromium is green.

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
| ISS-001 | Defect | VALIDATED | Production validation worker required Vite-recognizable `new Worker(new URL(...))`. |
| ISS-002 | Defect | IMPLEMENTED | Removed fixed `min(48vh,470px)` inner grid cap / competing scroll ownership. |
| ISS-003 | Defect | VALIDATED | Frozen authority = Select, Tag, Type, Connect From, Connect To; CSS/test aligned. |
| ISS-004 | Defect | IN_PROGRESS | Data viewport must consume remaining resizable height. |
| ISS-005 | Defect | PARTIAL | Ancestor sizing produced zero-height/pointer overlap; bounded fixes narrowed it to native-details block-size transfer. |
| ISS-006 | Defect | IMPLEMENTED / REQUALIFY | Open window max-content escape fixed with bounded inline track. |
| ISS-007 | Defect | IMPLEMENTED / PARTIAL-VALIDATED | Collapsed `<summary>` pointerdown seeded closed geometry; guarded at `e9345def...`. |
| **ISS-008** | Defect | **ROOT-CAUSED / IN_PROGRESS** | Native details-content wrapper receives the 682px second grid row while direct body computes to 0px. |
| IMP-001 | Improvement | VALIDATED | Compact typography/controls. |
| IMP-002 | Improvement | ACCEPTED | Direct governed spreadsheet cells. |
| IMP-003 | Improvement | ACCEPTED | Keyboard navigation + staged/invalid/stale cell state. |
| IMP-004 | Improvement | LATER | Windowed rendering after active-cell semantics stabilize. |
| QST-001 | Question | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. |
| RISK-001 | Risk | ACCEPTED | Spreadsheet drafts must never become a second model authority. |
| RISK-002 | Risk | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. |
| RISK-003 | Risk | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. |

### ISS-008 — measured browser geometry

Diagnostic test changes on `24813321...`, `dbe466f0...`, and `2549ed2a...` were test-only; all production assertions remained unchanged. The final diagnostic persisted `reports/qualification/topology-edit-table-authority.json`, producing this exact Chromium receipt:

| Element | Used rectangle / size | Relevant computed layout |
|---|---|---|
| floating `<details>` | `1120×720` at `(586,100)` | `display:grid`; rows `36px 682px` |
| direct body | `1118×0` at `(587,137)` | `position:relative`; `height:0px` |
| runtime mount | `1108×0` | `position:absolute`; column flex |
| populated surface | `1108×0` | column flex; `flex:1 1 0px` |
| header | ~`1100×40.14` | in-flow fixed flex child |
| data scroll | `1100×2`; `clientHeight:0` | `overflow:auto`; `flex:1 1 0px` |
| lower region | `1100×0` | grid; rows exist but available height is zero |

**Root cause:** the panel’s grid reports a healthy 682px second track while its direct body is 0px. In Chromium 147, open `<details>` content is mediated by an internal details-content wrapper; that wrapper is the grid item receiving the second row. The direct body remains content-sized. Absolute-positioning the *mount inside the body* made the body’s in-flow content empty, so the body collapsed completely. Earlier in-flow descendants could only give the body their intrinsic header/lower height, not the remaining panel height.

**Chosen resolution:** use the already positioned `.topology-edit-table-window` as the containing block and position the **body itself** beneath the titlebar:

- body: `position:absolute; inset:36px 0 0; display:flex; padding:5px; min-width:0; min-height:0; overflow:hidden`;
- runtime mount: return to normal flow; `display:flex; flex:1 1 0; flex-direction:column; min-width:0; min-height:0`;
- populated surface: `flex:1 1 0; min-width:0; min-height:0; height:auto`;
- keep the populated surface’s internal header / scroll / lower flex allocation unchanged.

This gives the body a definite height from the panel’s top/bottom edges and no longer asks the native details-content wrapper to propagate block size.

**Rejected alternatives:** force clicks, pointer-events changes, assertion weakening, another descendant percentage-height chain, or replacing the native panel markup. Those either hide invalid geometry or broaden scope unnecessarily.

## 3. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| 1 | COMPLETE | initialize report before spreadsheet production edits |
| 2 | COMPLETE | synchronize to PR-numbered living report |
| 3 | COMPLETE | reconcile draft PR scope/metadata and changed files |
| 4 | PARTIAL | compact reachable dynamic X/Y spreadsheet shell |
| 5 | NOT_STARTED | direct PIPE-length cell + keyboard/draft semantics |
| 6 | NOT_STARTED | governed VALVE/TEE compound-cell integration |
| 7 | NOT_STARTED | virtualization and bounded production-backed expansion |
| 8 | NOT_STARTED | final reconciliation and exact-head closure |

## 4. Stage 4 Record

- Density and compact controls implemented; browser font-size assertion has passed on prior Stage-4 heads.
- Five source-authoritative frozen columns and deterministic left offsets implemented/validated.
- Data rows and lower controls use separate scroll domains.
- `d8aeadc5...`: constrained horizontal max-content escape.
- `e9345def...`: prevented drag startup on collapsed `<details>`; keep.
- `33ce5bf2...`: rejected nested `%` heights (surface hidden).
- `95a5ecaa...`: descendant grid stretch restored surface visibility but scroll stayed zero-height.
- `e1c5c0b7...`: absolute mount inside auto-sized body caused body/surface collapse.
- `2549ed2a...`: geometry diagnostic proved the native details-content wrapper owns the second grid row and direct body is 0px.

### Body-wrapper bypass — before implementation

**Scope:** `src/workspace/viewport-productivity/topology-edit-table-styles.js` only. Diagnostic E2E remains temporarily so exact geometry can be compared; no assertion changes.

**Expected result:** body height becomes roughly panel height minus titlebar/borders; mount/surface inherit that definite height through flex; scroll clientHeight becomes positive; panel resize increases scroll clientHeight; row Select controls become genuinely clickable; frozen/X overflow remains bounded.

**Validation:** exact diff; Table Slice 3/6 unchanged Chromium lifecycle; main-gate and other triggered table/render checks on exact head. If green, remove temporary geometry persistence and record Stage-4 closure before Stage 5.

## 5. Validation Ledger

### Diagnostic `2549ed2a...`

| Check | Result |
|---|---|
| exact-HEAD / line budget | PASS |
| Table Node contracts | PASS 23/23 |
| production build | PASS |
| validation-worker asset emitted | PASS |
| Chromium production lifecycle | FAIL as expected on unchanged ISS-008 assertions |
| geometry evidence artifact | PASS; exact box receipt captured |
| panel height | PASS: 720px |
| panel second grid track | PASS: 682px |
| direct body height | **FAIL: 0px** |
| data-scroll clientHeight | **FAIL: 0px** |

Earlier exact heads also showed `main-gate` and Slice-6 non-browser authority/contracts green; re-read the full matrix after the next production head rather than inheriting those results.

## 6. Changed-File Ledger

| File | Purpose |
|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited production worker fix |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | worker regression |
| `agents/PR1020_workreport.md` | living engineering source of truth |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | density/scroll/frozen/window sizing |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | frozen markers + lower-region wrapper |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | safe open/drag interaction boundary |
| `e2e/topology-edit-table-authority.spec.js` | production authority/layout oracle + temporary Stage-4 geometry persistence |

No `.github/workflows/*` changes.

## 7. Next-Agent Handover

- PR/branch: #1020 / `agent/fix-topology-validation-worker-production`.
- Diagnostic head before this report: `2549ed2a15a061e9c632aa162ef3ed0430847c7a`.
- Keep worker fix, five frozen columns, horizontal track repair, lower wrapper and `beginDrag()` collapsed-state guard.
- Next production mutation: styles only; absolute-fill the **body**, not the mount, beneath the 36px titlebar.
- Keep Chromium assertions unchanged. Temporary geometry persistence may remain until Stage 4 is green, then remove it.
- Stage 5 must use existing cell-capability authority; PIPE length remains the only direct scalar today.

## 8. Closure Record

Mission complete: **NO**. Stage 4 remains in progress but ISS-008 is now root-caused with exact browser evidence. Stages 5-8 have not started. PR remains draft; final-head validation/reconciliation pending.
