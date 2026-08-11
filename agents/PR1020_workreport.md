# PR #1020 Engineering Work Report

> Living engineering authority for PR #1020. Current-state sections are rewritten to current truth; Stage Execution Log preserves material stage history.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and complete a compact, dynamically scrolling, governed spreadsheet-style 3D Edit Engineering Table. |
| Source issue/task | Owner-authorized assignment on PR #1020: worker production failure + spreadsheet Engineering Table plan. |
| PR number | #1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current production HEAD before this report commit | `99554ae0038a7191006027048fbadba54989f3a7` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 7 — row-window scaling and bounded production-backed completion |
| Last completed stage | Stage 6 — governed VALVE/TEE compound-cell entry |
| Engineering status | Stages 4-6 COMPLETE. Stage 7 before-state recorded; no Stage-7 production edit started yet. |
| Validation status | Exact `99554ae0…`: Table Slices 1/2/3/4/6 and `main-gate` PASS; Slice 3 and Slice 6 production Chromium PASS. Remaining broader triggered checks were still completing when Stage 7 was opened. |
| Current blocker | ISS-010: renderer hard-caps rows at 300, so rows beyond the cap are intentionally hidden until filtered. |
| Exact next action | Replace the fixed 300-row slice with bounded windowed rendering driven by scroll position, preserve horizontal/vertical scroll and keyboard focus, and add deterministic windowing tests. |

### Handover in 60 seconds

**What is now true:** worker production bundling is fixed. Table is compact (11px), resizable, dynamically scrollable, sticky-header/frozen-context. PIPE `lengthMm` is the only direct scalar cell and stages through the existing certified PIPE intent. VALVE/TEE `NEEDS_INPUT` cells now render compound-edit affordances that select the exact row and focus the existing governed editor; they do not stage or infer values.

**What is currently being worked on:** Stage 7 removes the 300-row visibility cutoff using bounded virtualization/windowing.

**What remains unfinished:** windowing, final changed-file reconciliation, final exact-head validation/closure. Broader XYZ/support/fitting/catalogue scalar edits remain intentionally outside this PR because certified Table intents do not exist.

**What must not be assumed:** visible property ≠ editable property; compound cell activation ≠ staged edit; unqualified rows beyond current window may not be removed from projection authority.

**Highest-risk remaining item:** RISK-004 — virtualization must not break direct-cell focus/navigation, exact selection, sticky columns or scroll ownership.

**Exact next recommended action:** add a small production-consumed pure row-window module, wire runtime scroll ownership and grid spacer rows, then qualify the existing Chromium lifecycle unchanged.

## 1. Mission and Engineering Intent

**Mission:** provide a spreadsheet-like engineering surface without creating a second model or catalogue authority.

**Engineering/user consequence:** users can scroll the whole projected model, keep identity context frozen, directly type certified PIPE lengths, enter compound VALVE/TEE edits from their cells, and still rely on Preview → Validate → Apply for canonical changes.

**Scope:** production worker repair; dense/dynamic table shell; direct PIPE cell; compound VALVE/TEE entry; >300-row windowed rendering; final reconciliation.

**Governing principles:** canonical topology is sole model authority; drafts are UI-only; Preview/Validate non-mutating; Apply is atomic; existing session/journal is sole engineering history; `deriveTopologyEditTableCellCapability` governs editability; stale/catalogue/unsupported inputs fail closed.

**Explicit non-goals:** no direct canonical writes; no second undo stack; no arbitrary catalogue text as a scalar cell; no new support/XYZ/fitting editors without certified operations; no new CI workflows; no dependency upgrades/broad refactors.

**Important constraints:** all assignment work remains on PR #1020; new production modules require a same-PR production consumer; JS under 300 physical lines/functions under 40 logical lines where practical; no backup files or generated churn.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Production validation worker | P0 | VALIDATED | inherited | production build emits worker asset |
| Dense typography/controls | P0 | VALIDATED | 4 | Chromium authority |
| Dynamic X/Y scroll + resize | P0 | VALIDATED | 4 | Slice 3/6 Chromium |
| Sticky header/frozen context | P0 | VALIDATED | 4 | five frozen columns in Chromium |
| Direct PIPE length cell | P0 | VALIDATED | 5 | invalid/draft/commit lifecycle + exact-head matrix |
| Keyboard commit/cancel | P0 | VALIDATED | 5 | Enter/Tab/Shift/Escape production path |
| VALVE compound cell entry | P1 | VALIDATED | 6 | focused selection contract + unchanged M06 browser lifecycle |
| TEE compound cell entry | P1 | VALIDATED | 6 | focused capability contract + unchanged M10 browser lifecycle |
| >300-row access | P0 | IN_PROGRESS | 7 | ISS-010 |
| Unsupported broader edit surface | P2 | DEFERRED | 7 | no certified Table intents |
| Final reconciliation | P0 | NOT_STARTED | 8 | final head pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | P0 | VALIDATED | Vite worker URL was not statically recognizable. | Yes |
| ISS-002 | Defect | P0 | VALIDATED | Fixed inner table height cap/competing scroll. | Yes |
| ISS-003 | Defect | P1 | VALIDATED | Frozen source authority/CSS offsets reconciled. | Yes |
| ISS-004 | Defect | P0 | VALIDATED | Data viewport now consumes resized height. | Yes |
| ISS-005 | Defect | P0 | VALIDATED | Zero-height/pointer overlap repaired. | Yes |
| ISS-006 | Defect | P0 | VALIDATED | Max-content width escape contained. | Yes |
| ISS-007 | Defect | P0 | VALIDATED | Collapsed summary no longer seeds drag geometry. | Yes |
| ISS-008 | Defect | P0 | VALIDATED | Native details content sizing repaired with panel-relative body fill. | Yes |
| ISS-009 | Defect | P1 | VALIDATED | Row canonical DOM identity uniqueness restored. | Yes |
| **ISS-010** | Defect | **P0** | **IN_PROGRESS** | Grid uses `rows.slice(0, 300)` and hides later rows. | Yes |
| IMP-001 | Improvement | P0 | VALIDATED | Compact controls. | Yes |
| IMP-002 | Improvement | P0 | VALIDATED | Direct PIPE spreadsheet cell. | Yes |
| IMP-003 | Improvement | P0 | VALIDATED | Cell keyboard/draft/error/stale state. | Yes |
| IMP-004 | Improvement | P0 | IN_PROGRESS | Bounded row-window rendering. | Yes |
| IMP-005 | Improvement | P1 | VALIDATED | VALVE/TEE cell entry to existing compound editor. | Yes |
| QST-001 | Question | P0 | DONE | PIPE length is only current `AVAILABLE` scalar. | Yes |
| QST-002 | Question | P1 | DONE | Stage-7 windowing accepted with fixed deterministic row geometry and scroll restoration. | Yes |
| RISK-001 | Risk | HIGH | ACTIVE | UI must not become engineering authority. | Yes |
| RISK-002 | Risk | MEDIUM | ACCEPTED | No local checkout; evidence comes from connected GitHub exact-head checks. | Yes |
| RISK-003 | Risk | MEDIUM | ACTIVE | Rerender can destroy cell focus/caret. | Yes |
| RISK-004 | Risk | HIGH | ACTIVE | Windowing may break focus, selection or scroll continuity. | Yes |
| DEBT-001 | Debt | MEDIUM | ACCEPTED | Compound forms remain in lower region; cells are entry affordances. | Yes |
| DEBT-002 | Debt | MEDIUM | ACCEPTED | Multi-cell range selection/paste is not introduced without a certified batch UX contract. | No/future |
| DEC-012 | Decision | — | ACCEPTED | Direct PIPE cell shares existing governed staging helper. | Yes |
| DEC-013 | Decision | — | ACCEPTED | Raw drafts remain transient runtime state. | Yes |
| DEC-015 | Decision | — | ACCEPTED | Row `data-canonical-id` is unique; child controls use cell-specific identity. | Yes |
| DEC-016 | Decision | — | VALIDATED | `NEEDS_INPUT` cell activates existing compound editor only. | Yes |
| **DEC-017** | Decision | — | **ACCEPTED** | Window rows with deterministic fixed row height + spacer rows; projection remains complete. | Yes |

### ISS-010 / DEC-017 detail
- **Observed behaviour:** `topology-edit-table-grid-view.js` uses `MAX_RENDERED_ROWS = 300` and `rows.slice(0, MAX_RENDERED_ROWS)`; user can filter later rows but cannot simply scroll to them.
- **Engineering consequence:** canonical projection is complete but the spreadsheet presentation is incomplete for large models.
- **Root cause:** fixed rendering cap was a safety limit, not a real virtualization layer.
- **Chosen resolution:** retain the complete `rows` projection; render a bounded contiguous window with top/bottom spacer rows. Runtime owns scroll top/left and re-renders only when crossing coarse window boundaries.
- **Alternatives rejected:** render all rows (unbounded DOM/performance risk); pagination (breaks spreadsheet scroll expectation); silently increase cap (same defect at a larger number).
- **Edge cases:** filter/sort reset vertical window; selection rerenders preserve scroll; direct-cell Tab across a window boundary must bring target row into the render window before focus; sticky/frozen columns must remain intact.
- **Validation required:** pure window math for 1,000+ rows; no hard 300 cap; exact-head line/import guards; existing production Chromium lifecycle; changed-file ledger reconciliation.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit/HEAD |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization/findings | pending report | historical |
| 2 | COMPLETE | PR allocation/report sync | `PR1020_workreport.md` | historical |
| 3 | COMPLETE | changed-file/metadata verification | synchronized draft PR | historical |
| 4 | COMPLETE | dense dynamic spreadsheet shell | scroll/frozen/resizable surface | `4a66e01f…` qualified |
| 5 | COMPLETE | direct governed PIPE cell | typed cell/keyboard lifecycle | `ad7c091e…` all-green |
| 6 | COMPLETE | governed compound cell entry | VALVE/TEE cell → existing editor | `99554ae0…` critical checks green |
| 7 | IN_PROGRESS | remove hidden-row cap | bounded row window + scroll/focus continuity | before-state recorded here |
| 8 | NOT_STARTED | final reconciliation/closure | final report + final-head evidence | — |

## 5. Stage Execution Log

### Stage 4 — COMPLETE
Implemented compact styling, dynamic scroll ownership, sticky header/five frozen columns, safe details drag/open behavior and corrected native details sizing. Production Chromium qualified final geometry.

### Stage 5 — COMPLETE
**Before:** only detached PIPE editor. **Implementation:** shared PIPE staging helper; production-consumed direct-cell module; transient drafts; invalid fail-closed; Enter/Tab stage, Escape cancel; canonical-change/discard reset; direct cell E2E. **Deviation:** child initially duplicated `data-canonical-id`; ISS-009 fixed without weakening test. **Validation:** exact `ad7c091e…` full triggered matrix PASS. **Decision:** COMPLETE.

### Stage 6 — COMPLETE

**Before stage:** VALVE `valveType` and TEE branch fields were visible but `NEEDS_INPUT`; existing lower editors already owned exact catalogue/branch/reducer evidence.

**Objective:** make grid cells the interaction entry point without duplicating form/engineering authority.

**Implementation performed:**
- `topology-edit-table-cell-edit.js` now renders compact compound buttons only for `NEEDS_INPUT` capabilities whose certified intent is `VALVE_REPLACEMENT` or `TEE_REDUCER_RELATION`.
- Activation resolves exact canonical row, calls coordinator `tableSelection('REPLACE', ...)`, then focuses the existing lower editor after selection rerender.
- No intent/batch/preview/validation/canonical mutation occurs on activation.
- Runtime click handling consumes the compound-cell action before ordinary row/action routing.
- Existing selection contract tests now prove GATE/TEE affordance rendering, row canonical-ID uniqueness, exact selection and focus-only behavior.

**Changed files:**
| File | Change | Why |
|---|---|---|
| `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js` | compound capability rendering + focus routing | spreadsheet entry without duplicate authority |
| `src/workspace/viewport-productivity/topology-edit-table-runtime.js` | production click consumer | route action through existing selection coordinator |
| `tests/topology-edit-table-selection-contract.test.mjs` | focused contract evidence | prove exact selection/focus-only semantics |

**Deviations from plan:** existing Chromium M06/M10 lifecycle remained unchanged rather than adding a second browser scenario; the new focus-only behavior is covered by Node contract while existing production Chromium continues to qualify the actual governed editors and relations.

**Validation performed:**
| Check | Result | Evidence/Notes |
|---|---|---|
| Exact-head / line budget | PASS | Slice 3 `99554ae0…` |
| Table Node contracts including new selection tests | PASS | Slice 3 |
| Production build | PASS | Slice 3/6 |
| Table Slice 3 Chromium | PASS | existing PIPE/layout/M06/M10 lifecycle unchanged |
| Table Slice 6 architecture + M06/M10 + transactions | PASS | exact head |
| Table Slice 6 Chromium | PASS | exact head |
| Table Slice 4 | PASS | exact head |
| main-gate | PASS | exact head |
| Slices 1/2 | PASS | exact head |
| Broader SJSON/reachability/Slices 7/8 at stage-close observation | NOT_RUN to completion | triggered and still in progress; do not infer final status |

**Issues discovered:** none beyond already-registered ISS-010 scaling defect.

**Risks remaining:** RISK-001 remains active; Stage 6 added no new mutation path. RISK-004 becomes highest risk for Stage 7.

**Stage decision:** COMPLETE.

**Handover delta:** newly true = compound cells are usable spreadsheet entry points; still unresolved = >300 rows; next stage starts with pure deterministic window math.

### Stage 7 — BEFORE IMPLEMENTATION

**What is currently true:** projection/sort/filter return all rows, but renderer clips to first 300. Scroll container itself is already dynamic and qualified. Direct PIPE cell keyboard navigation currently derives adjacent inputs from rendered DOM.

**Objective:** every projected row must be reachable by ordinary vertical scrolling while keeping DOM bounded and preserving direct-cell navigation.

**Scope:** new small pure windowing module; grid rendering/spacer rows; runtime scroll ownership; direct-cell cross-window focus support if required; style rule for fixed virtualized row geometry; existing view-state tests for deterministic window math.

**Engineering rationale:** presentation virtualization changes only how complete canonical projection rows are materialized in DOM; it does not alter projection, selection identity, intents, transactions or engineering authority.

**Planned implementation:** fixed 33px row geometry; nominal render window 120 rows with 40-row coarse steps/overscan; top/bottom spacer rows preserve total scroll height; runtime records scrollTop/scrollLeft and restores them after window rerender; filter/sort reset vertical window; direct-cell navigation computes targets from visible projection order and moves render window before focus when target is outside DOM.

**Expected examples:** 1,000-row projection renders ~120 real rows at a time; scroll near row 700 updates window while full scroll extent remains; filtering row 950 resets window and reveals it; existing 20-row demo behaves identically with no spacer overhead.

**Edge cases:** empty/short tables; last partial window; horizontal scroll preservation; selected/staged row outside current window; filter/sort changes; Tab across window boundary; programmatic selection of off-window row should not mutate projection.

**Planned validation:** pure tests for first/middle/last windows and scroll heights; source no longer contains fixed 300-row cutoff; exact-head line/import gates; production build; unchanged Slice 3/6 Chromium; broader triggered checks before Stage 8 closure.

**Known risks:** fixed row height must match compact controls; rerender threshold should avoid scroll churn; off-window selected row remains selected in view state even when not materialized.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR1020_workreport.md` | 1 | 7 | living authority | Yes | updated before/after stages |
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | worker bundling | Yes | build/matrix |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | Yes | matrix |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 5 | compact/scroll/frozen styles | UI | Chromium |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 5 | table renderer | Yes | Chromium |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | 4 | 4 | safe panel drag/open | UI | Chromium |
| `src/workspace/viewport-productivity/topology-edit-table-pipe-length-runtime.js` | 5 | 5 | shared PIPE staging | Yes | contracts/Chromium |
| `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js` | 5 | 6 | direct + compound cell UI behavior | Yes | Node + Chromium |
| `src/workspace/viewport-productivity/topology-edit-table-runtime.js` | 5 | 6 | production event integration | Yes | exact-head guards/Chromium |
| `tests/topology-edit-table-selection-contract.test.mjs` | 6 | 6 | compound selection/focus evidence | Yes | Slice 3 PASS |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 5 | production UI/authority lifecycle | Yes | Chromium PASS |

Stage-7 new files must be added here immediately when created. No `.github/workflows/*` changes.

## 7. Engineering Decisions and Invariants

- **DEC-012:** PIPE direct cell shares governed staging helper.
- **DEC-013:** raw cell drafts are transient runtime UI state.
- **DEC-015:** canonical DOM row identity remains unique.
- **DEC-016:** compound cells activate existing editor only; no inferred inputs.
- **DEC-017:** projection remains complete; only DOM materialization is windowed.

| Invariant | Enforcement | Validation | PR effect |
|---|---|---|---|
| Canonical topology sole model authority | existing session/transaction | transaction + E2E | unchanged |
| Preview/Validate non-mutating | workflow | E2E | unchanged |
| Apply atomic / one undo unit | certified transaction | transaction tests | unchanged |
| Unsupported cells fail closed | capability receipt | direct/compound tests | strengthened |
| Windowing cannot change row identity/order | projection remains source | Stage-7 pure tests | pending |

## 8. Validation and Evidence Ledger

### Software validation
- Exact `ad7c091e…`: all triggered workflows PASS (Stage 5 baseline).
- Exact `99554ae0…`: Slice 1 PASS; Slice 2 PASS; Slice 3 PASS including production Chromium; Slice 4 PASS; Slice 6 PASS including M06/M10/transactions/Chromium; `main-gate` PASS. Other triggered checks were still running at Stage-7 start and are **not assumed**.

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Worker production asset emitted | VALIDATED | Vite build |
| Dynamic/frozen table | VALIDATED | Chromium |
| PIPE typing authority no-op until stage/apply | VALIDATED | E2E |
| Compound activation selection/focus only | VALIDATED | Node selection contract + unchanged Chromium editor lifecycle |
| >300 rows all reachable | NOT_RUN | Stage 7 pending |

### Explicitly not validated
XYZ/support/fitting edits; arbitrary catalogue scalar edits; multi-cell range/paste; Stage-7 virtualization until implemented.

## 9. Known Issues, Improvements, and Deferred Scope

**Open defects:** ISS-010 only.

**Deferred improvements:** coordinate/node/connected-run Table operations; support editing; additional fitting/catalogue operations; multi-cell paste/range UX after certified batch semantics are designed.

**Open risks:** RISK-001, RISK-003, RISK-004.

**Open questions:** none requiring Owner input for current safe scope.

**Accepted debt:** DEBT-001 compound lower form; DEBT-002 no multi-cell range/paste in this PR.

## 10. Recommended Forward Sequence

1. Complete Stage 7 windowing to resolve ISS-010 without unbounded DOM growth.
2. Stage 8 reconcile actual PR filenames against ledger; disposition every register item; observe final exact-head triggered matrix; update closure/handover. Keep PR draft unless Owner explicitly requests ready/merge.
3. Highest-value next PR: certified node/connected-run coordinate editing, because XYZ is the largest remaining spreadsheet expectation but requires professional operation authority first. Then support/fitting editors can follow their own certified operations.

## 11. Next-Agent Handover

**Current stopping point:** Stage 6 complete; Stage 7 before-state recorded; no Stage-7 production mutation yet.

**PR / branch / HEAD:** #1020 / `agent/fix-topology-validation-worker-production`; production head before this report commit `99554ae0038a7191006027048fbadba54989f3a7`.

**Last completed stage:** Stage 6 — compound VALVE/TEE cell entry.

**Current active stage:** Stage 7 — row-window scaling.

**Start here:** `src/workspace/viewport-productivity/topology-edit-table-grid-view.js`, constant `MAX_RENDERED_ROWS = 300`. Add a pure windowing helper under `src/workspace/viewport-productivity/`, consume it in grid/runtime, and extend `tests/topology-edit-table-view-state.test.mjs`. Preserve direct-cell focus across windows.

**Do not redo:** worker investigation; Stage-4 details sizing; PIPE direct cell; compound editor routing.

**Do not assume:** rendering 300 rows equals projection authority; off-window selected rows are deselected; unsupported properties can become editable.

**Files currently involved:** grid view, runtime, cell edit, styles, view-state test, report.

**Known failing checks:** none among completed critical Stage-6 checks.

**Validation still required:** Stage-7 window math/build/Chromium; final full matrix/reconciliation.

**Open engineering questions:** none blocking.

**Deferred improvements:** DEBT-002 and broader unsupported edit surface.

**Highest-risk remaining item:** RISK-004.

**Exact next recommended action:** create the pure row-window helper first and test first/middle/last 1,000-row windows before wiring scroll events.

**Required reading:** sections 0/3/Stage-7 before-state; grid renderer; runtime scroll/event wiring; direct-cell adjacent/focus helpers.

## 12. Process Notes / Lessons Learned

- Selector attributes can be production contracts; canonical identity must not be duplicated casually.
- Browser-native `<details>` sizing required real Chromium evidence, not CSS reasoning alone.
- `NEEDS_INPUT` is an engineering boundary, not an invitation to render free-text cells.
- Presentation virtualization must preserve complete projection authority and exact selection even when rows are not mounted.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | NO — Stages 7/8 pending |
| In-scope items dispositioned | PARTIAL |
| Engineering Item Register synchronized | YES |
| Changed files reconciled | Stage-6 ledger updated; final pending |
| Validation rerun at final HEAD | NO |
| Unexplained changes | None known |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Final HEAD | pending |

**Final outcome:** pending Stage 7/8.

**Remaining known limitations:** ISS-010; unsupported editing intentionally deferred.

**Recommended next PR:** certified XYZ/node connected-run editing after this PR closes.

**Final HEAD:** pending.