# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; Stage Execution Log preserves relevant history.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| Source issue/task | Owner-authorized assignment in this conversation; all work remains on PR #1020. |
| PR number | 1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | `d8aeadc5b9c198505ff04469f773028320cf547f` before this report update |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 4 — Dense dynamic spreadsheet shell, open/drag boundary repair |
| Last completed stage | Stage 3 — PR/documentation reconciliation |
| Engineering status | PARTIAL; density/frozen context and horizontal track constraint implemented; row reachability/vertical viewport still blocked |
| Validation status | On `d8aeadc5...`: `main-gate`, Table Slice 4, non-FEA input check and SJSON interaction PASS; Table Slice 3/6 source/contracts/build PASS but Chromium FAIL on table geometry |
| Current blocker | ISS-007 — collapsed Engineering Table titlebar pointerdown enters drag state before native `<details>` toggle, persisting the collapsed bottom position into inline `top/left` when the panel opens |
| Exact next action | Guard `beginDrag()` so drag can start only when `details.open === true`; leave the existing Chromium oracle unchanged and requalify exact head before Stage 5 |

### Handover in 60 seconds

- **What is now true:** production validation worker bundles correctly; compact 11px table styling, compact controls, automatic overflow, five frozen columns, lower-control separation and explicit open-window inline grid track are implemented.
- **Current browser evidence:** at `d8aeadc5...`, old horizontal max-content escape no longer blocks the layout test. The panel itself grows when resized, but the data viewport gains `0px`; row Select buttons are visible/enabled yet pointer events are intercepted by the table scroll/header/lower regions.
- **Root cause now verified:** the floating titlebar is a `<summary>`. `pointerdown` calls `beginDrag()` before the native `<details>` click toggles open. While collapsed, the panel is CSS-positioned at the bottom. `beginDrag()` copies that closed geometry into inline `left/top`; opening then retains those inline coordinates and places the expanded body below/behind the intended viewport. Exact artifact screenshot shows the titlebar at the bottom edge with table content geometrically overlapping/off-screen.
- **What remains unfinished:** ISS-007 repair and Stage-4 green qualification; Stage 5 direct PIPE-length cell editing; Stage 6 VALVE/TEE compound cell integration; Stage 7 virtualization/bounded expansion; Stage 8 final reconciliation.
- **Do not assume:** current pointer failures are selection/transaction defects. Node authority tests and production build pass; the remaining defect is floating-window interaction/layout custody.
- **Highest-risk remaining item:** ISS-007 now; RISK-001 (second model authority) becomes primary after Stage 4.

## 1. Mission and Engineering Intent

### Mission
Deliver a spreadsheet-like Engineering Table with dense rows, dynamic X/Y scrolling, frozen context, direct governed cells, keyboard navigation, staged/error/stale state, and atomic certified Apply.

### Governing engineering principles
1. Canonical topology is the sole model authority.
2. Table/DOM draft state never mutates canonical topology before certified Apply.
3. Existing column descriptors and `deriveTopologyEditTableCellCapability` control UI editability.
4. `AVAILABLE` may be direct; `NEEDS_INPUT` requires governed compound input; blocked/unrepresentable fields are not free text.
5. Catalogue-controlled and derived values are never guessed or silently defaulted.
6. Stale revisions fail closed or explicitly rebase.
7. Stage-4 browser geometry and pointer reachability must be green before editing semantics expand.
8. No new CI workflows are added for this assignment.

### Explicit non-goals
No direct canonical DOM mutation; no broad refactor; no dependency upgrades; no hidden mocks/fallbacks/shims; no backup files; no speculative abstractions.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work-report protocol | P0 | DONE | 1-2 | canonical PR-numbered report |
| PR metadata / scope reconciliation | P0 | DONE | 3 | combined mission documented; no workflow changes |
| Production validation-worker repair | P0 | VALIDATED | inherited | repeated production builds emit worker asset |
| Dense typography/controls | P1 | VALIDATED | 4 | Chromium computed font <=12px |
| Sticky/frozen context | P1 | VALIDATED | 4 | Select/Tag/Type/Connect From/Connect To + deterministic offsets |
| Lower controls separated | P1 | IMPLEMENTED | 4 | `.topology-edit-table__lower` production wrapper |
| Horizontal viewport ownership | P1 | IMPLEMENTED / REQUALIFY | 4 | explicit `grid-template-columns:minmax(0,1fr)` landed at `d8aeadc5...`; old `2848 == 2848` failure is no longer first blocker |
| Vertical viewport ownership / resize | P1 | BLOCKED | 4 | panel height grows but data-scroll height delta is `0px` on `d8aeadc5...` |
| Row pointer reachability | P0 | BLOCKED | 4 | visible row controls intercepted by overlapping scroll/header/lower regions |
| Open/collapse/drag geometry custody | P0 | IN_PROGRESS | 4 | ISS-007 verified in production adapter + Chromium artifact |
| Stage 4 qualification | P0 | BLOCKED | 4 | Table Slice 3/6 Chromium |
| Inline direct cells | P1 | NOT_STARTED | 5 | capability authority exists |
| PIPE length direct cell | P1 | NOT_STARTED | 5 | `PIPE_LENGTH` is current direct `AVAILABLE` scalar |
| VALVE/TEE grid integration | P2 | NOT_STARTED | 6 | `NEEDS_INPUT` compound authority |
| Virtualization | P2 | NOT_STARTED | 7 | hard 300-row rendering cap remains |
| Broader edit authority | P2 | DEFERRED | 7/future | explicit governed operation required |
| Final reconciliation/validation | P0 | NOT_STARTED | 8 | pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | Defect | HIGH | VALIDATED | Production validation worker bundling/load failure. | Yes |
| ISS-002 | Defect | MEDIUM | IMPLEMENTED | Fixed 470px inner viewport/nested overflow prevented dynamic reachability. | Yes |
| ISS-003 | Defect | MEDIUM | VALIDATED | Frozen CSS/test initially omitted descriptor-frozen connectivity columns. | Yes |
| ISS-004 | Defect | MEDIUM | IN_PROGRESS | Data viewport remaining-height ownership requires exact-browser closure. | Yes |
| ISS-005 | Defect | HIGH | PARTIAL | Flex/min-size chain defects caused zero-height/pointer overlap; several ancestor sizing repairs landed. | Yes |
| ISS-006 | Defect | HIGH | IMPLEMENTED / REQUALIFY | Open-window implicit grid column expanded to table max-content width; explicit `minmax(0,1fr)` column landed at `d8aeadc5...`. | Yes |
| ISS-007 | Defect | HIGH | IN_PROGRESS | Collapsed summary pointerdown persists closed geometry into the opened resizable window. | Yes |
| IMP-001 | Improvement | P1 | VALIDATED | Compact typography/control density. | Yes |
| IMP-002 | Improvement | P1 | ACCEPTED | Direct governed spreadsheet cells. | Yes |
| IMP-003 | Improvement | P1 | ACCEPTED | Keyboard navigation + staged/error/stale cells. | Yes |
| IMP-004 | Improvement | P2 | ACCEPTED | Windowed rendering after cell semantics stabilize. | Yes |
| IMP-005 | Improvement | P2 | DEFERRED | Broad XYZ/catalogue/fitting/support edits need governed operations. | Bounded only |
| RISK-001 | Risk | HIGH | ACCEPTED | Spreadsheet drafts could become a second model authority. | Yes |
| RISK-002 | Risk | HIGH | ACCEPTED | No local checkout/`gh`; executable evidence comes from connected GitHub checks. | Yes |
| RISK-003 | Risk | MEDIUM | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. | Yes |
| RISK-004 | Risk | MEDIUM | ACCEPTED | Five frozen columns can dominate narrow widths. | Yes |
| RISK-005 | Risk | MEDIUM | ACCEPTED | Resize tests can misdiagnose layout unless actual browser geometry is measured. | Yes |
| RISK-006 | Risk | MEDIUM | ACCEPTED | Table min-content/lower controls can defeat constrained data sizing. | Yes |
| RISK-007 | Risk | HIGH | ACCEPTED | Invalid viewport geometry makes visible rows unclickable. | Yes |
| RISK-008 | Risk | HIGH | MITIGATED / REQUALIFY | Implicit grid auto column allowed max-content width to escape resizable window. | Yes |
| RISK-009 | Risk | HIGH | ACCEPTED | Native `<summary>` toggle and custom drag pointerdown can race and persist collapsed geometry. | Yes |
| DEC-001 | Decision | HIGH | ACCEPTED | Cell edits stage governed intents; Apply remains mutation boundary. | Yes |
| DEC-002 | Decision | HIGH | ACCEPTED | Existing capability/column metadata controls UI authority. | Yes |
| DEC-003 | Decision | MEDIUM | ACCEPTED | Stage 4 must be green before Stage 5. | Yes |
| DEC-004 | Decision | MEDIUM | ACCEPTED | All work remains on PR #1020. | Yes |
| DEC-005 | Decision | MEDIUM | ACCEPTED | Preserve all five source-authoritative frozen columns. | Yes |
| DEC-007 | Decision | MEDIUM | ACCEPTED | Data rows and lower controls use separate scroll domains. | Yes |
| DEC-009 | Decision | MEDIUM | ACCEPTED | Body→runtime mount→populated surface retains explicit flex-fill/min-size-zero chain. | Yes |
| DEC-010 | Decision | MEDIUM | ACCEPTED | Open floating window declares `grid-template-columns:minmax(0,1fr)`. | Yes |
| DEC-011 | Decision | HIGH | ACCEPTED | Collapsed table can toggle open but cannot initiate custom drag state. | Yes |
| QST-001 | Question | MEDIUM | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. | Yes |
| DEBT-001 | Debt | LOW | ACCEPTED | Inherited worker commits predate report protocol. | Yes |
| DEBT-002 | Debt | MEDIUM | DEFERRED | Existing npm audit vulnerabilities; upgrades out of scope. | No change |
| DEBT-003 | Debt | LOW | DEFERRED | Existing build chunk warnings; bundle ceiling passes. | No change |

### ISS-001 — production validation-worker load failure
**Status:** VALIDATED. Production uses Vite-recognizable `new Worker(new URL(...))`; injected worker configuration remains available for tests. Current production builds emit the validation-worker asset.

### ISS-006 — implicit open-window grid column
**Status:** IMPLEMENTED / REQUALIFY. `d8aeadc5...` added `grid-template-columns:minmax(0,1fr)` to the open floating window. Exact one-commit diff touched only `topology-edit-table-styles.js`. The former compact-width failure (`clientWidth === scrollWidth === 2848px` inside a 720px panel) is no longer the blocking assertion. Full Stage-4 closure still waits on ISS-007 and a green Chromium lifecycle.

### ISS-007 — collapsed summary drag captures closed geometry
- **Status:** IN_PROGRESS.
- **Severity:** HIGH because it makes the expanded table visibly present but geometrically unreachable.
- **Stage discovered:** Stage-4 exact Chromium on `d8aeadc5...` after ISS-006 repair.
- **Affected production file:** `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js`.
- **Observed behavior:** row Select controls resolve as visible/enabled/stable but clicks time out while the scroll/header/lower regions intercept pointer events. In the layout test the floating panel height itself increases by >120px, but the data-scroll `clientHeight` increases by `0px` instead of >80px.
- **Artifact evidence:** the failed Chromium screenshot shows the Engineering Table titlebar at the bottom edge of the 3D viewport while expanded table content is laid out below/behind the intended region.
- **Root cause:** the titlebar is a `<summary>`. On a normal collapsed-panel click, `pointerdown` fires before the native `<details>` toggle. `beginDrag()` currently always copies the collapsed panel rectangle into inline `right:auto`, `left`, and `top`, captures the pointer, and marks dragging. The native click then opens the details, but those inline closed-state coordinates override the open-state `top:58px/right:14px` CSS.
- **Engineering consequence:** the open panel inherits closed-state bottom placement; descendants overlap in an off-screen/degenerate vertical region, breaking pointer reachability and dynamic viewport growth without changing canonical engineering authority.
- **Chosen resolution:** fail closed in `beginDrag()` unless `this.details.open === true`. A collapsed panel may use its native summary click to open, but cannot seed custom drag geometry.
- **Alternatives rejected:** force Playwright clicks; disable pointer events on overlapping regions; reset geometry only in tests; rewrite the whole floating window positioning model. Those approaches hide the native-toggle/drag race or expand scope.
- **Edge cases:** click-to-open from collapsed; click-to-collapse while open; genuine drag while open; drag threshold/no-move click; programmatic `showWindow()`; mobile constrained window.
- **Validation required:** unchanged Table authority Chromium suite proves row selection, horizontal overflow, positive vertical viewport, panel-resize growth, PIPE lifecycle and M06/M10 editor reachability; then Table Slice 3/6 and remaining table slices/main-gate are checked on exact head.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output |
|---|---|---|---|
| 1 | COMPLETE | Report initialization | living report before spreadsheet production edits |
| 2 | COMPLETE | PR/report synchronization | single PR-numbered report |
| 3 | COMPLETE | PR metadata/reconciliation | truthful combined draft PR scope |
| 4 | PARTIAL | Dense dynamic spreadsheet shell | bounded reachable X/Y viewport + frozen context + safe open/drag interaction |
| 5 | NOT_STARTED | Inline edit foundation | direct PIPE length + keyboard/draft semantics |
| 6 | NOT_STARTED | Compound editor integration | VALVE/TEE cells route to governed editors |
| 7 | NOT_STARTED | Scaling/bounded expansion | virtualization + production-backed additions |
| 8 | NOT_STARTED | Final closure | changed-file reconciliation + final-head evidence |

## 5. Stage Execution Log

### Stages 1-3 — initialization and scope reconciliation
Report initialized before spreadsheet production edits, canonical PR-numbered report retained, PR title/body synchronized to combined mission, no workflow changes, existing cell-capability authority identified. **COMPLETE.**

### Stage 4 — dense dynamic spreadsheet shell
**Before:** larger `.78rem` text, larger controls, nested/fixed `max-height:min(48vh,470px)` viewport.

**Implementation to date:** compact styling; fixed inner height cap removed; sticky header/five frozen columns; stable frozen metadata; lower-controls wrapper; body/mount/populated flex/min-size repairs; exact-browser geometry test; explicit open-window inline grid track.

**Validation history:** source/line/table contracts and production builds repeatedly pass. Density/frozen assertions have passed. Multiple exact-browser iterations exposed independent layout defects rather than authority defects; each was kept in Stage 4 instead of moving prematurely to editing semantics.

**Decision:** PARTIAL. Stage 5 remains blocked.

### Stage 4 ISS-006 repair — implementation and result
- **Implementation:** `d8aeadc5b9c198505ff04469f773028320cf547f`, `topology-edit-table-styles.js` only; open window now declares `grid-template-columns:minmax(0,1fr)`.
- **Exact-head software evidence:** `main-gate` PASS; Table Slice 4 PASS; non-FEA input check PASS; SJSON interaction PASS; Table Slice 3/6 pre-browser source/contracts/build PASS; production build emitted validation-worker asset.
- **Chromium result:** old horizontal-width blocker moved; all three table-authority browser tests then exposed open-window geometry/pointer defects. Layout test: panel growth PASS, data viewport growth FAIL at delta `0px`. PIPE and M06/M10 tests: row controls visible/enabled but intercepted by scroll/header/lower regions.
- **Decision:** ISS-006 implementation retained; new independent ISS-007 recorded.

### Stage 4 open/drag boundary repair — before implementation
- **Before stage:** `d8aeadc5...`; horizontal track constrained, but collapsed summary pointerdown seeds closed geometry into inline open-window positioning.
- **Objective:** keep native collapsed→open toggle independent from custom dragging so expanded geometry starts from open-state CSS.
- **Scope:** one guard in `TopologyEditTableProductivityAdapter.beginDrag()`; existing E2E unchanged initially; report update only otherwise.
- **Engineering rationale:** drag state has meaning only for an already open resizable window. Closed-state geometry must never become open-state inline authority.
- **Planned implementation:** change the initial guard to return when `!this.details.open`.
- **Expected behavior:** clicking a collapsed Engineering Table opens it at normal top/right placement; clicking without moving while open still collapses; dragging while open still works; row controls are inside the visible viewport; increasing panel height increases data viewport height.
- **Planned validation:** exact one-commit diff; Table Slice 3/6 Chromium; remaining table slices/main-gate; no workflow/intent/transaction changes.
- **Known risk:** if an independent vertical flex defect remains after correct placement, the unchanged browser oracle will expose it; do not weaken the assertion.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? |
|---|---:|---:|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production worker repair | Yes |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | No |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | temporary bootstrap; deleted | No |
| `agents/PR1020_workreport.md` | 2 | 4 | living source of truth | No |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 4 | density/scroll/frozen/window sizing | Presentation |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 4 | frozen markers + lower wrapper | Presentation |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | existing | 4 planned | safe floating-window open/drag boundary | UI interaction only |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 4 | production layout/authority browser qualification | Test |

No `.github/workflows/*` changes.

## 7. Engineering Decisions and Invariants

- Canonical mutation remains behind certified Apply; Stage 4 never writes canonical topology.
- Column/cell capability metadata remains the single editability authority.
- Five descriptor-authoritative frozen columns are retained.
- Data rows and lower controls intentionally use separate scroll domains.
- Open floating-window grid uses an explicit bounded inline track.
- Native collapsed/open toggle is not allowed to seed custom drag coordinates; custom dragging begins only on an already open table.
- Green CI is exact-head evidence only.

## 8. Validation and Evidence Ledger

### Exact `d8aeadc5...` evidence
| Validation | Result | Notes |
|---|---|---|
| `main-gate` | PASS | exact head |
| Table Slice 4 | PASS | exact head |
| non-FEA input check | PASS | exact head |
| SJSON interaction authority | PASS | exact head |
| Table Slice 3 source/contracts/build | PASS | 23/23 Node contracts; production build PASS |
| Table Slice 6 architecture/contracts/build | PASS | governed relation/transaction contracts + production build PASS |
| Production validation-worker asset | PASS | emitted by Vite build |
| Table Slice 3 Chromium | FAIL | three tests; geometry/pointer reachability |
| Table Slice 6 Chromium | FAIL | same table browser surface |
| PIPE row selection | FAIL | visible/enabled button intercepted by overlapping table regions |
| M06/M10 row selection | FAIL | same pointer interception |
| Panel resize growth | PASS | panel itself grows |
| Data viewport resize growth | FAIL | `0px` growth, expected >80px |

### Explicitly not yet validated
Stage-4 final open/drag repair; all Stage-5+ direct spreadsheet editing; final-head closure.

## 9. Known Issues, Improvements, and Deferred Scope

Open Stage-4 defects: ISS-004, ISS-005, ISS-007. ISS-006 is implemented but awaits full Stage-4 requalification. Deferred: virtualization and broad engineering edit authority beyond explicit governed operations. Existing npm audit/chunk warnings are recorded debt and are out of scope.

## 10. Recommended Forward Sequence

1. Apply ISS-007 `beginDrag()` open-state guard only.
2. Re-run exact-head Table Slice 3/6 and inspect unchanged browser oracle.
3. If Stage 4 becomes green, update this report with closure evidence before starting Stage 5.
4. Stage 5: direct PIPE-length cell through existing capability/intent path; prove typing/staging/Preview/Validate do not mutate canonical topology and keyboard/focus semantics are stable.
5. Stage 6: route VALVE/TEE `NEEDS_INPUT` cells into existing governed compound editors.
6. Stage 7: virtualization after active-cell semantics; only explicit production-backed extra edits.
7. Stage 8: final changed-file reconciliation, final exact-head matrix, dispositions and handover.

## 11. Next-Agent Handover

- **Current stopping point:** Stage-4 open/drag boundary repair, before production mutation.
- **PR / branch / pre-report HEAD:** #1020 / `agent/fix-topology-validation-worker-production` / `d8aeadc5b9c198505ff04469f773028320cf547f`.
- **Start here:** `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js`, `beginDrag()` initial guard.
- **Make only this first repair:** collapsed details must return before writing inline `right/left/top`, creating `this.drag`, or capturing the pointer.
- **Leave unchanged for first pass:** Table authority E2E assertions; canonical/session/intent/transaction paths; workflow files.
- **Do not redo:** worker investigation, five-column frozen repair, lower-wrapper work, ISS-006 inline-track repair, cell-capability investigation.
- **Known failing checks:** Table Slice 3/6 Chromium on `d8aeadc5...`.
- **Highest-risk remaining item:** ISS-007 until browser green, then RISK-001.

## 12. Process Notes / Lessons Learned

- Exact browser geometry is more reliable than theoretical CSS intent.
- A visible/enabled control can still be unreachable when an ancestor/window is laid out in a degenerate region.
- Native `<summary>` activation order matters when custom pointer drag behavior shares the same element.
- Presentation bugs can mimic selection/transaction defects; source/contracts staying green helps isolate them.
- Do not weaken browser tests to accommodate invalid floating-window geometry.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | NO |
| In-scope items dispositioned | NO |
| Engineering Item Register synchronized | YES current state |
| Changed files reconciled | YES current stage; repeat final |
| Validation rerun at final HEAD | NO |
| Unexplained changes | None known |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Final HEAD | Not final |

### Final outcome
Pending. Stage 4 remains blocked by ISS-007; Stage 5-8 have not started.
