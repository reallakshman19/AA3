# PR Engineering Work Report

> Living handover authority for the current assignment. This file must describe the repository/PR state represented by the branch at all times.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Repair production validation-worker loading and convert the 3D Edit Engineering Table toward a compact, dynamically scrolling, governed spreadsheet editing surface. |
| Source issue/task | Owner request in current assignment; inherited production worker defect from the immediately preceding task on the same PR. |
| PR number | 1020 already allocated before this protocol was supplied; Stage 2 will synchronize the canonical report filename. |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | `a9801fe4b2c09854f4122bfd1dae78eae70c2a38` before this report-initialization commit |
| PR status | OPEN / DRAFT / mergeable at last inspection |
| Current stage | Stage 1 — Report initialization and technical findings |
| Last completed stage | None under this protocol |
| Engineering status | INVESTIGATING |
| Validation status | NOT_RUN at current spreadsheet scope; inherited worker change has source-level regression coverage but no final-head execution evidence yet |
| Current blocker | No local checkout or `gh` binary in this execution environment; repository writes and inspection are through the connected GitHub API. |
| Exact next action | Complete Stage 1 report initialization, then rename/synchronize to `agents/PR1020_workreport.md` as Stage 2 before production edits. |

### Handover in 60 seconds

- **What is now true:** PR #1020 exists on `agent/fix-topology-validation-worker-production`. Before this protocol it already contained a production validation-worker bundling fix plus its focused unit-test guard. The requested spreadsheet work has not yet modified production code.
- **Currently being worked on:** establishing the mandated living work report before any new production edit.
- **Remains unfinished:** report synchronization to PR number, changed-file reconciliation, dense/dynamic table shell, inline spreadsheet editing, engineering edit-surface expansion, and final validation.
- **Must not be assumed:** do not assume current CI is green; do not assume arbitrary visible table fields are safe to edit; do not assume cell edits may mutate canonical topology directly.
- **Highest-risk remaining item:** RISK-001 — spreadsheet UX could accidentally create a second model authority if drafts bypass certified intents/planning/validation/transactions.
- **Exact next recommended action:** finish Stage 1, then Stage 2 report rename/synchronization; no production-code edits before both are recorded.

## 1. Mission and Engineering Intent

### Mission
Provide an engineering-table experience that is materially closer to a spreadsheet: denser typography, dynamically available horizontal/vertical scrolling, direct typed cell editing where engineering authority exists, predictable keyboard navigation, visible staged/invalid/stale state, and batch apply semantics.

### Engineering/user consequence
The current table hides information in constrained layouts and forces users to select a row then edit in a separate panel. For piping-model authoring this increases navigation cost and makes bulk engineering review/editing feel disconnected from the tabular representation. The target is direct manipulation of tabular engineering values without weakening canonical topology custody.

### Scope
- Preserve and qualify the inherited production validation-worker loading fix already present on PR #1020.
- Reduce Engineering Table font/control density and make scrolling consume available window space dynamically.
- Add a spreadsheet interaction layer for fields that already have explicit governed edit authority.
- Route accepted cell edits into the existing table intent → batch plan → preview → validation → certified transaction path.
- Extend engineering edit authority only where an existing or explicitly implemented governed operation can represent the edit without inference.
- Add/adjust focused tests and existing qualification coverage; no new CI workflows.

### Governing engineering principles
1. Canonical topology remains the single model authority.
2. Table projection remains derived from canonical/source authority and is never an independent model.
3. Typing into a cell changes UI draft/staged state only; canonical topology changes only through explicit certified Apply.
4. Catalogue-governed engineering properties may not become arbitrary free text.
5. Derived display fields remain read-only unless an explicit inverse engineering operation exists.
6. Stale target revisions fail closed or require explicit rebase/conflict handling.
7. One applied spreadsheet batch must remain one governed engineering transaction for undo/redo purposes.
8. No hidden fallbacks, guessed values, default mocks, or authority-changing shims.

### Explicit non-goals
- Replacing the canonical topology/session/journal architecture.
- Direct mutation of `canonicalTopology.nodes`, `edges`, junctions, supports, or shared workspace objects from DOM input handlers.
- Adding speculative edit types with no production consumer.
- Adding new GitHub Actions workflows or CI gates.
- Broad refactoring unrelated to the Engineering Table work pack.

### Important constraints
- New modules should remain below 300 physical lines where practical and functions below 40 logical lines where practical.
- Named exports only unless framework constraints require otherwise.
- No production mocks or silent fallback data.
- Existing table intent authority includes dataset/source/canonical/projection/session/journal/ledger identity and per-row target revision; this must remain enforced.
- Existing user-visible Apply remains the canonical mutation boundary.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living PR work report | P0 | IN_PROGRESS | 1 | This file |
| Synchronize report to PR #1020 | P0 | NOT_STARTED | 2 | Pending |
| Reconcile inherited changed files | P0 | NOT_STARTED | 3 | PR currently reports two changed files |
| Production validation-worker loading fix | P0 | IMPLEMENTED | inherited/pre-protocol | PR head before report contains worker-client + test changes |
| Dense typography and compact controls | P1 | NOT_STARTED | 4 | Current CSS uses `.78rem`, ~1.8rem inputs and ~2rem buttons |
| Dynamic scroll/available-space table viewport | P1 | NOT_STARTED | 4 | Current grid has `max-height:min(48vh,470px)` |
| Sticky/frozen spreadsheet navigation shell | P1 | NOT_STARTED | 4 | Column metadata already marks Tag/Type frozen |
| Inline cell-edit framework | P1 | NOT_STARTED | 5 | Current renderer emits display-only `<td>` values |
| Existing PIPE length intent through direct cell edit | P1 | NOT_STARTED | 5 | `PIPE_LENGTH` already governed by table intent contract |
| Existing VALVE/TEE compound editors integrated with spreadsheet cells | P2 | NOT_STARTED | 6 | Existing governed intents are `VALVE_REPLACEMENT` and `TEE_REDUCER_RELATION` |
| Broader engineering edit surface (XYZ/catalogue/fittings/supports) | P2 | NOT_STARTED | 7 | Requires explicit governed operations; no direct mutation allowed |
| Final changed-file reconciliation and validation | P0 | NOT_STARTED | 8 | Pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | confirmed defect | HIGH | IMPLEMENTED | Production validation worker could fail to bundle/load because Vite-recognized static worker constructor form was not used. | Yes |
| ISS-002 | confirmed defect | MEDIUM | ACCEPTED | Engineering table viewport uses a fixed max-height and nested scrolling that can hide/strand content instead of consuming dynamically available window space. | Yes |
| IMP-001 | improvement | P1 | ACCEPTED | Reduce table typography/control density for engineering-data review. | Yes |
| IMP-002 | improvement | P1 | ACCEPTED | Make cells directly editable like a spreadsheet where an explicit governed edit mapping exists. | Yes |
| IMP-003 | improvement | P1 | ACCEPTED | Add keyboard cell navigation, staged/error/stale cell states, and paste-ready selection semantics. | Yes |
| IMP-004 | improvement | P2 | ACCEPTED | Replace hard 300-row rendering cap with windowed/virtualized rendering after interaction semantics are stable. | Yes, later stage |
| IMP-005 | improvement | P2 | DEFERRED | Broad XYZ/catalogue/fitting/support edit coverage beyond currently governed table intents may require new operation contracts and should be added only when each has production authority. | Current PR only where technically bounded |
| RISK-001 | engineering risk | HIGH | ACCEPTED | Spreadsheet UX could create a second model authority if drafts mutate canonical state directly. | Yes |
| RISK-002 | release risk | HIGH | ACCEPTED | No local checkout/`gh` means validation must rely on source inspection plus repository-hosted checks available through existing infrastructure. | Yes |
| RISK-003 | engineering risk | MEDIUM | ACCEPTED | Re-rendering on every keystroke can destroy focus/caret or uncommitted cell drafts. | Yes |
| DEC-001 | design decision | HIGH | ACCEPTED | Cell edits stage governed table intents; Apply remains the only canonical mutation boundary. | Yes |
| DEC-002 | design decision | HIGH | ACCEPTED | Read-only/derived/catalogue fields are not made free-text merely for spreadsheet appearance. | Yes |
| DEC-003 | design decision | MEDIUM | ACCEPTED | UI density/scrolling is implemented before edit-surface expansion to isolate visual/layout regressions from engineering-semantic changes. | Yes |
| QST-001 | engineering question | MEDIUM | INVESTIGATING | Which existing table columns can safely become direct scalar cells without adding new engineering authority contracts? | Yes |
| DEBT-001 | technical debt | LOW | ACCEPTED | Existing PR contains two worker-fix commits created before the Owner supplied this reporting protocol; report adoption begins at current branch state rather than rewriting published history. | Yes |

### ISS-001 — production validation-worker load failure
- **Status:** IMPLEMENTED, validation pending final-head checks.
- **Severity:** HIGH.
- **Stage discovered:** inherited before protocol adoption.
- **Affected:** `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js`.
- **Observed:** Create-first-pipe Preview worked, Validate surfaced `TopologyEditValidationWorkerClient: validation worker failed.`
- **Engineering consequence:** governed candidate could not reach validation/Apply in production deployment.
- **Root cause:** worker URL was constructed separately and passed through an injected constructor path, preventing Vite production worker transformation from recognizing the static module worker reference.
- **Chosen resolution:** production path uses `new Worker(new URL('./topology-edit-validation-worker.js', import.meta.url), { type: 'module', ... })`; injected constructor/url retained only for explicit test configuration.
- **Alternatives:** main-thread fallback rejected because it changes runtime/authority/performance behavior and would be a hidden shim.
- **Validation required:** focused client tests, production build, production browser Start Route qualification.
- **Closure evidence:** pending final-head validation.

### ISS-002 — constrained table viewport
- **Status:** ACCEPTED.
- **Severity:** MEDIUM.
- **Stage discovered:** Stage 1.
- **Affected:** `src/workspace/viewport-productivity/topology-edit-table-styles.js`, grid/window composition.
- **Observed:** `.topology-edit-table__scroll` is capped to `min(48vh,470px)` inside another scrolling window body.
- **Engineering consequence:** users can lose effective access to wide/long engineering rows and controls; window resizing does not proportionally enlarge the grid.
- **Root cause:** fixed-height inner table viewport and competing nested overflow regions.
- **Chosen resolution:** make the table component consume remaining window height using minmax/flex/grid sizing and one intentional spreadsheet overflow viewport with automatic X/Y scrollbars.
- **Validation required:** responsive browser checks at multiple window sizes and wide row content.

### RISK-001 — second authority risk
- **Status:** ACCEPTED / actively controlled.
- **Severity:** HIGH.
- **Affected:** table renderer/runtime/intent/batch/workflow.
- **Invariant:** UI drafts may never become canonical topology except through existing governed planning, preview, worker validation, and certified transaction apply.
- **Validation required:** before/after canonical hash assertions around editing/staging/preview/validation and exact change only after Apply.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | IN_PROGRESS | Report initialization and technical findings | `agents/PR_PENDING_workreport.md` with initial findings/roadmap | pending |
| 2 | NOT_STARTED | PR allocation and report synchronization | Rename/synchronize to `agents/PR1020_workreport.md`, record PR metadata | pending |
| 3 | NOT_STARTED | Changed-file verification and documentation-stage completion | Reconcile actual PR changed files; update PR mission/body scope if needed | pending |
| 4 | NOT_STARTED | Dense, dynamically scrolling spreadsheet shell | Compact CSS, available-space scroll viewport, sticky/frozen presentation | pending |
| 5 | NOT_STARTED | Inline spreadsheet editing foundation | Active/edit cell state, typed PIPE length direct cell editing, keyboard commit/cancel | pending |
| 6 | NOT_STARTED | Existing compound editor integration | Spreadsheet cells trigger existing VALVE/TEE governed editors without free-text authority drift | pending |
| 7 | NOT_STARTED | Bounded engineering edit-surface expansion and scaling | Only production-backed new edit operations; virtualization if safely separable | pending |
| 8 | NOT_STARTED | Final validation, reconciliation, closure | Final HEAD evidence, changed-file ledger match, closure record | pending |

## 5. Stage Execution Log

### Stage 1 — Report initialization and technical findings

#### Before stage
PR #1020 was created before the reporting protocol. Its branch contained only the production validation-worker fix and focused regression test. No spreadsheet production edits had been made.

#### Objective
Create the mandatory living work report and record current technical truth, risks, decisions, roadmap, validation gaps, and handover state before any new production edit.

#### Scope
- `agents/PR_PENDING_workreport.md` only.
- Inspect current PR metadata, existing diff list, table runtime/styles/projection/columns/intent contracts, and existing table/browser tests already identified in repository review.

#### Engineering rationale
The spreadsheet work affects UI state, engineering intent compilation, and transaction boundaries. A durable handover record is required before modifying those coupled paths so scope and invariants remain explicit.

#### Planned implementation
Create this report, populate all required living sections, document inherited PR state, and explicitly mark prior worker changes as pre-protocol/inherited rather than reconstructing false history.

#### Expected examples
A new agent receiving only repo + PR #1020 + this report can identify current branch/base, inherited changes, upcoming spreadsheet stages, highest risk, and exact next action.

#### Edge cases
- PR number already exists, so Stage 2 will perform naming synchronization immediately after Stage 1 rather than waiting for allocation.
- `agents/` did not exist on the branch at inspection; file creation will establish the directory path.

#### Planned validation
- Fetch PR metadata.
- Fetch actual changed-file list.
- Confirm report file is present on branch after creation.

#### Known risks
Report commit changes HEAD, so Stage 1 must be updated after creation with the resulting commit and then Stage 2 must synchronize naming before production edits.

#### Implementation performed
IN_PROGRESS — this initial report creation is the Stage 1 implementation.

#### Changed files
| File | Change | Why |
|---|---|---|
| `agents/PR_PENDING_workreport.md` | Created | Required living engineering/work-handover authority before production spreadsheet edits. |

#### Deviations from plan
None at initialization. The protocol was received after PR #1020 and its inherited worker fix already existed; this is recorded as DEBT-001 rather than rewriting published history.

#### Validation performed
| Check | Result | Evidence/Notes |
|---|---|---|
| PR metadata inspected | PASS | PR #1020 open/draft/mergeable; base `751756e...`; head before report `a9801fe...` |
| Existing PR changed-file list inspected | PASS | Exactly worker client + focused worker client test before report creation |
| Report exists at pending path | IN_PROGRESS | This creation commit establishes it |

#### Issues discovered
ISS-002, IMP-001..005, RISK-001..003, DEC-001..003, QST-001, DEBT-001 recorded above.

#### Risks introduced or remaining
RISK-001, RISK-002, RISK-003 remain.

#### Stage decision
IN_PROGRESS until post-create synchronization records the resulting commit/HEAD.

#### Handover delta
- **Newly true:** initial technical state and stage plan are documented.
- **Newly discovered:** table uses a fixed inner max-height and existing edit-authority metadata is narrower than displayed columns.
- **Still unresolved:** QST-001 direct-editable column set; all implementation stages.
- **Next stage starts with:** complete Stage 1 post-create update, then Stage 2 PR-number filename synchronization.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | Production module-worker bundling/load fix | Yes | Focused source/unit regression present; final-head execution pending |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | Guard production Worker constructor form and client behavior | No | Final-head execution pending |
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living PR report before PR-number synchronization | No | Presence/reconciliation pending Stage 2 |

## 7. Engineering Decisions and Invariants

### DEC-001 — governed staging, explicit Apply
**Must remain true:** direct cell editing changes only draft/staged UI state; canonical geometry/topology changes only after certified Apply.
**Enforced by:** table runtime intent/batch/preview/validation/workflow path.
**Validation:** canonical hash unchanged through typing/staging/preview/validation; changes only after Apply; undo restores prior hash.
**PR impact:** central design invariant for spreadsheet implementation.

### DEC-002 — no fake editability
**Must remain true:** catalogue, derived, identity, or otherwise ungoverned fields remain read-only or use a governed selector/compound editor.
**Enforced by:** column descriptors + cell editor resolver + intent normalization.
**Validation:** UI edit affordance exists only for production-consumed intent types; attempts to type read-only fields are impossible or rejected visibly.
**PR impact:** prevents spreadsheet appearance from weakening engineering custody.

### DEC-003 — layout before semantics
**Must remain true:** density/scroll changes land as a separately reviewable stage before inline edit semantics.
**Enforced by:** stage sequencing and changed-file ledger.
**Validation:** Stage 4 tests focus on layout/reachability without semantic behavior changes.

## 8. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Changed-file list vs ledger | PARTIAL | `a9801fe...` pre-report | Two inherited files matched before report creation; report will add expected documentation file |
| Worker client focused tests | NOT_RUN | current | No local checkout; repository-run evidence still required |
| Production build | NOT_RUN | current | Existing checks to be queried after implementation commits |
| Table unit tests | NOT_RUN | current | Planned Stage 4+ |
| Table Chromium authority flow | NOT_RUN | current | Existing `e2e/topology-edit-table-authority.spec.js` identified |
| Empty-model Start Route production behavior | NOT_RUN | current | Existing empty-model E2E identified; production-build qualification still required |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Canonical topology remains unchanged before Apply | NOT_RUN | Required Stage 5+ authority assertions |
| Direct editable cells map only to governed intents | INVESTIGATING | Current intent kinds limited to PIPE_LENGTH, VALVE_REPLACEMENT, TEE_REDUCER_RELATION |
| Dynamic scrolling exposes wide/long content | NOT_RUN | Required Stage 4 browser evidence |
| Stale revision blocks/forces rebase safely | NOT_RUN | Existing runtime rebase behavior identified; spreadsheet path must retain it |
| Undo/redo stays certified-session atomic | NOT_RUN | Existing table workflow already has governed transaction path; new cell UX must reuse it |

### Explicitly not validated
- No final-head CI result has been observed yet.
- No browser screenshot/viewport evidence for density or dynamic scrolling exists yet.
- No arbitrary XYZ coordinate editing is currently authorized by table intents.
- No claim is made that all visible fields can safely become editable.

## 9. Known Issues, Improvements, and Deferred Scope

### Open defects
- ISS-002 — fixed-height/nested scrolling table viewport.

### Deferred improvements
- IMP-005 — broader field coverage beyond production-backed edit contracts is deferred unless a bounded operation is implemented and consumed in this PR.

### Open engineering risks
- RISK-001 — second authority risk.
- RISK-002 — validation environment limitations.
- RISK-003 — focus/caret loss during rerender.

### Open engineering questions
- QST-001 — exact direct-editable column set under current authority.

### Accepted technical debt
- DEBT-001 — inherited pre-protocol commits remain in published PR history.

## 10. Recommended Forward Sequence

1. **Stage 2 report synchronization.** Required so future agents have the canonical `agents/PR1020_workreport.md`. Addresses DEBT-001 operationally.
2. **Stage 3 changed-file verification.** Establishes a clean pre-production-edit ledger and updates PR scope so worker repair + spreadsheet work are both explicit.
3. **Stage 4 dense/dynamic shell.** Addresses ISS-002 and IMP-001 first because layout reachability can be qualified without changing engineering semantics.
4. **Stage 5 inline editing foundation.** Addresses IMP-002/003 using existing PIPE_LENGTH authority first; depends on DEC-001/002 and resolves most of QST-001 for scalar edits.
5. **Stage 6 compound editor integration.** Reuses existing VALVE_REPLACEMENT and TEE_REDUCER_RELATION contracts instead of inventing free-text fields.
6. **Stage 7 bounded expansion/scaling.** Only after spreadsheet interaction is stable. Virtualization addresses IMP-004. New XYZ/catalogue/fitting/support edits address IMP-005 only when explicit governed operations exist.
7. **Stage 8 closure.** Re-run applicable existing checks, reconcile actual changed files, disposition all register items, update handover and closure record.

## 11. Next-Agent Handover

- **Current stopping point:** Stage 1 report initialization in progress; no new spreadsheet production code changed.
- **PR / branch / HEAD:** PR #1020; `agent/fix-topology-validation-worker-production`; pre-report HEAD `a9801fe4b2c09854f4122bfd1dae78eae70c2a38`.
- **Last completed stage:** none under protocol.
- **Current active stage:** Stage 1. Initial report content created; post-create HEAD/validation update still required.
- **Start here:** fetch `agents/PR_PENDING_workreport.md` on the PR branch, update Stage 1 with its create commit/HEAD and mark COMPLETE, then begin Stage 2 by recording the before-stage block and synchronizing to `agents/PR1020_workreport.md`.
- **Do not redo:** worker-load root-cause investigation, current table style/runtime/projection/column/intent orientation, existing pre-report changed-file listing.
- **Do not assume:** CI green; all fields editable; browser behavior proven.
- **Files currently involved:** pending report; inherited worker client/test; table runtime/styles/grid/columns/projection/intent; existing table E2E.
- **Known failing checks:** None known; checks not yet run/observed on report HEAD.
- **Validation still required:** focused worker test, production build, table tests, browser table flow, empty-model Start Route production path.
- **Open engineering questions:** QST-001.
- **Deferred improvements:** IMP-005.
- **Highest-risk remaining item:** RISK-001 because an incorrect inline edit implementation could bypass canonical governance.
- **Exact next recommended action:** complete Stage 1 report update, then Stage 2 report naming synchronization before any production edit.
- **Required reading:** this report sections 0, 2, 3, 4, 7, 8, 11; `topology-edit-table-runtime.js`; `topology-edit-table-styles.js`; `topology-edit-table-grid-view.js`; `topology-edit-table-columns.js`; `topology-edit-table-intent.js`.

## 12. Process Notes / Lessons Learned

- A spreadsheet-like engineering UI does not require spreadsheet-like authority. Direct manipulation can still compile into immutable, revision-bound engineering intents and one certified transaction.
- Fixed nested scroll regions can make a resizable engineering window appear to hide content even when `overflow:auto` exists; available-space ownership must be explicit.
- Existing column metadata already distinguishes frozen/read-only/editor-backed fields and should be extended/consumed rather than duplicated in DOM event logic.
- Protocol adoption occurred after PR #1020 already existed. Preserve that fact explicitly instead of inventing a false `PR_PENDING` history for the inherited worker implementation.

## 13. PR Closure Record

Not ready for closure.

| Closure Criterion | Result |
|---|---|
| Mission completed | NO |
| In-scope items dispositioned | NO |
| Engineering Item Register synchronized | YES at Stage 1 initialization |
| Changed files reconciled | PARTIAL |
| Validation rerun at final HEAD | NO |
| Unexplained changes | None known |
| Deferred improvements recorded | YES |
| Known limitations recorded | YES |
| Handover current | YES at Stage 1 initialization |
| New CI workflows added | NO |
| Final HEAD | Not final |

### Final outcome
Pending.

### Remaining known limitations
Pending implementation and validation.

### Recommended next PR
To be determined after this PR's bounded spreadsheet scope is complete.

### Final HEAD
Not final.
