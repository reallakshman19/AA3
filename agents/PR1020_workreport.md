# PR #1020 Engineering Work Report

> Living engineering authority for PR #1020. Current-state sections reflect the latest known truth; Stage Execution Log preserves material history.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and deliver a compact, dynamically scrolling, governed spreadsheet-style 3D Edit Engineering Table. |
| Source issue/task | Owner-authorized PR #1020 assignment: production worker failure + spreadsheet Engineering Table plan. |
| PR number | #1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Last production HEAD | `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5` |
| PR status | OPEN / DRAFT / mergeable; do not merge without Owner instruction |
| Current stage | Stage 8 — final reconciliation and closure |
| Last completed stage | Stage 7 — bounded row-window scaling |
| Engineering status | All planned implementation stages COMPLETE. Stage 8 is documentation/reconciliation only. |
| Validation status | Exact production HEAD `13c3724d…`: Table Slices 1/2/3/4/6/7/8, `main-gate`, non-FEA and SJSON Interaction PASS. Slice 3 + Slice 6 Chromium PASS. SJSON Render had completed its real Chromium/WebGL step successfully and was uploading evidence; Real User Reachability and Tool Audit were still completing when Stage 8 began. |
| Current blocker | No production defect known. Final closure requires final-head workflow observation and closure-record synchronization. |
| Exact next action | Finish observing retained exact-head checks, reconcile final 14-file PR diff, then finalize Closure Record without adding production scope. |

### Handover in 60 seconds

**What is now true:** production worker loading is repaired. The Engineering Table is compact (11px), resizable, horizontally/vertically scrollable, sticky-header with frozen Select/Tag/Type/Connect From/Connect To. PIPE length is a governed direct numeric cell with transient draft/error/stale state and Enter/Tab/Escape behavior. Certified VALVE/TEE compound cells route to their existing exact governed editors without staging on activation. The former fixed 300-row cutoff is removed and replaced by bounded 120-row DOM windows with spacer rows and scroll/focus continuity.

**Currently being worked on:** Stage 8 final evidence/reconciliation only.

**Unfinished:** observe the final retained workflow completions and seal the closure record. No production implementation remains in authorized scope.

**Must not be assumed:** the PR adds arbitrary spreadsheet editing for XYZ, supports, fittings, catalogue scalars, multi-cell ranges or paste. Those operations are not certified and are explicitly deferred.

**Highest-risk remaining item:** release evidence drift, not engineering mutation. Production windowing is algorithm-tested to 1,000 rows; repository Chromium qualification still uses the 20-row production demo.

**Exact next recommended action:** inspect final exact-head statuses, then update this report once with the closure record. Leave PR draft unless Owner explicitly requests ready/merge.

## 1. Mission and Engineering Intent

### Mission
Make the Engineering Table feel like a professional spreadsheet where engineering authority exists, without introducing a second topology/catalogue/history authority.

### Engineering/user consequence
Users can see more data in less space, resize the table, scroll the complete projected model rather than losing rows after 300, directly type certified PIPE lengths, and enter compound VALVE/TEE workflows from their cells. Model changes still flow through governed intent → plan → Preview → Validate → certified Apply.

### Scope
Production validation worker repair; dense dynamic table shell; direct certified PIPE cell; compound VALVE/TEE cell entry; bounded row virtualization; final evidence/reconciliation.

### Governing engineering principles
Canonical topology remains sole model authority; transient drafts are UI-only; Preview/Validate do not mutate canonical; Apply remains atomic and the certified journal is the only applied undo/redo history; capability receipts govern editability; unsupported/catalogue/stale states fail closed.

### Explicit non-goals
No direct node/topology writes; no second undo stack; no arbitrary catalogue free text as scalar edits; no speculative XYZ/support/fitting editors; no multi-cell range/paste without a certified batch UX contract; no new CI workflows/dependencies/broad refactors.

### Important constraints
Single PR #1020; new modules have production consumers; line budgets enforced by existing exact-head workflows; no backup/generated churn.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Production validation worker | P0 | VALIDATED | inherited | production Vite worker asset emitted |
| Compact typography/controls | P0 | VALIDATED | 4 | production Chromium |
| Dynamic X/Y scrolling + resizing | P0 | VALIDATED | 4 | Slice 3/6 Chromium |
| Sticky/frozen identity context | P0 | VALIDATED | 4 | five frozen columns in Chromium |
| Direct PIPE length cell | P0 | VALIDATED | 5 | invalid/draft/stage/Preview/Validate/Apply lifecycle |
| Keyboard Enter/Tab/Shift/Escape | P0 | VALIDATED | 5/7 | direct-cell contracts + production Chromium regression |
| VALVE/TEE compound cell entry | P1 | VALIDATED | 6 | selection/focus contract + M06/M10 Chromium |
| >300-row access | P0 | VALIDATED with stated evidence limit | 7 | fixed cutoff removed; deterministic 1,000-row window tests; retained production Chromium green |
| Unsupported broader edits | P2 | DEFERRED | 7 | no certified Table intents |
| Final reconciliation | P0 | IN_PROGRESS | 8 | 14 actual PR files reconciled; final workflow observation pending |

## 3. Engineering Item Register

| ID | Type | Priority | Status | Summary | Disposition |
|---|---|---:|---|---|---|
| ISS-001 | defect | P0 | VALIDATED | production worker URL not Vite-recognizable | fixed |
| ISS-002 | defect | P0 | VALIDATED | fixed inner height cap/competing scroll | fixed |
| ISS-003 | defect | P1 | VALIDATED | frozen-column authority/style mismatch | fixed |
| ISS-004 | defect | P0 | VALIDATED | data viewport failed to consume resized height | fixed |
| ISS-005 | defect | P0 | VALIDATED | zero-height/pointer overlap | fixed |
| ISS-006 | defect | P0 | VALIDATED | max-content width escape | fixed |
| ISS-007 | defect | P0 | VALIDATED | collapsed summary seeded drag geometry | fixed |
| ISS-008 | defect | P0 | VALIDATED | native details body block-size trap | fixed |
| ISS-009 | defect | P1 | VALIDATED | child duplicated row canonical DOM identity | fixed |
| ISS-010 | defect | P0 | VALIDATED | `slice(0,300)` hid later rows | fixed by row windowing |
| IMP-001 | improvement | P0 | VALIDATED | compact controls | delivered |
| IMP-002 | improvement | P0 | VALIDATED | direct PIPE spreadsheet cell | delivered |
| IMP-003 | improvement | P0 | VALIDATED | draft/error/stale keyboard state | delivered |
| IMP-004 | improvement | P0 | VALIDATED | bounded row-window rendering | delivered |
| IMP-005 | improvement | P1 | VALIDATED | compound VALVE/TEE cell entry | delivered |
| QST-001 | question | P0 | DONE | only PIPE length is current direct scalar | resolved |
| QST-002 | question | P1 | DONE | safe virtualization design | fixed geometry + spacer/window design chosen |
| RISK-001 | risk | HIGH | ACCEPTED / CONTROLLED | UI could become second engineering authority | capability + certified staging boundaries retained |
| RISK-002 | risk | MEDIUM | ACCEPTED | no local checkout/gh | exact-head GitHub evidence used |
| RISK-003 | risk | MEDIUM | VALIDATED / RESIDUAL | rerender can lose focus | explicit focus restoration; retained Chromium green |
| RISK-004 | risk | HIGH | VALIDATED / RESIDUAL | windowing could break focus/scroll/selection | pure 1,000-row math + retained browser lifecycle; no large browser fixture |
| DEBT-001 | debt | MEDIUM | ACCEPTED | compound forms remain lower-region editors | deliberate single-form authority |
| DEBT-002 | debt | MEDIUM | DEFERRED | multi-cell range/paste absent | future certified batch UX |
| DEC-012 | decision | — | ACCEPTED | direct PIPE cell shares governed staging helper | retained |
| DEC-013 | decision | — | ACCEPTED | raw drafts are transient runtime state | retained |
| DEC-015 | decision | — | ACCEPTED | row canonical DOM identity remains unique | retained |
| DEC-016 | decision | — | VALIDATED | `NEEDS_INPUT` cells activate existing compound editor only | delivered |
| DEC-017 | decision | — | VALIDATED | complete projection + bounded DOM row windows | delivered |

### ISS-010 closure detail
**Affected:** grid renderer/runtime/cell navigation/styles. **Root cause:** safety cap was not virtualization. **Resolution:** complete visible-row projection remains authoritative; DOM renders up to 120 rows with 33px deterministic geometry, 40-row coarse window movement, top/bottom spacer heights, persisted X/Y scroll, filter/sort vertical reset, and full-projection PIPE keyboard targeting. **Validation:** short/middle/last/target row-window tests including 1,000 rows; exact-head line/import guards; production build; unchanged Table Chromium lifecycle. **Limitation:** a >300-row real-browser fixture was not independently executed.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output | Commit/HEAD |
|---|---|---|---|---|
| 1 | COMPLETE | initialize report/findings | living report | historical |
| 2 | COMPLETE | PR allocation/report sync | PR-numbered report | historical |
| 3 | COMPLETE | changed-file/metadata verification | synchronized PR | historical |
| 4 | COMPLETE | dense dynamic shell | compact scroll/frozen table | `4a66e01f…` qualified |
| 5 | COMPLETE | direct PIPE cell | typed governed cell | `ad7c091e…` all-green |
| 6 | COMPLETE | compound cell entry | VALVE/TEE cell → existing editor | `99554ae0…` critical green |
| 7 | COMPLETE | remove 300-row cutoff | bounded windowing | `13c3724d…` critical + table slices green |
| 8 | IN_PROGRESS | final reconciliation/closure | final report/evidence | documentation only |

## 5. Stage Execution Log

### Stage 4 — COMPLETE
Implemented compact styling, dynamic scroll ownership, frozen columns, safe panel drag/open behavior and native-details sizing repair. Chromium qualified final geometry.

### Stage 5 — COMPLETE
Added shared PIPE staging helper and production direct-cell module. Typing remains transient; invalid input fails closed; Enter/Tab stage through existing intent/batch/plan; Escape cancels. Canonical changes/discard destroy drafts. Fixed canonical DOM selector collision. Exact `ad7c091e…` triggered matrix all green.

### Stage 6 — COMPLETE
Added `NEEDS_INPUT` compound cell buttons for certified VALVE_REPLACEMENT/TEE_REDUCER_RELATION. Activation only exact-selects and focuses the existing governed editor. Added selection/focus tests. Exact `99554ae0…`: critical Table slices, M06/M10/transactions, build and Chromium green.

### Stage 7 — COMPLETE

**Before stage:** renderer hard-capped first 300 rows; PIPE adjacent navigation inspected mounted inputs only.

**Objective:** all projected rows reachable via ordinary scroll with bounded DOM and no engineering authority change.

**Implementation performed:**
- Added pure `topology-edit-table-row-window.js`: 33px rows, 120-row window, 40-row coarse step, first/middle/last/target helpers.
- Added `topology-edit-table-scroll-runtime.js`: runtime scrollTop/scrollLeft ownership and coarse rerender trigger.
- Grid now uses complete `topologyEditTableVisibleRows`, renders only window rows plus inert spacer rows, publishes window evidence and restores X/Y scroll after rerender.
- Removed `MAX_RENDERED_ROWS=300` / `slice(0,300)` visibility cutoff.
- Fixed real-row geometry at 33px to match spacer math.
- Filter/sort reset vertical window.
- PIPE Tab/Shift navigation now computes adjacent certified PIPE cells from full filtered/sorted projection; off-window targets move window before focus.
- Expanded existing view-state tests for 20-row and 1,000-row window math.

**Changed files:** `topology-edit-table-row-window.js`, `topology-edit-table-scroll-runtime.js`, grid view, runtime, cell edit, styles, `tests/topology-edit-table-view-state.test.mjs`.

**Deviations from plan:** no large synthetic production-browser model was introduced, avoiding fixture/generated-data scope. Browser qualification therefore proves retained real production behavior on the 20-row demo; independent pure tests prove 1,000-row window math.

**Validation performed:**
| Check | Result | Evidence/Notes |
|---|---|---|
| Exact-head / line budgets | PASS | Slice 3 `13c3724d…` |
| Table Node contracts incl. window tests | PASS | Slice 3 |
| Production build | PASS | Slice 3/6 |
| Table Slice 3 Chromium | PASS | exact production head |
| Table Slice 6 M06/M10/transactions/Chromium | PASS | exact production head |
| Table Slices 1/2/4/7/8 | PASS | exact production head |
| `main-gate` | PASS | exact production head |
| non-FEA | PASS | exact production head |
| SJSON Interaction | PASS | exact production head |
| SJSON Render at Stage-8 start | PASS through real Chromium/WebGL step; run still finalizing artifact upload | do not overstate run conclusion until complete |
| Real User Reachability at Stage-8 start | IN_PROGRESS | production Chromium step running |
| Tool Audit at Stage-8 start | IN_PROGRESS | retained check still running |

**Issues discovered:** none new.

**Stage decision:** COMPLETE.

**Handover delta:** all implementation in plan is now complete; Stage 8 is evidence/closure only.

### Stage 8 — BEFORE CLOSURE

**What is currently true:** no production implementation remains. Actual PR changed-file list contains exactly 14 expected paths and no `.github/workflows/*`.

**Objective:** reconcile actual files/register/statuses, observe retained final-head checks, and seal a truthful closure record.

**Scope:** work report and PR metadata only. No production files expected to change.

**Engineering rationale:** closure must not broaden scope after implementation qualification.

**Planned validation:** final PR metadata; exact changed-file list; final-head workflow status; no unexplained files; all register items disposed; no CI workflow addition; PR remains draft.

**Known risks:** a report-only closure commit changes Git HEAD and retriggers workflows. Final report will explicitly distinguish the fully qualified production tree (`13c3724d…`) from the report-only closure head; the PR’s current GitHub status remains the external exact-head authority.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR1020_workreport.md` | 1 | 8 | living work/handover authority | Yes | reconciled continuously |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 5 | real Table/browser authority lifecycle | Yes | Chromium PASS |
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production worker construction | Yes | build/matrix PASS |
| `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js` | 5 | 7 | direct/compound cells + window-aware focus | Yes | contracts/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 7 | grid/frozen/window rendering | Yes | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-pipe-length-runtime.js` | 5 | 5 | shared PIPE staging | Yes | transaction/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | 4 | 4 | safe panel open/drag | UI-sensitive | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-row-window.js` | 7 | 7 | deterministic row window math | UI-sensitive | 1,000-row Node tests PASS |
| `src/workspace/viewport-productivity/topology-edit-table-runtime.js` | 5 | 7 | event/scroll/engineering integration | Yes | guards/build/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-scroll-runtime.js` | 7 | 7 | virtual scroll ownership | UI-sensitive | guards/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 7 | density/frozen/window row geometry | UI-sensitive | Chromium PASS |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | Yes | matrix PASS |
| `tests/topology-edit-table-selection-contract.test.mjs` | 6 | 6 | compound cell selection/focus | Yes | Slice 3 PASS |
| `tests/topology-edit-table-view-state.test.mjs` | 7 | 7 | selection + row-window math | Yes | Slice 3 PASS |

**Actual GitHub changed-file reconciliation:** 14/14 exact match. Unexplained files: **None**. `.github/workflows/*`: **None**.

## 7. Engineering Decisions and Invariants

- DEC-012: direct PIPE and lower PIPE editor share the same governed staging helper.
- DEC-013: typed drafts are transient UI state only.
- DEC-015: row canonical DOM identity remains unique.
- DEC-016: compound cells activate/focus one existing governed editor; no duplicated form authority.
- DEC-017: virtualization changes DOM materialization only; full projection/order/selection authority remains intact.

| Invariant | Enforcement | Validation | PR effect |
|---|---|---|---|
| canonical topology sole model authority | certified session/transaction | transaction + E2E | unchanged |
| Preview/Validate non-mutating | workflow | E2E authority snapshots | unchanged |
| Apply one atomic undo unit | certified journal | transaction + Undo/Redo E2E | unchanged |
| unsupported cells fail closed | capability receipt | cell contracts | strengthened |
| stale revision explicit | existing rebase/stale path | Node contracts | unchanged |
| windowing cannot change projection authority | visible-row projection remains source | window tests + browser regression | strengthened |

## 8. Validation and Evidence Ledger

### Software validation
**Fully qualified production tree:** `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5`.

| Validation | Status | Evidence |
|---|---|---|
| Table Slice 1 | PASS | exact head |
| Table Slice 2 | PASS | exact head |
| Table Slice 3 | PASS | line/import guards, Node contracts, build, Chromium |
| Table Slice 4 | PASS | exact head |
| Table Slice 6 | PASS | M06/M10, transactions, build, Chromium |
| Table Slice 7 | PASS | exact head |
| Table Slice 8 | PASS | exact head |
| main-gate | PASS | exact head |
| non-FEA input check | PASS | exact head |
| SJSON Interaction | PASS | exact head |
| SJSON Render | IN_PROGRESS at this report write; real Chromium/WebGL step PASS | final run conclusion pending |
| Real User Reachability | IN_PROGRESS | final run conclusion pending |
| 3D Edit Tool Audit | IN_PROGRESS | final run conclusion pending |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| worker bundled in production | VALIDATED | emitted worker asset |
| compact/dynamic/frozen table | VALIDATED | real Chromium |
| PIPE typing no-op until staging/apply | VALIDATED | E2E authority snapshots |
| compound activation no mutation | VALIDATED | selection contract + existing M06/M10 browser lifecycle |
| all rows no longer hard-hidden after 300 | VALIDATED at algorithm/source level | cap removed; deterministic 1,000-row windows |
| >300-row real-browser scrolling | NOT_RUN | no large production fixture added |

### Explicitly not validated / not in scope
XYZ/node edits; support/fitting editing; arbitrary catalogue scalar editing; multi-cell paste/fill-down; a real-browser model above 300 rows.

## 9. Known Issues, Improvements, and Deferred Scope

**Open defects:** None known in authorized implementation scope.

**Deferred improvements:** certified XYZ/node/connected-run editing; support editing; additional fitting/catalogue operations; multi-cell range/copy/paste after certified batch UX exists; optional future large-model browser fixture for virtualization performance/reachability.

**Open engineering risks:** residual RISK-004 limited to absence of >300-row real-browser qualification; algorithm and retained browser regression are validated.

**Open engineering questions:** None blocking closure.

**Accepted debt:** DEBT-001, DEBT-002.

## 10. Recommended Forward Sequence

1. Finish Stage 8 evidence observation and close this PR report; no more production changes.
2. Highest-value next PR: certified node/connected-run coordinate editing. It addresses the largest remaining “spreadsheet-like” expectation while preserving topology constraints.
3. After coordinate operation authority exists, add support/fitting/catalogue edit intents in separate bounded PRs.
4. Add multi-cell range/paste only once a certified batch UX contract defines validation, conflicts and one-transaction Apply semantics.

## 11. Next-Agent Handover

**Current stopping point:** implementation complete; Stage 8 evidence observation in progress.

**PR / branch / HEAD:** #1020 / `agent/fix-topology-validation-worker-production`; qualified production tree `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5`. This report update will create a documentation-only newer head.

**Last completed stage:** Stage 7 — bounded row window.

**Current active stage:** Stage 8 — final reconciliation.

**Start here:** fetch current PR head and workflow runs. Confirm remaining retained checks conclude. Do not edit production unless a final-head check identifies a real production regression.

**Do not redo:** worker RCA, details sizing, direct PIPE editing, compound routing, window design.

**Do not assume:** >300-row real-browser fixture was run; unsupported properties are editable.

**Files currently involved:** report only unless a check fails.

**Known failing checks:** None among completed checks.

**Validation still required:** completion status of SJSON Render, Real User Reachability, Tool Audit; then report-only final-head observation.

**Open engineering questions:** None.

**Deferred improvements:** coordinate/support/fitting editing and multi-cell batch UX.

**Highest-risk remaining item:** evidence drift from report-only head retriggering workflows.

**Exact next recommended action:** observe current head checks; if green, update Closure Record and PR body without changing production scope.

**Required reading:** sections 0, 3, 8, 13 only.

## 12. Process Notes / Lessons Learned

- DOM selector attributes can become production identity contracts.
- Chromium native `<details>` geometry required real-browser evidence rather than CSS inference.
- `NEEDS_INPUT` must remain an engineering evidence boundary, not be flattened into free text.
- Virtualization must keep projection authority complete and only bound DOM materialization.
- A fixed render cap is not equivalent to virtualization; hiding rows is a user-facing correctness issue.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | IMPLEMENTATION YES; final evidence observation pending |
| In-scope items dispositioned | YES |
| Engineering Item Register synchronized | YES |
| Changed files reconciled | YES — 14/14 exact |
| Validation rerun at production final HEAD | YES for qualified production tree `13c3724d…`; retained long checks still finalizing |
| Unexplained changes | NONE |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Final HEAD | pending report-only closure head |

**Final outcome:** implementation complete; closure evidence finalization in progress.

**Remaining known limitations:** no direct XYZ/support/fitting/multi-cell edit support; >300-row browser fixture not independently run.

**Recommended next PR:** certified node/connected-run coordinate editing.

**Final HEAD:** to be recorded after Stage 8 closure.