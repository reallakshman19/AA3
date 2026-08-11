# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; Stage Execution Log preserves history.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| Source issue/task | Owner-authorized assignment in this conversation; all work remains on PR #1020. |
| PR number | 1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | `a7fc9413d3931585706cfd19c6cfcc7af16c9ef2` before this report update |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 4 — Dense dynamic spreadsheet shell, implicit-column repair |
| Last completed stage | Stage 3 — PR/documentation reconciliation |
| Engineering status | PARTIAL; density/frozen behavior proven; exact viewport ownership still blocked |
| Validation status | `main-gate`, source/contracts/build and non-table authorities PASS on `a7fc941...`; Table Slice 3/6 Chromium FAIL on the table layout surface |
| Current blocker | ISS-006 — `.topology-edit-table-window[open]` defines grid rows but no explicit column; the implicit `auto` grid column expands to table max-content width, yielding `clientWidth === scrollWidth === 2848px` inside a 720px panel. |
| Exact next action | Add `grid-template-columns:minmax(0,1fr)` to the open floating window, keep the existing E2E oracle unchanged for the first pass, and rerun exact-head table authorities before Stage 5. |

### Handover in 60 seconds

- **What is now true:** compact 11px typography, compact controls, lower-details grouping, sticky header and five frozen columns are implemented. The inherited validation worker still builds as a production asset. Existing source/transaction contracts and production builds are green.
- **What is currently being worked on:** Stage-4 floating-window geometry only. Exact artifact from `a7fc941...` proves the compact test fails first on horizontal ownership: expected `scrollWidth > clientWidth`; received `2848 === 2848` after the floating panel was set to 720px wide. The panel itself is open and its editor region is present in the accessibility snapshot.
- **What remains unfinished:** ISS-006 repair and Stage-4 green qualification; Stage 5 direct PIPE-length cells; Stage 6 VALVE/TEE compound cell integration; Stage 7 virtualization/bounded expansion; Stage 8 final closure.
- **What must not be assumed:** the current click failures are transaction/selection defects; layout is still causing overflowing hit targets. Do not start Stage 5 until Stage 4 browser authorities are green.
- **Highest-risk remaining item:** ISS-006 / RISK-008 immediately; RISK-001 becomes highest after Stage 4.
- **Exact next recommended action:** one presentation-only CSS column-track repair, then exact-head Chromium evidence.

## 1. Mission and Engineering Intent

### Mission
Deliver a spreadsheet-like Engineering Table with dense rows, dynamic X/Y scrolling, frozen context, direct governed cells, keyboard navigation, staged/error/stale state, and atomic certified Apply.

### Engineering/user consequence
Engineers must be able to reach wide and long tabular data in the resizable floating window. The data viewport must be bounded by the window, not expand to the table’s intrinsic width/height, while canonical topology remains the only engineering authority.

### Scope
- Preserve/requalify inherited validation-worker production repair.
- Stage 4: presentation/layout only.
- Stage 5: direct editing through existing cell-capability authority, starting with PIPE length.
- Stage 6: existing governed VALVE/TEE compound editors from cells.
- Stage 7: virtualization and only production-backed additional edit authority.
- Stage 8: final reconciliation and exact-final-head validation.

### Governing engineering principles
1. Canonical topology is the sole model authority.
2. Table/DOM drafts never mutate canonical topology before certified Apply.
3. Existing column descriptors and `deriveTopologyEditTableCellCapability` are UI-policy authority.
4. `AVAILABLE` may be direct; `NEEDS_INPUT` requires governed compound input; blocked/unrepresentable fields are not free text.
5. Catalogue/derived values are never guessed or silently defaulted.
6. Stale revisions fail closed or explicitly rebase.
7. Layout qualification measures actual browser geometry and pointer reachability.

### Explicit non-goals
No direct canonical DOM mutation; no broad refactor/dependency upgrade; no hidden mocks/fallbacks/shims; no backup files; no speculative abstractions; no new CI workflows.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work-report protocol | P0 | DONE | 1-2 | canonical numbered report |
| PR metadata / initial reconciliation | P0 | DONE | 3 | combined mission; no workflow changes |
| Production validation-worker repair | P0 | VALIDATED | inherited | baseline matrix + current builds emit worker asset |
| Dense typography/controls | P1 | VALIDATED | 4 | computed <=12px in Chromium |
| Sticky/frozen context | P1 | VALIDATED | 4 | 5 columns + offsets `[0,58,190,268,396]` |
| Lower controls separated | P1 | IMPLEMENTED | 4 | `.topology-edit-table__lower` production wrapper |
| Horizontal viewport ownership | P1 | IN_PROGRESS | 4 | ISS-006: compact client width expands to 2848px |
| Vertical viewport ownership / resize | P1 | IN_PROGRESS | 4 | prior attempts exposed height-chain defects; re-evaluate after column constraint |
| Row pointer reachability | P0 | BLOCKED | 4 | overflowing layout can intercept existing row clicks |
| Stage 4 qualification | P0 | BLOCKED | 4 | Table Slice 3/6 Chromium |
| Inline direct cells | P1 | NOT_STARTED | 5 | capability authority exists |
| PIPE length direct cell | P1 | NOT_STARTED | 5 | `PIPE_LENGTH` direct `AVAILABLE` |
| VALVE/TEE grid integration | P2 | NOT_STARTED | 6 | `NEEDS_INPUT` compound authority |
| Virtualization | P2 | NOT_STARTED | 7 | hard 300-row cap remains |
| Broader edit authority | P2 | DEFERRED | 7/future | explicit governed operation required |
| Final reconciliation/validation | P0 | NOT_STARTED | 8 | pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | Defect | HIGH | VALIDATED | Production validation worker bundling/load failure. | Yes |
| ISS-002 | Defect | MEDIUM | IMPLEMENTED | Fixed 470px inner viewport/nested overflow prevented dynamic reachability. | Yes |
| ISS-003 | Defect | MEDIUM | VALIDATED | Frozen test/CSS initially omitted descriptor-frozen connectivity columns. | Yes |
| ISS-004 | Defect | MEDIUM | IN_PROGRESS | Data viewport remaining-height ownership still requires exact-browser closure. | Yes |
| ISS-005 | Defect | HIGH | PARTIAL | Surface-only flex exposed zero-height/pointer-interception through an indefinite sizing chain; ancestor flex-fill repair changed failure surface. | Yes |
| ISS-006 | Defect | HIGH | IN_PROGRESS | Open floating-window implicit grid column expands to table max-content width. | Yes |
| IMP-001 | Improvement | P1 | VALIDATED | Compact typography/control density. | Yes |
| IMP-002 | Improvement | P1 | ACCEPTED | Direct governed spreadsheet cells. | Yes |
| IMP-003 | Improvement | P1 | ACCEPTED | Keyboard navigation + staged/error/stale cells. | Yes |
| IMP-004 | Improvement | P2 | ACCEPTED | Windowed rendering after cell semantics stabilize. | Yes |
| IMP-005 | Improvement | P2 | DEFERRED | Broad XYZ/catalogue/fitting/support edits need governed operations. | Bounded only |
| RISK-001 | Risk | HIGH | ACCEPTED | Spreadsheet drafts could become a second model authority. | Yes |
| RISK-002 | Risk | HIGH | ACCEPTED | No local checkout/gh limits local executable validation. | Yes |
| RISK-003 | Risk | MEDIUM | ACCEPTED | Whole-grid rerender can destroy focus/caret/draft. | Yes |
| RISK-004 | Risk | MEDIUM | ACCEPTED | Frozen region can dominate narrow widths. | Yes |
| RISK-005 | Risk | MEDIUM | ACCEPTED | Resize tests can misdiagnose layout without actual geometry. | Yes |
| RISK-006 | Risk | MEDIUM | ACCEPTED | Table min-content/lower controls can defeat constrained data sizing. | Yes |
| RISK-007 | Risk | HIGH | ACCEPTED | Overflowing zero/invalid viewport geometry can make visible rows unclickable. | Yes |
| RISK-008 | Risk | HIGH | ACCEPTED | Implicit CSS Grid auto columns can let max-content width escape the resizable window. | Yes |
| DEC-001 | Decision | HIGH | ACCEPTED | Cell edits stage governed intents; Apply remains mutation boundary. | Yes |
| DEC-002 | Decision | HIGH | ACCEPTED | Existing capability/column metadata controls UI authority. | Yes |
| DEC-003 | Decision | MEDIUM | ACCEPTED | Stage 4 must be green before Stage 5. | Yes |
| DEC-004 | Decision | MEDIUM | ACCEPTED | All work remains on PR #1020. | Yes |
| DEC-005 | Decision | MEDIUM | ACCEPTED | Preserve all five source-authoritative frozen columns. | Yes |
| DEC-006 | Decision | MEDIUM | REJECTED | CSS Grid remains rejected as the populated-surface vertical sizing authority after min-content failures. | Yes |
| DEC-007 | Decision | MEDIUM | ACCEPTED | Data rows and lower controls use separate scroll domains. | Yes |
| DEC-008 | Decision | MEDIUM | REVISED | Flex is retained through body→mount→surface; exact-browser result must be requalified after width constraint. | Yes |
| DEC-009 | Decision | MEDIUM | ACCEPTED | Body→runtime mount→populated surface uses explicit flex-fill/min-size-zero chain. | Yes |
| DEC-010 | Decision | MEDIUM | ACCEPTED | Floating window open-state grid explicitly declares `grid-template-columns:minmax(0,1fr)` so intrinsic table width cannot size the panel track. | Yes |
| QST-001 | Question | MEDIUM | DONE | PIPE length is only current direct scalar; VALVE/TEE require compound input. | Yes |
| DEBT-001 | Debt | LOW | ACCEPTED | Inherited worker commits predate protocol. | Yes |
| DEBT-002 | Debt | MEDIUM | DEFERRED | Existing npm audit vulnerabilities; upgrades out of scope. | No change |
| DEBT-003 | Debt | LOW | DEFERRED | Existing build chunk warnings; bundle ceiling passes. | No change |

### ISS-001 — production validation-worker load failure
**Status:** VALIDATED. Static Vite module-worker constructor is production-consumed; explicit injected worker config remains test-only; builds emit worker asset.

### ISS-003 — frozen descriptor coverage
**Status:** VALIDATED. Select/Tag/Type/Connect From/Connect To remain frozen with deterministic offsets and browser evidence.

### ISS-005 — flex sizing / pointer reachability
**Status:** PARTIAL. The body→mount→surface flex-fill repair on `a7fc941...` changed the first layout failure from the prior zero-height/vertical surface to a horizontal intrinsic-width failure. Row-click interception still appears in existing lifecycle/compound tests, so closure waits on ISS-006 and a fresh Chromium pass.

### ISS-006 — implicit open-window grid column expands to max-content
- **Status:** IN_PROGRESS.
- **Severity:** HIGH because it defeats the user-requested horizontal scrolling and contributes to click reachability failures.
- **Stage discovered:** Stage-4 exact Chromium on `a7fc941...`.
- **Affected:** `src/workspace/viewport-productivity/topology-edit-table-styles.js`; existing E2E is the oracle.
- **Observed behavior:** layout test sets the actual floating panel to 720px width and passes the `<450px` compact-height check. At line 150 the first compact overflow assertion fails: expected `scrollWidth > clientWidth`, received `2848 === 2848`. Accessibility snapshot shows the open Engineering Table editor and full grid, confirming the test targets the correct panel.
- **Engineering consequence:** the data viewport grows to the full table intrinsic width instead of remaining bounded and horizontally scrollable; clipped content/hit targets can escape the floating panel geometry.
- **Root cause:** `.topology-edit-table-window[open]` is `display:grid` with explicit rows but no `grid-template-columns`. The single implicit grid column defaults to `auto`, whose min/max sizing follows the 2848px max-content table.
- **Chosen resolution:** add `grid-template-columns:minmax(0,1fr)` to the open window. Keep body/mount/populated flex-fill rules and existing E2E unchanged for the first qualification pass.
- **Alternatives considered:** fixed window/body widths rejected as non-responsive; forcing table max-width rejected because horizontal scrolling should occur in the data viewport; weakening the test rejected because `2848px` viewport in a `720px` panel is a real defect.
- **Edge cases:** narrow/mobile window; frozen 524px region; very wide property set; collapsed details; empty-model form.
- **Validation required:** compact `clientWidth < scrollWidth` in 720px panel; row selects clickable; compact positive vertical viewport/overflow and expanded-height growth reached; existing PIPE lifecycle and M06/M10 green; table slices/main-gate exact head.
- **Closure evidence:** pending.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization | living report before production edits | `c908e7c...` |
| 2 | COMPLETE | PR/report synchronization | single numbered report | `d92b958...` |
| 3 | COMPLETE | PR metadata/reconciliation | truthful draft PR scope | complete |
| 4 | PARTIAL | Dense dynamic spreadsheet shell | bounded reachable data viewport with X/Y scroll + frozen context | active |
| 5 | NOT_STARTED | Inline edit foundation | direct PIPE length + keyboard/draft semantics | pending |
| 6 | NOT_STARTED | Compound editor integration | VALVE/TEE cells to governed editors | pending |
| 7 | NOT_STARTED | Scaling/bounded expansion | virtualization + production-backed additions | pending |
| 8 | NOT_STARTED | Final closure | final-head reconciliation/evidence | pending |

## 5. Stage Execution Log

### Stage 1 — Report initialization
Pending report created before spreadsheet production edits; architecture/invariants recorded. **COMPLETE.**

### Stage 2 — PR/report synchronization
Canonical PR1020 report created, pending path removed, baseline matrix green. **COMPLETE.**

### Stage 3 — Documentation/changed-file completion
PR metadata synchronized to combined mission; no workflow changes; direct capability authority identified. **COMPLETE.**

### Stage 4 — Dense dynamic spreadsheet shell

**Before:** `.78rem` text, larger controls, nested/fixed `max-height:min(48vh,470px)` data viewport.

**Objective:** compact responsive data viewport with dynamic X/Y scrolling and frozen context; no engineering-mutation changes.

**Scope:** table styles, grid presentation markup, existing table-authority E2E only.

**Implementation to date:** compact styles; fixed cap removed; stable frozen metadata; five frozen offsets; lower controls wrapper; browser density/overflow/frozen/resize test; several exact-browser sizing repairs (Grid percentage, Grid `1fr`, lower wrapper, surface flex, body→mount flex chain).

**Validation:** source/line/table contracts and production build repeatedly PASS; validation worker bundle emitted. Density/frozen assertions pass on prior heads. Exact `a7fc941...` layout fails first on horizontal compact ownership `2848 == 2848`; existing row-click tests still suffer layout interception. `main-gate` passes.

**Decision:** PARTIAL. Stage 5 remains blocked.

### Stage 4 implicit-column repair — before implementation
- **Before stage:** `a7fc941...`; open window uses grid rows only; compact data viewport equals table max-content width 2848px despite 720px panel.
- **Objective:** constrain the open window’s inline grid track so data viewport can own horizontal scrolling.
- **Scope:** one CSS rule in `topology-edit-table-styles.js`; existing E2E unchanged initially.
- **Engineering rationale:** explicit `minmax(0,1fr)` column prevents intrinsic max-content sizing from escaping the declared panel width while preserving responsive resizing.
- **Planned implementation:** `.topology-edit-table-window[open] { display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:36px minmax(0,1fr); }`.
- **Expected examples:** 720px panel produces ~bounded data `clientWidth` and `scrollWidth > clientWidth`; frozen columns remain; row hit targets remain inside panel; later vertical/resize assertions become reachable.
- **Edge cases:** mobile rule, collapsed details, empty model.
- **Planned validation:** exact diff; existing E2E unchanged; Table Slice 3/6/7/8 + main-gate; no workflow/runtime/intent changes.
- **Known risks:** once horizontal ownership is corrected, a later vertical assertion may expose a remaining independent defect; record rather than weaken it.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production worker repair | Yes | validated; final rerun required |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | No | baseline validated |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | temporary bootstrap; deleted | No | no net diff |
| `agents/PR1020_workreport.md` | 2 | 4 | living report | No | current |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 4 | density/scroll/frozen/window sizing | Presentation | active repair |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 4 | frozen markers + lower wrapper | Presentation | production-consumed |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 4 | visible layout/authority qualification | Test | current exact oracle |

No `.github/workflows/*` changes.

## 7. Engineering Decisions and Invariants

- **DEC-001:** canonical mutation only through governed Apply; Stage 4 never touches mutation path.
- **DEC-002:** column/cell capability metadata is UI authority.
- **DEC-003:** Stage 4 must be green before Stage 5.
- **DEC-004:** all work stays on PR #1020.
- **DEC-005:** preserve five source-authoritative frozen columns.
- **DEC-007:** data rows and lower controls use separate scroll domains.
- **DEC-009:** body→runtime mount→populated surface uses explicit flex-fill/min-size-zero chain.
- **DEC-010:** open floating-window grid declares one `minmax(0,1fr)` column so intrinsic table width cannot size the window track.

## 8. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| PR scope / no workflow changes | PASS | `a7fc941...` | expected files only |
| `main-gate` | PASS | `a7fc941...` | exact head |
| Table source/contracts/build | PASS | `a7fc941...` | Slice 3/6 pre-browser steps |
| Production worker bundle | PASS | `a7fc941...` | Vite build asset |
| Density/frozen context | PASS | prior exact-browser heads and a7fc snapshot reaches compact test |
| Compact horizontal viewport ownership | FAIL | `a7fc941...` | `2848 == 2848` in 720px panel |
| Row pointer reachability | FAIL/PARTIAL | `a7fc941...` | lifecycle/compound click interception from overflowing layout |
| Compact vertical ownership | NOT_REACHED on a7fc | — | blocked by horizontal assertion |
| Dynamic resize growth | NOT_REACHED on a7fc | — | blocked by horizontal assertion |
| Stage 5 editing | NOT_RUN | — | blocked |
| Final-head validation | NOT_RUN | — | Stage 8 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Worker production bundle | PASS | build asset |
| Compact density | PASS | Chromium computed font |
| Frozen context | PASS | five-column evidence |
| Bounded horizontal data viewport | FAIL | data client width 2848px |
| Positive bounded vertical viewport | UNRESOLVED | re-evaluate after ISS-006 |
| Row click reachability | UNRESOLVED/FAIL | overflowing layout intercepts |
| Canonical unchanged before direct cell Apply | NOT_RUN | Stage 5 |

### Explicitly not validated
Stage-4 bounded X/Y viewport and reachability; all direct spreadsheet editing; broad engineering edit authority.

## 9. Known Issues, Improvements, and Deferred Scope

Open defects: ISS-004, ISS-005, ISS-006. Deferred: IMP-004 virtualization, IMP-005 broad edits. Open risks: RISK-001 through RISK-008. Accepted/deferred debt: DEBT-001/002/003.

## 10. Recommended Forward Sequence

1. Fix ISS-006 explicit column track and obtain fresh exact-browser evidence.
2. Continue Stage-4 repairs only if a later vertical/resize assertion exposes an independent defect; close ISS-002/004/005/006 together only when row reachability and dynamic X/Y behavior are green.
3. Stage 5: direct PIPE-length cell through existing capability/intent path; prove no canonical mutation before Apply and keyboard/focus semantics.
4. Stage 6: VALVE/TEE `NEEDS_INPUT` cells route to existing governed compound editors.
5. Stage 7: virtualization after active-cell semantics; only explicit production-backed extra edits.
6. Stage 8: final file reconciliation, exact-final-head validation and item dispositions.

## 11. Next-Agent Handover

- **Current stopping point:** Stage-4 implicit-column repair, before CSS mutation.
- **Exact current state:** `a7fc941...`; main-gate/contracts/build green; compact horizontal viewport expands to 2848px inside 720px panel and causes current browser failure.
- **PR / branch / HEAD:** #1020 / `agent/fix-topology-validation-worker-production` / `a7fc9413d3931585706cfd19c6cfcc7af16c9ef2` before this report commit.
- **Last completed stage:** Stage 3.
- **Current active stage:** Stage 4 PARTIAL.
- **Start here:** `topology-edit-table-styles.js`, `.topology-edit-table-window[open]`; add `grid-template-columns:minmax(0,1fr)`. Leave E2E unchanged for first pass.
- **Do not redo:** worker investigation, frozen repair, lower wrapper, capability investigation, a7fc artifact diagnosis.
- **Do not assume:** previous vertical failures remain unchanged after horizontal track correction; exact browser run must decide.
- **Known failing checks:** Table Slice 3/6 Chromium on a7fc layout surface; exact compact failure at E2E line 150.
- **Validation still required:** repaired table slices/main-gate; Stage 5+; final head.
- **Highest-risk remaining item:** RISK-008 now; RISK-001 after Stage 4.
- **Exact next recommended action:** one-line CSS column-track repair and exact-head CI.
- **Required reading:** this report §§0,3,5,8,11; table styles open-window rule; Stage-4 E2E compact block.

## 12. Process Notes / Lessons Learned

- CSS Grid needs explicit inline as well as block tracks when max-content children live inside a resizable clipped window.
- A flex/min-height chain cannot solve a width track that is still intrinsically sized by an implicit grid column.
- Pointer interception can be a geometry symptom rather than a selection/transaction bug.
- Exact browser geometry is more reliable than theoretical CSS intent.
- Green CI is exact-head evidence only.

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
Pending.

### Remaining known limitations
Stage-4 viewport geometry blocks Stage 5-8.

### Recommended next PR
None; Owner authorized single PR #1020.

### Final HEAD
Not final.