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
| Current HEAD | `1bdf311ae86b42a72d52224cce0b1ff4a38fb55f` before this report update |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 4 — Dense dynamic spreadsheet shell, definite-height-chain repair |
| Last completed stage | Stage 3 — PR/documentation reconciliation |
| Engineering status | PARTIAL; density, horizontal scroll and frozen context proven; vertical reachability still blocked |
| Validation status | `main-gate`, SJSON render/interaction, non-FEA and Table Slice 4 PASS on `1bdf311...`; Table Slice 3/6 Chromium FAIL; other table/browser checks were still running at last inspection |
| Current blocker | ISS-005 — flex data viewport collapses to 0px because the window-body → runtime-mount → populated-surface height chain is indefinite; overflowing rows are then covered by header/lower siblings. |
| Exact next action | Make the body and runtime mount explicit flex-fill containers, make the populated surface flex-fill without percentage `height:100%`, add a >0 compact-grid geometry assertion, then rerun exact-head table authorities before Stage 5. |

### Handover in 60 seconds

- **What is now true:** 11px density, compact controls, horizontal overflow, sticky header and five source-authoritative frozen columns are implemented. The lower engineering controls are grouped in `.topology-edit-table__lower`. Worker production bundling remains healthy and engineering contracts/builds remain green.
- **What is currently being worked on:** Stage-4 geometry only. Flex-head artifact shows the expanded-grid `clientHeight` becomes `0`; lifecycle/M06 clicks time out because row buttons overflow a zero-height `.topology-edit-table__scroll` and header/scroll/lower siblings intercept pointer events.
- **What remains unfinished:** definite sizing-chain repair and Stage-4 green qualification; Stage 5 direct PIPE-length cells; Stage 6 VALVE/TEE compound integration; Stage 7 virtualization/bounded expansion; Stage 8 closure.
- **What must not be assumed:** the click failures are selection/transaction defects; source/contracts/build all pass. Do not start spreadsheet editing while table rows are not reliably reachable.
- **Highest-risk remaining item:** ISS-005 / RISK-007 immediate; RISK-001 (second model authority) becomes highest after Stage 4.
- **Exact next recommended action:** edit only `topology-edit-table-styles.js` and the existing layout E2E; keep renderer/runtime/intents/workflow unchanged unless browser evidence requires otherwise.

## 1. Mission and Engineering Intent

### Mission
Deliver a spreadsheet-like engineering surface: dense rows, automatic X/Y scroll, frozen context, direct governed cells, keyboard navigation, staged/error/stale state, and atomic certified Apply.

### Engineering/user consequence
The table must let engineers reach and edit tabular values quickly without creating a second topology authority. The data viewport must have real bounded geometry: visible rows are interactable, scrolling appears when needed, and resizing the floating window increases useful data area.

### Scope
- Preserve inherited validation-worker production repair.
- Stage 4: presentation/layout only.
- Stage 5: direct editing through existing capability authority, starting with PIPE length.
- Stage 6: existing compound VALVE/TEE editors from grid cells.
- Stage 7: virtualization and only production-backed additional edit authority.
- Stage 8: final reconciliation and exact-final-head validation.

### Governing engineering principles
1. Canonical topology is the only model authority.
2. Table/DOM drafts never mutate canonical topology before certified Apply.
3. Existing column descriptors and `deriveTopologyEditTableCellCapability` are UI-policy authority.
4. `AVAILABLE` may be direct; `NEEDS_INPUT` requires governed compound input; blocked/unrepresentable fields are not free text.
5. Catalogue/derived values are never guessed/defaulted.
6. Stale revisions fail closed or explicitly rebase.
7. Layout evidence measures actual browser geometry and hit-test reachability, not requested CSS values.

### Explicit non-goals
No direct canonical DOM mutation; no broad refactor/dependency upgrade; no hidden mocks/fallbacks/shims; no backup files; no speculative abstractions; no new GitHub Actions workflows.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work-report protocol | P0 | DONE | 1-2 | canonical numbered report |
| PR metadata / initial reconciliation | P0 | DONE | 3 | combined mission, no workflow changes |
| Production validation-worker repair | P0 | VALIDATED | inherited | baseline matrix + current builds emit worker asset |
| Dense typography/controls | P1 | VALIDATED | 4 | computed font <=12px |
| Horizontal spreadsheet scrolling | P1 | VALIDATED | 4 | compact `scrollWidth > clientWidth` |
| Sticky/frozen context | P1 | VALIDATED | 4 | 5 columns, offsets `[0,58,190,268,396]` |
| Lower controls separated | P1 | IMPLEMENTED | 4 | production lower wrapper |
| Definite vertical sizing chain | P1 | IN_PROGRESS | 4 | flex head collapses data viewport to 0px |
| Row pointer reachability | P0 | BLOCKED | 4 | Playwright clicks intercepted by header/scroll/lower siblings |
| Stage 4 qualification | P0 | BLOCKED | 4 | Slice 3/6 Chromium failure |
| Inline direct cells | P1 | NOT_STARTED | 5 | capability authority exists |
| PIPE length direct cell | P1 | NOT_STARTED | 5 | `PIPE_LENGTH` is direct `AVAILABLE` capability |
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
| ISS-004 | Defect | MEDIUM | IN_PROGRESS | Data viewport still lacks correct constrained remaining-height ownership. | Yes |
| ISS-005 | Defect | HIGH | IN_PROGRESS | Flex data item collapses to 0px through an indefinite body/mount/surface height chain, causing pointer interception. | Yes |
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
| RISK-007 | Risk | HIGH | ACCEPTED | A zero-height scroll viewport can leave visually overflowing rows unclickable behind sibling layers. | Yes |
| DEC-001 | Decision | HIGH | ACCEPTED | Cell edits stage governed intents; Apply remains canonical mutation boundary. | Yes |
| DEC-002 | Decision | HIGH | ACCEPTED | Existing capability/column metadata controls UI authority. | Yes |
| DEC-003 | Decision | MEDIUM | ACCEPTED | Stage 4 must be green before edit semantics. | Yes |
| DEC-004 | Decision | MEDIUM | ACCEPTED | Single PR #1020 for assignment. | Yes |
| DEC-005 | Decision | MEDIUM | ACCEPTED | Honor all five current frozen columns. | Yes |
| DEC-006 | Decision | MEDIUM | REJECTED | CSS Grid is no longer vertical sizing authority after exact-browser min-content failures. | Yes |
| DEC-007 | Decision | MEDIUM | ACCEPTED | Data grid and lower controls are separate scroll domains. | Yes |
| DEC-008 | Decision | MEDIUM | REVISED | Flex is retained, but must be applied through the entire body→mount→surface chain, not only the populated surface. | Yes |
| DEC-009 | Decision | MEDIUM | ACCEPTED | Window body and runtime mount become explicit flex-fill containers; nested populated surface uses flex-fill with `height:auto`. | Yes |
| QST-001 | Question | MEDIUM | DONE | PIPE length is the only current direct scalar; VALVE/TEE require compound input. | Yes |
| DEBT-001 | Debt | LOW | ACCEPTED | Inherited worker commits predate protocol. | Yes |
| DEBT-002 | Debt | MEDIUM | DEFERRED | Existing npm audit vulnerabilities; dependency upgrades out of scope. | No change |
| DEBT-003 | Debt | LOW | DEFERRED | Existing build chunk warnings; bundle ceiling still passes. | No change |

### ISS-001 — production validation-worker load failure
**Status:** VALIDATED. Static Vite module-worker constructor is production-consumed; explicit injected worker config is test-only; builds emit the worker asset.

### ISS-003 — frozen descriptor coverage
**Status:** VALIDATED. Select/Tag/Type/Connect From/Connect To are sticky with deterministic offsets and browser assertions pass.

### ISS-004 — vertical data ownership
**Status:** IN_PROGRESS. Fixed-height and Grid-based solutions were rejected by exact-browser evidence. Lower controls are now separately grouped; closure depends on ISS-005.

### ISS-005 — indefinite flex height chain / pointer reachability
- **Status:** IN_PROGRESS.
- **Severity:** HIGH because it makes existing table selection unreachable.
- **Stage discovered:** Stage-4 flex qualification on `1bdf311...`.
- **Affected:** `topology-edit-table-styles.js`, existing layout E2E; markup/runtime authority unchanged.
- **Observed behaviour:** layout test reaches final expanded-grid assertion with `Received: 0` for grid clientHeight. Existing lifecycle and M06 tests time out clicking row Select buttons. Playwright reports `.topology-edit-table__scroll`, the header and `.topology-edit-table__lower` intercept pointer events. Screenshots show rows absent/overflowed while sibling regions remain visible.
- **Engineering consequence:** an existing certified table interaction is broken even though the row DOM remains visible/enabled; Stage 4 cannot ship.
- **Root cause:** `.topology-edit-table--populated` is flex, but its `height:100%` depends on a runtime mount whose `height:100%` is itself inside a grid item with no definite percentage-height chain. With no definite free space, `flex:1 1 0` resolves the data item to 0; table content overflows that item.
- **Chosen resolution:** make `.topology-edit-table-window__body` a flex container; make direct runtime mount `[data-role="topology-edit-table"]` `display:flex; flex:1 1 0; min-height:0`; make its populated child `flex:1 1 0; min-height:0; height:auto`. Retain data/lower scroll split and frozen behavior.
- **Alternatives considered:** `position:absolute` fill is more brittle around body padding; reverting to fixed/max-height recreates ISS-002; force-click/testing workaround rejected because reachability is a product defect.
- **Edge cases:** empty canonical model must remain reachable; collapsed details; lower editor expansion; browser resize; mobile widths.
- **Validation required:** row Select click succeeds before any layout resize; compact grid clientHeight >0 and scrollHeight>clientHeight on 20-row demo; 420→620 actual panel growth increases grid clientHeight; existing PIPE lifecycle + M06/M10 pass; table slices/main-gate exact-head.
- **Closure evidence:** pending.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization | living report before production edits | `c908e7c...` |
| 2 | COMPLETE | PR/report synchronization | single numbered report | `d92b958...` |
| 3 | COMPLETE | PR metadata/reconciliation | truthful draft PR scope | completed |
| 4 | PARTIAL | Dense dynamic spreadsheet shell | reachable bounded data grid + dynamic X/Y/frozen context | active |
| 5 | NOT_STARTED | Inline edit foundation | direct PIPE length + keyboard/draft semantics | pending |
| 6 | NOT_STARTED | Compound editor integration | VALVE/TEE cells to existing governed editors | pending |
| 7 | NOT_STARTED | Scaling/bounded expansion | virtualization + production-backed edit additions | pending |
| 8 | NOT_STARTED | Final closure | final-head reconciliation/evidence | pending |

## 5. Stage Execution Log

### Stage 1 — Report initialization
Pending report created before spreadsheet production edits; initial architecture/findings recorded. **COMPLETE.**

### Stage 2 — PR allocation and report synchronization
Canonical `PR1020` report created, pending path removed, baseline workflows green. **COMPLETE.**

### Stage 3 — Documentation/changed-file completion
PR title/body synchronized to combined mission; no workflow changes; direct-editability authority identified. **COMPLETE.**

### Stage 4 — Dense dynamic spreadsheet shell

#### Before stage
Table used `.78rem` text, larger controls, nested scrolling and fixed `max-height:min(48vh,470px)`.

#### Objective
Dense rows, responsive data viewport, automatic X/Y scroll and frozen context without changing engineering mutation semantics.

#### Scope
Styles + grid presentation + existing table-authority E2E. Runtime/intents/workflow excluded.

#### Implementation performed so far
- 11px surface, compact controls/cells.
- Fixed 470px cap removed.
- Stable column/frozen metadata and title values.
- Five frozen columns with cumulative offsets.
- Lower controls grouped in bounded wrapper.
- Browser layout test for density/overflow/frozen/resize.
- Grid percentage and Grid `1fr` approaches tried/rejected through exact-browser evidence.
- Surface-only flex approach tried on `1bdf311...`; it collapses data viewport to zero because parent height chain is indefinite.

#### Validation performed
| Check | Result | Evidence/Notes |
|---|---|---|
| Source/line/table contracts | PASS | exact-head table slice pre-browser steps |
| Production build | PASS | worker asset emitted |
| `main-gate` | PASS | `1bdf311...` run 347 |
| SJSON render/interaction | PASS | exact head |
| non-FEA | PASS | exact head |
| Table Slice 4 | PASS | exact head |
| Density/horizontal/frozen assertions | PASS before flex reachability failures | prior Stage-4 browser heads |
| Expanded grid height under flex | FAIL | expected >80 growth, received 0 |
| Row Select reachability | FAIL | sibling regions intercept pointer events |
| Table Slice 3/6 | FAIL | Chromium surface only; source/contracts/build green |

#### Stage decision
**PARTIAL.** Stage 5 remains blocked.

### Stage 4 definite-height-chain repair — before implementation
- **Before stage:** head `1bdf311...`; populated surface is flex but its free space is indefinite; data flex item reaches 0px and rows overflow behind siblings.
- **Objective:** establish one definite flex sizing chain from floating body through runtime mount to populated surface so data viewport has nonzero remaining height and owns row scrolling/hit testing.
- **Scope:** `topology-edit-table-styles.js` and a focused addition to existing layout E2E. No renderer/runtime/intent/workflow changes expected.
- **Engineering rationale:** the current failure is ancestor sizing, not table content. The body has one runtime mount child, so flex-fill is simpler and safer than percentage heights.
- **Planned implementation:** body `display:flex`; runtime mount `display:flex; flex:1 1 0; min-height:0; height:auto`; direct populated child `flex:1 1 0; min-height:0; height:auto`; retain populated flex column, data `flex:1 1 0`, lower bounded region. Add compact `clientHeight >80` assertion before vertical-overflow assertion to prove real viewport geometry.
- **Expected examples:** first row Select is clickable at default size; compact 420px window has positive-height vertically overflowing grid; expanded 620px window gives grid >80px more height; lower controls remain independently scrollable.
- **Edge cases:** empty-model route surface, collapsed window, large lower properties, mobile width.
- **Planned validation:** unchanged existing lifecycle/M06/M10 tests plus layout geometry; exact-head Slices 3/6/7/8 and main-gate; no workflow-file changes.
- **Known risks:** overly broad mount flex CSS could affect empty-model layout, so direct-child populated override is explicit and empty-model browser coverage must be observed.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production worker repair | Yes | validated; final rerun required |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | No | baseline validated |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | temporary bootstrap, deleted | No | no net diff |
| `agents/PR1020_workreport.md` | 2 | 4 | living report | No | current |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 4 | density/scroll/frozen sizing | Presentation | active repair |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 4 | stable frozen metadata + lower wrapper | Presentation | production-consumed |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 4 | visible layout/authority qualification | Test | flex failure captured |

No `.github/workflows/*` changes.

## 7. Engineering Decisions and Invariants

- **DEC-001:** canonical mutation only through governed Apply; Stage 4 never touches mutation path.
- **DEC-002:** column/cell capability metadata is UI authority.
- **DEC-003:** Stage 4 must be green before Stage 5.
- **DEC-004:** all work stays on PR #1020.
- **DEC-005:** preserve five source-authoritative frozen columns.
- **DEC-007:** data rows and lower controls use separate scroll domains.
- **DEC-009:** establish definite body→mount→populated flex chain; do not rely on percentage height.

## 8. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| PR scope / no workflow changes | PASS | `1bdf311...` | expected files only |
| `main-gate` | PASS | `1bdf311...` | run 347 |
| SJSON render/interaction | PASS | `1bdf311...` | exact head |
| non-FEA | PASS | `1bdf311...` | exact head |
| Table Slice 4 | PASS | `1bdf311...` | exact head |
| Table source/contracts/build | PASS | `1bdf311...` | Slice 3/6 pre-browser steps |
| Table Slice 3/6 Chromium | FAIL | `1bdf311...` | zero-height data viewport / pointer interception |
| Definite-height-chain repair | NOT_RUN | pending | next head |
| Stage 5 editing | NOT_RUN | — | blocked |
| Final-head validation | NOT_RUN | — | Stage 8 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Worker production bundle | PASS | build asset |
| Compact density | PASS | computed <=12px |
| Horizontal scroll | PASS | prior browser evidence |
| Frozen context | PASS | prior browser evidence |
| Positive bounded data viewport | FAIL | flex expanded clientHeight 0 |
| Row click reachability | FAIL | pointer interception logs |
| Dynamic vertical resize | FAIL | received 0 growth |
| Canonical unchanged before direct cell Apply | NOT_RUN | Stage 5 |

### Explicitly not validated
Stage-4 vertical reachability; all direct spreadsheet editing; broad engineering edit authority.

## 9. Known Issues, Improvements, and Deferred Scope

Open defects: ISS-004, ISS-005. Deferred: IMP-004 virtualization, IMP-005 broad edit authority. Open risks: RISK-001 through RISK-007. Accepted/deferred debt: DEBT-001/002/003.

## 10. Recommended Forward Sequence

1. Fix ISS-005 definite sizing chain and obtain green exact-head Stage-4 browser authorities.
2. Close ISS-002/004/005 with exact evidence and record Stage-4 after-state.
3. Stage 5: direct PIPE-length cell through existing capability/intent path; prove no canonical mutation before Apply and keyboard/focus behavior.
4. Stage 6: route VALVE/TEE `NEEDS_INPUT` cells to governed compound editors.
5. Stage 7: virtualization after active-cell semantics; only explicit production-backed edits.
6. Stage 8: reconcile final files, rerun applicable exact-head checks, disposition every register item, update closure/handover.

## 11. Next-Agent Handover

- **Current stopping point:** Stage-4 definite-height-chain repair, before code mutation.
- **Exact current state:** `1bdf311...` has surface-only flex; main-gate/contracts/build pass; Chromium data viewport collapses to 0 and row buttons are unclickable behind sibling regions.
- **PR / branch / HEAD:** #1020 / `agent/fix-topology-validation-worker-production` / `1bdf311ae86b42a72d52224cce0b1ff4a38fb55f` before this report commit.
- **Last completed stage:** Stage 3.
- **Current active stage:** Stage 4 PARTIAL.
- **Start here:** `topology-edit-table-styles.js`: body and runtime mount sizing chain. Then add one positive `clientHeight` assertion to the existing Stage-4 E2E before the overflow assertion.
- **Do not redo:** worker investigation, frozen repair, lower-wrapper implementation, capability investigation.
- **Do not assume:** pointer failure is a selection bug; current logs prove layout interception.
- **Files currently involved:** report, table styles, grid view, existing table-authority E2E, inherited worker client/test.
- **Known failing checks:** Table Slice 3/6 Chromium at `1bdf311...`; other table/browser workflows may also inherit same layout surface.
- **Validation still required:** repaired table slices/main-gate; Stage 5+; final head.
- **Open engineering questions:** none.
- **Deferred improvements:** IMP-004/005, DEBT-002/003.
- **Highest-risk remaining item:** RISK-007 now; RISK-001 after Stage 4.
- **Exact next recommended action:** apply sizing-chain CSS and focused geometry assertion only, then inspect exact-head browser evidence before any Stage-5 work.
- **Required reading:** this report §§0,3,5 Stage4,7,8,11; table styles; table productivity adapter mount structure; Stage-4 E2E.

## 12. Process Notes / Lessons Learned

- A flex child cannot consume remaining height if its ancestor percentage-height chain is indefinite.
- Pointer interception can be a geometry symptom: visible DOM content may overflow a zero-height scroll item and be covered by siblings.
- Exact browser geometry is more reliable than theoretical CSS track intent.
- Existing metadata remains the authority for frozen/editable behavior.
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
Stage 4 vertical reachability blocks Stage 5-8.

### Recommended next PR
None; Owner authorized single PR #1020.

### Final HEAD
Not final.