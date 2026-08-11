# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; the stage log preserves the important history.

## 0. Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| PR | #1020 · `agent/fix-topology-validation-worker-production` → `main` · OPEN / DRAFT / mergeable |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | `e9345def89fb703f21e58e775be0497d45d73408` before this report update |
| Current stage | Stage 4 — dense/dynamic spreadsheet shell; vertical-fill repair |
| Engineering status | PARTIAL. Density, horizontal containment, five frozen columns, lower-region separation and safe collapsed→open drag behavior are implemented. Vertical viewport ownership remains broken. |
| Validation status | On `e9345def...`: `main-gate` PASS; Table Slice 3 exact-head/23 Node contracts/production build PASS; its Chromium suite FAILS 3/3 on row reachability and resize growth. |
| Current blocker | **ISS-008** — the runtime mount/populated surface does not fill the available vertical axis, so the DOM grid exists but `.topology-edit-table__scroll` collapses while header/lower regions overlap row hit targets. |
| Exact next action | Repair only the mount/surface vertical flex chain in `topology-edit-table-styles.js`; keep the existing Chromium oracle unchanged; requalify exact head before Stage 5. |

### Handover in 60 seconds

- Worker bundling is fixed and production builds emit `topology-edit-validation-worker-*.js`.
- Stage 4 has compact 11px styling, automatic X/Y overflow, sticky header, five frozen columns with deterministic offsets, and a bounded open-window inline track.
- `e9345def...` added `!this.details?.open` to the floating-window drag guard. New artifact screenshots confirm the titlebar now opens at the correct top position; keep that repair.
- The remaining Chromium failure is independent: the large panel is open in the correct place but the table rows are not visibly allocated height. The accessibility tree still contains the full grid/rows, proving this is presentation geometry rather than projection/runtime data loss.
- Stage 5 direct cell editing is still blocked until Stage 4 is green.

## 1. Engineering Invariants

1. Canonical topology is the only model authority.
2. Table/DOM draft state never mutates canonical topology before certified Apply.
3. Preview and validation are non-mutating; Apply remains the governed mutation boundary and one applied batch remains one undo unit.
4. Existing column descriptors plus `deriveTopologyEditTableCellCapability` control editability. `AVAILABLE` can be direct; `NEEDS_INPUT` needs compound governed input; blocked/unrepresentable fields are not arbitrary text.
5. Catalogue-controlled and derived values are never guessed.
6. Stale revisions fail closed or explicitly rebase.
7. No new CI workflow files, broad refactors, dependency upgrades, hidden fallbacks or backup files for this assignment.

## 2. Status / Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| ISS-001 | Defect | VALIDATED | Production validation worker required Vite-recognizable `new Worker(new URL(...))`. |
| ISS-002 | Defect | IMPLEMENTED | Removed fixed `min(48vh,470px)` grid cap / nested viewport behavior. |
| ISS-003 | Defect | VALIDATED | Frozen authority includes Select, Tag, Type, Connect From, Connect To; CSS/test aligned. |
| ISS-004 | Defect | IN_PROGRESS | Data viewport must consume remaining resizable height. |
| ISS-005 | Defect | PARTIAL | Ancestor min-size/flex chain caused zero-height/pointer overlap; several sizing repairs landed. |
| ISS-006 | Defect | IMPLEMENTED / REQUALIFY | Open-window auto column escaped to table max-content width; `grid-template-columns:minmax(0,1fr)` landed at `d8aeadc5...`. |
| ISS-007 | Defect | IMPLEMENTED / PARTIAL-VALIDATED | Collapsed `<summary>` pointerdown seeded closed geometry into drag state. Guard landed at `e9345def...`; screenshots confirm correct open placement. |
| **ISS-008** | Defect | **IN_PROGRESS** | Runtime mount/populated surface owns the wrong/indefinite vertical flex sizing; grid exists but data viewport collapses and sibling regions intercept row clicks. |
| IMP-001 | Improvement | VALIDATED | Compact typography/controls. |
| IMP-002 | Improvement | ACCEPTED | Direct governed spreadsheet cells. |
| IMP-003 | Improvement | ACCEPTED | Keyboard navigation + staged/invalid/stale cell state. |
| IMP-004 | Improvement | ACCEPTED / LATER | Windowed rendering after active-cell semantics stabilize. |
| QST-001 | Question | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. |
| RISK-001 | Risk | ACCEPTED | Spreadsheet drafts must never become a second model authority. |
| RISK-002 | Risk | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. |
| RISK-003 | Risk | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. |

### ISS-008 — vertical fill / pointer reachability

**Observed on exact `e9345def...`:** Table Slice 3 Chromium fails all three tests. The first PIPE Select button and the GATE Select button are visible/enabled/stable, but pointer events are intercepted in turn by `.topology-edit-table__scroll`, `.topology-edit-table__header`, and `.topology-edit-table__lower`. The resize oracle proves the floating panel itself grows by >120px while `.topology-edit-table__scroll.clientHeight` grows by exactly `0px` instead of >80px.

**Artifact evidence:** after the ISS-007 guard, screenshots show the floating panel correctly located near the top/right. Header and lower controls are packed near the top with a large empty area beneath; table rows are not visibly allocated height. The error-context accessibility snapshot still contains the full `Certified canonical engineering table` and rows.

**Source cause under repair:** the body contains a runtime mount `<section data-role="topology-edit-table">` styled as a default row-direction flex container with `height:auto`. Its populated child is `flex:1 1 0` but that flex growth therefore applies on the horizontal axis; a more-specific rule also changes the populated surface from base `height:100%` to `height:auto`. The resulting vertical main size is content-driven instead of consuming the body track, allowing the data viewport to collapse.

**Chosen repair:** make the runtime mount a column flex container with definite available height and make the populated child retain/fill that height. This is presentation-only and leaves projection, selection, intent, worker, transaction and history authority untouched.

**Do not do:** force Playwright clicks, disable pointer events on siblings, weaken resize assertions, or move edit controls out of governed runtime merely to hide the geometry defect.

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

## 4. Stage 4 Execution Record

- Density: compact typography, controls and cells implemented; Chromium font-size assertion passed.
- Frozen context: source-authoritative five-column set + deterministic left offsets implemented and previously validated.
- Lower-region separation: grid rows and editors/workflow use separate scroll domains.
- ISS-006: `d8aeadc5b9c198505ff04469f773028320cf547f` constrained the open-window grid column to `minmax(0,1fr)`. Old 2848px max-content-width escape is no longer the first failure.
- ISS-007: `e9345def89fb703f21e58e775be0497d45d73408` changed `beginDrag()` to return when the `<details>` panel is closed. One-commit diff touched only `topology-edit-table-productivity-adapter.js`. Artifact screenshot confirms open placement is corrected.
- ISS-008: remains. The current CSS mount chain is:
  - body `display:flex`
  - runtime mount `display:flex; flex:1 1 0; height:auto`
  - populated child `flex:1 1 0; height:auto`
  - populated itself is column flex, data scroll `flex:1 1 0`
  The mount's default row axis/auto vertical size means the populated surface is not given the body height to distribute.

### Stage 4 vertical-fill repair — before implementation

**Objective:** ensure the runtime mount and populated surface consume the body’s available height so header and lower controls reserve only their own height and the data viewport receives the remainder.

**Expected production file:** `src/workspace/viewport-productivity/topology-edit-table-styles.js` only.

**Planned CSS semantics:** runtime mount becomes `flex-direction:column` and has definite `height:100%`; populated child fills the mount (`height:100%` / existing vertical flex). Preserve `min-width:0`, `min-height:0`, overflow ownership, frozen columns, empty-model behavior and lower-region cap.

**Validation:** exact one-commit diff; unchanged Table Slice 3/6 Chromium; remaining table slices/main-gate on resulting head. Stage 5 does not start until this is green.

## 5. Validation Ledger

### Exact `e9345def...`

| Check | Result |
|---|---|
| `main-gate` | PASS |
| Table Slice 3 exact-HEAD / line budget | PASS |
| Table Node contracts | PASS 23/23 |
| Production build | PASS; validation worker asset emitted |
| Table Slice 3 Chromium PIPE lifecycle | FAIL at first row click; sibling regions intercept pointer |
| Table density/frozen/horizontal assertions | progressed past prior horizontal blocker |
| Panel resize | panel itself grows |
| Data viewport resize | FAIL; height delta `0px` |
| M06/M10 row reachability | FAIL; same pointer interception |
| Accessibility grid/rows present | PASS in failure snapshot |

Table Slice 6 and remaining workflow outcomes must be re-read before any final claim; do not inherit green status from earlier heads.

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
- Pre-report production HEAD: `e9345def89fb703f21e58e775be0497d45d73408`.
- Start in `topology-edit-table-styles.js`; keep `beginDrag()` guard.
- First repair only the mount/populated vertical fill chain; do not touch runtime/intent/transaction paths and do not weaken E2E.
- After exact-head Chromium is green, update this report with Stage-4 closure before Stage 5.
- Stage 5 must use existing cell capability authority; PIPE length is the only direct scalar today.

## 8. Closure Record

Mission complete: **NO**. Stage 4 remains blocked by ISS-008; Stages 5-8 have not started. PR remains draft. Final-head validation and reconciliation remain pending.
