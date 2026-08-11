# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. The implementation mission is complete. This closure commit changes this report only; the immediately preceding closure-evidence head `860a651e4c5ec0d95c87cb53fcc7503f2967b2ed` had the full triggered workflow matrix green.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and deliver a compact, dynamically scrolling, governed spreadsheet-style 3D Edit Engineering Table. |
| Source issue/task | Owner-authorized PR #1020 assignment: production validation-worker failure + spreadsheet Engineering Table plan. |
| PR number | #1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Qualified production HEAD | `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5` |
| Fully green closure-evidence HEAD | `860a651e4c5ec0d95c87cb53fcc7503f2967b2ed` |
| PR status | OPEN / DRAFT / mergeable; not merged and not marked ready |
| Current stage | Stage 8 — COMPLETE |
| Last completed stage | Stage 8 — final reconciliation and closure |
| Engineering status | DONE for authorized scope. No known in-scope production defect remains. |
| Validation status | All 13 triggered workflows on `860a651e…` completed SUCCESS: Table Slices 1/2/3/4/6/7/8, main-gate, non-FEA, SJSON Interaction, SJSON Render, Real User Reachability and complete 3D Tool Audit. |
| Current blocker | None. |
| Exact next action | Owner review. Keep PR draft unless the Owner explicitly requests ready/merge. |

### Handover in 60 seconds

**What is now true:** validation worker bundles/loads in production. Engineering Table is compact (11px), resizable, dynamically X/Y scrollable, sticky-header with five frozen context columns. PIPE length is a certified direct numeric cell with transient draft/error/stale state and Enter/Tab/Shift/Escape behavior. Certified VALVE/TEE `NEEDS_INPUT` cells activate/focus their existing exact compound editors without staging. The hard 300-row cutoff is removed; complete projected rows are presented through bounded 120-row DOM windows with deterministic spacer geometry and scroll/focus continuity.

**Currently being worked on:** nothing in the authorized implementation scope. PR is ready for Owner review, but remains draft by instruction.

**Remains unfinished by design:** direct XYZ/node, support, fitting/catalogue scalar editing and multi-cell range/paste are deferred because certified Table operations/batch UX do not yet exist.

**Must not be assumed:** every visible field is editable; a compound-cell click stages an edit; >300-row real-browser performance was independently qualified. Large-row window math is tested to 1,000 rows; retained Chromium production fixture is the repository’s 20-row demo.

**Highest-risk remaining item:** future scope drift—adding spreadsheet convenience without certified operation authority.

**Exact next recommended action:** review PR #1020 and this report; if accepted, explicitly instruct ready/merge. Recommended next PR is certified node/connected-run coordinate editing.

## 1. Mission and Engineering Intent

### Mission
Make the Engineering Table behave like a professional spreadsheet where engineering authority exists while retaining canonical topology, catalogue evidence and certified session/journal as the only engineering authorities.

### Engineering/user consequence
Users can see more rows/columns in a compact window, scroll the full projected model instead of losing rows after 300, type certified PIPE lengths directly, enter compound VALVE/TEE edits from the cell context, and still rely on Preview → Validate → Apply for any canonical mutation.

### Scope
Production worker repair; dense/dynamic table shell; direct PIPE cell; VALVE/TEE compound-cell entry; bounded row virtualization; validation/reconciliation/handover.

### Governing engineering principles
Canonical topology is sole model authority. Drafts are UI-only. Preview/Validate are non-mutating. Apply remains one atomic certified transaction/undo unit. Capability receipts govern editability. Catalogue/stale/unsupported inputs fail closed. Selection uses exact canonical IDs.

### Explicit non-goals
No direct canonical writes; no second undo stack; no arbitrary catalogue free text; no speculative XYZ/support/fitting editors; no multi-cell paste/range without certified batch semantics; no CI workflow additions; no dependency upgrades/broad refactors.

### Important constraints
All work remained on PR #1020. New modules have same-PR production consumers. Existing exact-head workflows enforce line/import/architecture boundaries. No backup files or unrelated generated churn were added.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Production validation worker | P0 | DONE | inherited | worker asset emitted in production builds |
| Compact typography/controls | P0 | DONE | 4 | Chromium |
| Dynamic X/Y scroll + resize | P0 | DONE | 4 | Table Chromium |
| Sticky/frozen context | P0 | DONE | 4 | Select/Tag/Type/From/To frozen |
| Direct governed PIPE length | P0 | DONE | 5 | authority E2E + transaction contracts |
| Keyboard draft/commit/cancel | P0 | DONE | 5/7 | contracts + Chromium regression |
| VALVE/TEE cell entry | P1 | DONE | 6 | selection/focus contracts + M06/M10 browser lifecycle |
| >300-row access | P0 | DONE | 7 | cap removed; 1,000-row window tests; retained browser regression |
| Broader unsupported edits | P2 | DEFERRED | 7 | no certified operations; explicit roadmap |
| Final reconciliation | P0 | DONE | 8 | 14/14 files reconciled; all closure-evidence workflows green |

## 3. Engineering Item Register

| ID | Type | Priority | Status | Summary / disposition |
|---|---|---:|---|---|
| ISS-001 | defect | P0 | DONE | Vite-recognizable production Worker construction implemented/validated. |
| ISS-002 | defect | P0 | DONE | Fixed inner height cap/competing scroll removed. |
| ISS-003 | defect | P1 | DONE | Frozen column authority/style offsets reconciled. |
| ISS-004 | defect | P0 | DONE | Data viewport consumes resized remaining height. |
| ISS-005 | defect | P0 | DONE | Zero-height/pointer overlap resolved. |
| ISS-006 | defect | P0 | DONE | Max-content width escape contained. |
| ISS-007 | defect | P0 | DONE | Collapsed summary no longer seeds drag geometry. |
| ISS-008 | defect | P0 | DONE | Native details body sizing repaired. |
| ISS-009 | defect | P1 | DONE | Row canonical DOM identity uniqueness restored. |
| ISS-010 | defect | P0 | DONE | Fixed 300-row cutoff replaced by bounded row windows. |
| IMP-001 | improvement | P0 | DONE | Compact controls. |
| IMP-002 | improvement | P0 | DONE | Direct PIPE spreadsheet cell. |
| IMP-003 | improvement | P0 | DONE | Draft/error/stale keyboard state. |
| IMP-004 | improvement | P0 | DONE | Bounded row virtualization. |
| IMP-005 | improvement | P1 | DONE | VALVE/TEE cell entry to existing compound editor. |
| QST-001 | question | P0 | DONE | PIPE length is the only current direct scalar capability. |
| QST-002 | question | P1 | DONE | Virtualization uses fixed geometry + spacer/window design. |
| RISK-001 | risk | HIGH | CONTROLLED | Spreadsheet remains UI/intent surface, not model authority. |
| RISK-002 | risk | MEDIUM | ACCEPTED | No local checkout; exact-head GitHub evidence used. |
| RISK-003 | risk | MEDIUM | CONTROLLED | Rerender focus explicitly restored; browser regression green. |
| RISK-004 | risk | MEDIUM residual | ACCEPTED | 1,000-row math validated; >300-row real-browser fixture not run. |
| DEBT-001 | debt | MEDIUM | ACCEPTED | Compound form stays in lower region to preserve one form authority. |
| DEBT-002 | debt | MEDIUM | DEFERRED | Multi-cell range/paste requires future certified batch UX. |
| DEC-012 | decision | — | ACCEPTED | Direct/lower PIPE paths share governed staging helper. |
| DEC-013 | decision | — | ACCEPTED | Raw drafts are transient runtime UI state. |
| DEC-015 | decision | — | ACCEPTED | Canonical row DOM identity is unique. |
| DEC-016 | decision | — | ACCEPTED | `NEEDS_INPUT` cells route to existing compound editor only. |
| DEC-017 | decision | — | ACCEPTED | Full projection remains authoritative; only DOM materialization is windowed. |

### Significant closure evidence
ISS-010 root cause was a safety cap (`slice(0,300)`), not true virtualization. Resolution keeps complete visible-row projection, renders up to 120 real rows at 33px, shifts in 40-row coarse blocks with overscan, uses top/bottom spacers, restores X/Y scroll, resets vertical window on filter/sort, and computes PIPE keyboard targets from the full filtered projection. Short/middle/last/target windows are tested through 1,000 rows. No topology/intent/transaction authority changed.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output |
|---|---|---|---|
| 1 | COMPLETE | report initialization/findings | living report |
| 2 | COMPLETE | PR allocation/report sync | PR-numbered report |
| 3 | COMPLETE | changed-file/metadata verification | synchronized draft PR |
| 4 | COMPLETE | dense dynamic spreadsheet shell | compact scroll/frozen/resizable table |
| 5 | COMPLETE | direct governed PIPE cell | typed cell/keyboard lifecycle |
| 6 | COMPLETE | compound VALVE/TEE entry | cell → existing governed editor |
| 7 | COMPLETE | remove hidden-row cap | bounded row virtualization |
| 8 | COMPLETE | final reconciliation/closure | green closure evidence + handover |

## 5. Stage Execution Log

### Stage 4 — COMPLETE
Implemented compact styling, dynamic X/Y scroll, sticky/frozen columns, separate data/lower scroll domains, bounded panel sizing, safe collapsed/open drag behavior and Chromium-native details sizing repair. Production Chromium qualified final geometry.

### Stage 5 — COMPLETE
Added shared governed PIPE staging helper and production direct-cell module. Typing is transient; invalid input does not stage; Enter/Tab stage through existing intent/batch/plan; Escape cancels. Canonical changes/discard/destroy clear drafts. Fixed child canonical-ID collision. Exact Stage-5 matrix green.

### Stage 6 — COMPLETE
Added compact `NEEDS_INPUT` compound buttons only for certified VALVE_REPLACEMENT / TEE_REDUCER_RELATION capabilities. Activation exact-selects and focuses the existing lower editor; no intent/batch/canonical mutation occurs. Added focused selection/focus contracts; existing M06/M10/transaction Chromium remained green.

### Stage 7 — COMPLETE
Added deterministic row-window and scroll-runtime modules, spacer rendering, scroll restoration, fixed 33px row geometry, filter/sort reset and full-projection PIPE Tab navigation. Removed the fixed 300-row cutoff. Node tests cover 20-row and 1,000-row first/middle/last/target windows. Exact Table/build/Chromium authorities green. Deliberate deviation: no generated >300-row production-browser fixture was added.

### Stage 8 — COMPLETE
**Before:** implementation complete; 14-file diff identified; long retained closure checks pending.

**Objective:** reconcile files/items/evidence and leave a takeover-ready report.

**Implementation performed:** no production code. Actual GitHub changed-file list reconciled 14/14; no workflow files; closure-evidence head `860a651e…` differs from qualified production head only by this report and completed all 13 triggered workflows SUCCESS.

**Validation performed:**
| Check | Result | Evidence/Notes |
|---|---|---|
| Actual changed-file reconciliation | PASS | 14/14 ledger match |
| Unexplained files | PASS | none |
| `.github/workflows/*` changes | PASS | none |
| Table Slices 1/2/3/4/6/7/8 | PASS | exact `860a651e…` |
| Slice 3 line/import/Node/build/Chromium | PASS | exact `860a651e…` |
| Slice 6 M06/M10/transaction/build/Chromium | PASS | exact `860a651e…` |
| `main-gate` | PASS | exact `860a651e…` |
| non-FEA | PASS | exact `860a651e…` |
| SJSON Interaction | PASS | exact `860a651e…` |
| SJSON Render incl. real Chromium/WebGL | PASS | exact `860a651e…` |
| Real User Reachability incl. high-signal regressions | PASS | exact `860a651e…` |
| Complete 3D Tool Audit incl. full-canvas pick | PASS | exact `860a651e…` |

**Stage decision:** COMPLETE.

**Handover delta:** implementation and closure are complete; only Owner review/ready/merge decision remains.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR1020_workreport.md` | 1 | 8 | living report/handover | Yes | reconciled |
| `e2e/topology-edit-table-authority.spec.js` | 4 | 5 | production Table authority E2E | Yes | Chromium PASS |
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | production worker fix | Yes | build/matrix PASS |
| `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js` | 5 | 7 | direct/compound/window-aware cell behavior | Yes | contracts/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` | 4 | 7 | dense/frozen/window renderer | Yes | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-pipe-length-runtime.js` | 5 | 5 | shared PIPE staging | Yes | transaction/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-productivity-adapter.js` | 4 | 4 | panel open/drag boundary | UI | Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-row-window.js` | 7 | 7 | deterministic virtualization math | UI | 1,000-row tests PASS |
| `src/workspace/viewport-productivity/topology-edit-table-runtime.js` | 5 | 7 | event/scroll integration | Yes | guards/build/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-scroll-runtime.js` | 7 | 7 | virtual scroll ownership | UI | guards/Chromium PASS |
| `src/workspace/viewport-productivity/topology-edit-table-styles.js` | 4 | 7 | compact/frozen/window geometry | UI | Chromium PASS |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | worker regression | Yes | PASS |
| `tests/topology-edit-table-selection-contract.test.mjs` | 6 | 6 | compound selection/focus evidence | Yes | PASS |
| `tests/topology-edit-table-view-state.test.mjs` | 7 | 7 | selection + row-window tests | Yes | PASS |

**Reconciliation:** actual PR file list = ledger exactly. Unexplained changes: 0. Workflow changes: 0.

## 7. Engineering Decisions and Invariants

| Invariant | Enforcement | Validation | Result |
|---|---|---|---|
| Canonical topology is sole model authority | existing certified session/transaction | transaction + E2E | preserved |
| Typing/compound activation does not mutate model | transient drafts / selection only | E2E + selection tests | preserved |
| Preview/Validate are non-mutating | existing workflow | authority E2E | preserved |
| Apply is one atomic undo unit | certified journal | transaction + Undo/Redo E2E | preserved |
| Unsupported cells fail closed | capability receipt | cell contracts | strengthened |
| Stale targets fail/rebase explicitly | existing batch/rebase | Node contracts | preserved |
| Virtualization cannot change projection authority | complete visible-row projection remains source | window tests + browser | preserved |

## 8. Validation and Evidence Ledger

### Software validation
Closure-evidence HEAD `860a651e4c5ec0d95c87cb53fcc7503f2967b2ed`: **13/13 triggered workflows SUCCESS**. This report-seal commit is documentation-only; GitHub PR status is the exact-head authority after the seal.

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| production worker asset emitted | VALIDATED | production builds |
| compact/dynamic/frozen layout | VALIDATED | real Chromium |
| PIPE typing no-op until governed stage/apply | VALIDATED | authority E2E |
| invalid PIPE input creates no batch | VALIDATED | authority E2E |
| compound activation selection/focus only | VALIDATED | selection contract |
| M06/M10 remain governed/atomic | VALIDATED | Slice 6 + Chromium |
| fixed 300-row cutoff removed | VALIDATED | source + 1,000-row tests |
| retained production browser lifecycle after virtualization | VALIDATED | Slice 3/6 Chromium |
| >300-row real-browser performance/reachability | NOT_RUN | explicitly deferred evidence improvement; no large production fixture added |

### Explicitly not validated / out of scope
Direct XYZ/node editing; support/fitting editing; arbitrary catalogue scalar edits; multi-cell range/copy/paste; >300-row real-browser performance fixture.

## 9. Known Issues, Improvements, and Deferred Scope

**Open defects:** none known in authorized scope.

**Deferred improvements:** certified node/connected-run coordinate editing; support editing; additional fitting/catalogue operations; multi-cell range/paste after a certified batch UX contract; optional large-model real-browser virtualization qualification.

**Open engineering risks/questions:** no blocker. Residual RISK-004 is evidence coverage only: large-row algorithm is independently tested but no >300-row real-browser fixture was introduced.

**Accepted technical debt:** DEBT-001 single lower compound form; DEBT-002 no range/paste in this PR.

## 10. Recommended Forward Sequence

1. Owner reviews PR #1020 and this report; explicitly request ready/merge if acceptable.
2. Next PR: certified node/connected-run coordinate editing for spreadsheet XYZ workflows. This is sequenced next because it addresses the largest remaining user expectation and first requires a governed professional operation.
3. Follow with certified support/fitting/catalogue edit operations.
4. Add multi-cell range/paste only after one-batch validation/conflict/transaction semantics are specified.
5. Optionally add a production-shaped >300-row browser qualification fixture for virtualization performance evidence.

## 11. Next-Agent Handover

**Current stopping point:** work complete; PR stays draft.

**PR / branch:** #1020 / `agent/fix-topology-validation-worker-production`.

**Qualified production HEAD:** `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5`.

**Fully green closure-evidence HEAD:** `860a651e4c5ec0d95c87cb53fcc7503f2967b2ed`.

**Current active stage:** none; Stage 8 complete.

**Start here:** no coding. Review current PR head/diff and this report. If Owner asks for a follow-up fix, record a new stage before editing; otherwise do not broaden scope.

**Do not redo:** worker RCA, details sizing investigation, direct PIPE staging, compound routing, virtualization design.

**Do not assume:** unsupported properties are editable or that a >300-row browser fixture was run.

**Files currently involved in unfinished work:** none.

**Known failing checks:** none on fully green closure-evidence head.

**Validation still required:** none for current authorized scope. GitHub will retrigger checks for this documentation-only seal commit; inspect current PR status before ready/merge.

**Open engineering questions:** none blocking.

**Deferred improvements:** coordinate/support/fitting editing, multi-cell batch UX, large-model browser evidence.

**Highest-risk remaining item:** future architecture drift if spreadsheet appearance is allowed to bypass capability/transaction authority.

**Exact next recommended action:** Owner review; keep draft until explicit ready/merge instruction.

**Required reading:** sections 0, 3, 8, 13.

## 12. Process Notes / Lessons Learned

- DOM selector attributes can be production identity contracts; duplicating canonical identity on a child control broke strict row targeting.
- Native Chromium `<details>` sizing differed from CSS-only expectations; real browser geometry evidence found the root cause.
- `NEEDS_INPUT` is an engineering evidence boundary, not permission to make a cell free text.
- A fixed render cap is not virtualization; hiding projected rows is a correctness problem.
- Virtualization must leave projection/selection/transaction authority complete and only bound DOM materialization.
- Superseded workflow runs may be cancelled by branch concurrency; cancelled is not equivalent to failed. Closure evidence was therefore collected on a stable report-only head before sealing.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | YES |
| In-scope items dispositioned | YES |
| Engineering Item Register synchronized | YES |
| Changed files reconciled | YES — 14/14 exact |
| Validation rerun at closure-evidence HEAD | YES — 13/13 triggered workflows SUCCESS |
| Unexplained changes | NONE |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Qualified production HEAD | `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5` |
| Fully green closure-evidence HEAD | `860a651e4c5ec0d95c87cb53fcc7503f2967b2ed` |
| Final report seal | documentation-only successor; resolve as current PR head |

**Final outcome:** production validation worker is fixed and Engineering Table now provides the planned dense/dynamic governed spreadsheet experience, including direct PIPE editing, compound VALVE/TEE entry and bounded row virtualization, without changing canonical/transaction authority.

**Remaining known limitations:** unsupported certified operations and >300-row real-browser performance fixture as explicitly recorded above.

**Recommended next PR:** certified node/connected-run coordinate editing.

**Final production HEAD:** `13c3724d91f7b1034f7e1fdff7ee95d2b83ad0f5`.