# PR #1020 Engineering Work Report

> Canonical living handover authority for PR #1020. Current-state sections are authoritative; Stage Execution Log is historical.

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Preserve the production validation-worker repair and make the 3D Edit Engineering Table a compact, dynamically scrolling, governed spreadsheet editing surface. |
| Source issue/task | Owner-authorized assignment in this conversation; all work stacked on PR #1020. |
| PR number | 1020 |
| Branch | `agent/fix-topology-validation-worker-production` |
| Base commit | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | `3984e470409eb47c0da107ab1928b2578fc562ba` before this Stage-4-preparation report commit |
| PR status | OPEN / DRAFT / mergeable; title/body synchronized to combined mission |
| Current stage | Stage 4 — Dense dynamic spreadsheet shell |
| Last completed stage | Stage 3 — Changed-file verification and documentation-stage completion |
| Engineering status | IN_PROGRESS |
| Validation status | Baseline PASS at `d92b958...`; spreadsheet layout/edit behavior not yet validated |
| Current blocker | No local checkout/`gh`; source changes and evidence use connected GitHub API plus existing repository checks. |
| Exact next action | Edit `topology-edit-table-styles.js` and, only if required for sticky metadata, `topology-edit-table-grid-view.js`; then verify exact diff and existing table checks. |

### Handover in 60 seconds

- **What is now true:** PR metadata matches the combined mission; the net diff at Stage-3 close is exactly the work report plus the two inherited worker-fix files; no workflow files changed. Existing triggered checks were green on `d92b958...`. The repository already has `deriveTopologyEditTableCellCapability`, so editability authority does not need to be invented.
- **Currently being worked on:** Stage 4 layout-only work: smaller typography/controls, one dynamically sized X/Y spreadsheet viewport, sticky header/frozen context.
- **Remains unfinished:** Stage 4 implementation/validation; direct cell editing; keyboard semantics; compound editors; scaling/virtualization; final-head validation.
- **Must not be assumed:** Stage-4 CSS has not been changed yet; PIPE length is the only direct scalar capability currently `AVAILABLE`; valve/TEE require compound governed input; unsupported/derived/support edits remain blocked/unrepresentable.
- **Highest-risk remaining item:** RISK-001 — later cell editing must not create a second model authority.
- **Exact next recommended action:** implement Stage 4 as a layout-only slice and keep table intent/runtime semantics untouched.

## 1. Mission and Engineering Intent

### Mission
Provide spreadsheet-like engineering authoring with compact readable rows, dynamic scrolling, sticky/frozen context, direct editing only where explicit engineering authority exists, keyboard navigation, staged/error/stale state, and atomic certified Apply.

### Engineering/user consequence
The current inner grid is capped at `min(48vh,470px)` inside another scrolling body, so resizing does not give the data grid the available space and wide/long content feels hidden. Editing also lives in a separate row panel rather than the cells. The target must reduce interaction cost without weakening canonical topology custody.

### Scope
- Preserve inherited validation-worker fix.
- Stage 4: density, available-space X/Y scrolling, sticky/frozen context only.
- Stage 5: spreadsheet cell interaction using existing capability authority; start with PIPE length.
- Stage 6: route valve/TEE cells to existing compound governed editors.
- Stage 7: scaling/virtualization and only bounded extra edit authority with real production consumers.
- No new GitHub Actions workflows.

### Governing engineering principles
1. Canonical topology remains the sole model authority.
2. Table projection and DOM state never become independent model truth.
3. Cell typing/staging/preview/validation must not mutate canonical topology.
4. Certified Apply remains the model mutation boundary and one applied batch remains one undo unit.
5. `deriveTopologyEditTableCellCapability` is the current editability authority: `AVAILABLE` may be direct; `NEEDS_INPUT` requires compound input; `BLOCKED`/`UNREPRESENTABLE` is not free-text editable.
6. Catalogue-controlled and derived values are never guessed or silently defaulted.
7. Stale target revisions fail closed or explicitly rebase.

### Explicit non-goals
No direct canonical writes from DOM handlers; no broad refactor; no dependency upgrades; no backup files; no speculative abstractions; no workflow additions.

### Important constraints
Named exports; pure helpers where practical; new JS modules <300 physical lines and functions <40 logical lines where practical; no hidden mocks/fallbacks/shims; every new abstraction must have a production consumer in this PR.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Work report protocol | P0 | DONE | 1-2 | Canonical `agents/PR1020_workreport.md`; pending path removed |
| PR metadata / changed-file reconciliation | P0 | DONE | 3 | PR title/body synchronized; exactly 3 expected net files at close |
| Production validation-worker repair | P0 | VALIDATED | inherited | Existing workflow matrix PASS on `d92b958...` |
| Dense typography/controls | P1 | IN_PROGRESS | 4 | Before-state recorded; production edit next |
| Dynamic X/Y spreadsheet viewport | P1 | IN_PROGRESS | 4 | ISS-002 accepted; production edit next |
| Sticky header/frozen context | P1 | IN_PROGRESS | 4 | Column metadata already marks Tag/Type frozen |
| Inline cell editing foundation | P1 | NOT_STARTED | 5 | Capability authority identified |
| PIPE length direct cell | P1 | NOT_STARTED | 5 | Capability returns `AVAILABLE` / `PIPE_LENGTH` |
| VALVE/TEE cell integration | P2 | NOT_STARTED | 6 | Capability returns `NEEDS_INPUT`; existing compound editors required |
| Virtualization/scaling | P2 | NOT_STARTED | 7 | Current renderer hard-caps 300 rows |
| Broader edit authority | P2 | DEFERRED | 7/future | Only bounded additions with explicit governed operations |
| Final reconciliation/validation | P0 | NOT_STARTED | 8 | Pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | Defect | HIGH | VALIDATED | Production validation worker bundling/load failure. | Yes |
| ISS-002 | Defect | MEDIUM | IN_PROGRESS | Fixed inner max-height/nested overflow hides or strands table content. | Yes |
| IMP-001 | Improvement | P1 | IN_PROGRESS | Reduce typography/control density. | Yes |
| IMP-002 | Improvement | P1 | ACCEPTED | Direct spreadsheet cells for explicitly governed fields. | Yes |
| IMP-003 | Improvement | P1 | ACCEPTED | Keyboard navigation and staged/error/stale cell states. | Yes |
| IMP-004 | Improvement | P2 | ACCEPTED | Replace hard 300-row cap with windowed rendering after interaction semantics stabilize. | Yes |
| IMP-005 | Improvement | P2 | DEFERRED | Broad XYZ/catalogue/fitting/support editing needs explicit governed operations. | Bounded subset only |
| RISK-001 | Risk | HIGH | ACCEPTED | Spreadsheet drafts could become a second model authority. | Yes |
| RISK-002 | Risk | HIGH | ACCEPTED | No local checkout/gh limits local executable validation. | Yes |
| RISK-003 | Risk | MEDIUM | ACCEPTED | Whole-grid rerender can destroy focus/caret/uncommitted draft. | Yes |
| DEC-001 | Decision | HIGH | ACCEPTED | Cell editing stages governed intents; Apply remains mutation boundary. | Yes |
| DEC-002 | Decision | HIGH | ACCEPTED | Capability authority controls cell editability; no fake free-text editing. | Yes |
| DEC-003 | Decision | MEDIUM | ACCEPTED | Layout/density precedes edit semantics. | Yes |
| DEC-004 | Decision | MEDIUM | ACCEPTED | Owner-authorized assignment stays on PR #1020. | Yes |
| QST-001 | Question | MEDIUM | DONE | Direct scalar availability resolved: PIPE length only; valve/TEE need compound input; others blocked/unrepresentable. | Yes |
| DEBT-001 | Debt | LOW | ACCEPTED | Two inherited worker commits predate protocol adoption. | Yes |

### ISS-001 — production validation-worker load failure
**Status:** VALIDATED. **Affected:** validation-worker client/test. **Observed:** first-pipe Preview worked but production Validate emitted generic worker failure. **Root cause:** Vite worker URL was not statically nested in `new Worker(new URL(...))`. **Resolution:** static production Worker form, explicit injected test configuration retained. **Alternative rejected:** main-thread fallback. **Closure evidence:** all existing triggered workflows passed on `d92b958...`, including `main-gate`, table slices, render/interaction/tool-audit/reachability.

### ISS-002 — constrained table viewport
**Status:** IN_PROGRESS, Stage 4. **Affected:** `topology-edit-table-styles.js`, potentially grid markup for sticky attributes. **Observed:** `.topology-edit-table__scroll` capped to `min(48vh,470px)` inside independently scrolling window body. **Consequence:** resizing does not proportionally expose the grid; wide/long content feels hidden. **Root cause:** competing overflow owners plus fixed inner cap. **Chosen resolution:** window body/table/grid become min-height-aware; the spreadsheet viewport owns automatic X/Y scrolling and consumes remaining space. **Alternative rejected:** merely increasing fixed max-height. **Edge cases:** collapsed window, narrow viewport, empty model, all-properties sections. **Validation:** source check plus existing table browser workflows; inspect geometry/scroll evidence where available.

### QST-001 — direct editable columns
**Status:** DONE in Stage 3/4 investigation. **Evidence:** `topology-edit-table-edit-capability.js` maps only `PIPE_LENGTH` to direct `AVAILABLE`; valve replacement and TEE reconfiguration return `NEEDS_INPUT`; unsupported, derived and support mutations fail closed. **Consequence:** Stage 5 can use existing capability receipts as the single UI editability policy.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary Output | Commit |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization/findings | Pre-implementation report | `c908e7c...` |
| 2 | COMPLETE | PR allocation/report synchronization | Sole PR-numbered report | `d92b958...` |
| 3 | COMPLETE | Changed-file verification/documentation | PR metadata + exact 3-file reconciliation | `3984e470...` metadata state |
| 4 | IN_PROGRESS | Dense dynamic spreadsheet shell | Compact CSS, available-space scroll, sticky/frozen context | pending |
| 5 | NOT_STARTED | Inline edit foundation | Active/edit cell state, PIPE length direct cell, keyboard commit/cancel | pending |
| 6 | NOT_STARTED | Compound editor integration | Existing VALVE/TEE authority surfaced from grid | pending |
| 7 | NOT_STARTED | Bounded expansion/scaling | Virtualization; production-backed extra edits only | pending |
| 8 | NOT_STARTED | Final validation/reconciliation/closure | Final HEAD evidence/closure | pending |

## 5. Stage Execution Log

### Stage 1 — Report initialization and technical findings
**Before:** PR #1020 already had two worker-fix files. **Objective:** create mandated report before spreadsheet production edits. **Scope:** pending report + inspection. **Implementation:** created `agents/PR_PENDING_workreport.md`. **Validation:** PR metadata/file list/report presence PASS. **Issues:** ISS-002, IMP-001..005, RISK-001..003, DEC-001..003, QST-001, DEBT-001. **Decision:** COMPLETE at `c908e7c...`. **Handover delta:** durable invariants/roadmap established.

### Stage 2 — PR allocation and report synchronization
**Before:** pending report existed; PR #1020 already allocated. **Objective:** one canonical PR-numbered report. **Scope:** report paths only. **Implementation:** created `agents/PR1020_workreport.md`, deleted pending path. **Changed files:** numbered report retained; pending report has no net diff. **Validation:** numbered fetch PASS, pending 404 PASS, current 3-file list PASS, all triggered workflows on `d92b958...` PASS. **Decision:** COMPLETE. **Handover delta:** one report; baseline green evidence.

### Stage 3 — Changed-file verification and documentation-stage completion
**Before:** net diff exactly report + inherited worker client/test; PR body worker-only. **Objective:** make PR scope truthful before new production work. **Scope:** report + PR metadata only. **Engineering rationale:** avoid apparent scope drift and preserve single-PR authorization. **Planned:** update title/body, re-list files, confirm no workflow changes. **Implementation:** PR title changed to `feat(3d-edit): spreadsheet Engineering Table and production validation worker`; body now records combined mission, workreport path, invariants, scope control, no-new-workflows rule and exact-head validation policy. **Changed files:** report only; PR metadata is not repository content. **Deviations:** none. **Validation:** PR fetch PASS (open/draft/mergeable, new title/body); changed-file list PASS (same 3 files); no `.github/workflows/*` in diff PASS. **Issues discovered:** QST-001 resolved by existing capability authority. **Risks remaining:** RISK-001/002/003. **Decision:** COMPLETE. **Handover delta:** PR metadata now matches authorized mission; Stage 4 may start.

### Stage 4 — Dense dynamic spreadsheet shell

#### Before stage
Current table styles use `.78rem` base text, ~1.8rem inputs, ~2rem buttons, `.3rem .45rem` table cells, a body with `overflow:auto`, and an inner grid viewport with `max-height:min(48vh,470px); overflow:auto`. The window itself is already resizable and open-state layout is a two-row grid. Table markup has sticky `<thead>` but no explicit frozen-column attributes. Tag and Type descriptors are declared `frozen` in the column model.

#### Objective
Make the Engineering Table materially denser and ensure the data grid dynamically consumes available window space with automatic horizontal/vertical scrolling, while keeping header/context reachable and without changing engineering mutation semantics.

#### Scope
Expected production files:
- `src/workspace/viewport-productivity/topology-edit-table-styles.js`
- `src/workspace/viewport-productivity/topology-edit-table-grid-view.js` only if stable data attributes are required to freeze descriptor-marked columns.
Expected validation/tests:
- existing `e2e/topology-edit-table-authority.spec.js` / table slice workflows;
- focused source/DOM assertions if an existing test can be extended without broad fixture churn.
No runtime/intent/workflow mutation in this stage.

#### Engineering rationale
Fixing layout independently separates reachability/density regressions from later editing/state-machine changes. One intentional spreadsheet overflow owner avoids nested-scroll ambiguity and lets user resizing control how much data is visible.

#### Planned implementation
1. Make table window/body/inner table min-height-aware so the table component can fill remaining height.
2. Change outer body from general scrolling to clipped/min-height layout; make the table grid container the intentional X/Y overflow region.
3. Remove fixed `48vh/470px` grid cap; use flexible `minmax(0,1fr)` allocation.
4. Reduce base font, cell padding and control heights while preserving readable labels/status text.
5. Keep `<thead>` sticky.
6. Surface descriptor `frozen` metadata as data attributes/classes and freeze Select/Tag/Type columns with deterministic sticky left offsets if markup change is required.
7. Keep empty-model first-pipe form scrollable/reachable within the same window without changing its authoring semantics.

#### Expected examples
- Widening the floating window reveals more columns before horizontal scroll is needed.
- Increasing window height gives the grid more rows instead of leaving it capped at 470px.
- Narrowing/shrinking automatically produces the necessary scrollbars.
- Header remains visible during vertical scroll; Select/Tag/Type remain visible during horizontal scroll if frozen treatment is implemented.

#### Edge cases
Collapsed `<details>` window; mobile media queries; long canonical IDs/port labels; all-properties sections below the grid; empty-model first-pipe form; browser scrollbar thickness; sticky z-index overlap.

#### Planned validation
- Inspect exact diff for layout-only scope.
- Verify no runtime/intent/workflow files changed.
- Run/observe existing table slice and `main-gate` workflows on resulting HEAD.
- Where tests expose computed layout, assert scroll container has overflow capacity and sticky/frozen attributes exist.

#### Known risks
CSS grid sizing can fail if any ancestor lacks `min-height:0`; sticky left offsets can overlap if widths are not deterministic; clipping the outer body could hide below-grid editor sections unless the table component itself allocates its lower content intentionally.

#### Implementation performed
NOT_STARTED — this before-stage record authorizes the next production edit.

#### Stage decision
IN_PROGRESS.

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `src/workspace/topology-edit/professional/topology-edit-validation-worker-client.js` | inherited | inherited | Production Worker bundling/load repair | Yes | baseline workflows PASS; final HEAD rerun required |
| `tests/topology-edit-professional-validation-worker-client.test.mjs` | inherited | inherited | Worker regression coverage | No | baseline workflows PASS; final HEAD rerun required |
| `agents/PR_PENDING_workreport.md` | 1 | 2 | Temporary protocol bootstrap; created then deleted | No | no net PR diff; explained |
| `agents/PR1020_workreport.md` | 2 | 4 | Living report | No | present/current |

Stage 4 production files are not added to this ledger until actually changed.

## 7. Engineering Decisions and Invariants

### DEC-001 — governed staging, explicit Apply
**Must remain true:** cell interaction never mutates canonical topology directly. **Enforced:** table intent/batch/workflow/certified session. **Validation:** Stage 5 canonical-hash lifecycle; current table authority tests. **PR effect:** none in Stage 4.

### DEC-002 — capability-driven editability
**Must remain true:** direct/compound/read-only state is derived from existing capability receipts, not CSS/DOM guesses. `AVAILABLE` can be direct, `NEEDS_INPUT` opens governed compound input, `BLOCKED`/`UNREPRESENTABLE` is not editable. **Enforced:** `topology-edit-table-edit-capability.js` + column descriptors. **Validation:** Stage 5/6 tests.

### DEC-003 — layout before semantics
**Must remain true:** Stage 4 modifies presentation/layout only. **Enforced:** changed-file scope. **Validation:** diff reconciliation.

### DEC-004 — single PR stacking
All authorized work stays on PR #1020; PR remains draft until final closure.

## 8. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| PR metadata synchronized | PASS | `3984e470...` | combined mission title/body; draft/mergeable |
| Changed files vs ledger | PASS | `3984e470...` | exactly report + inherited worker client/test |
| No workflow changes | PASS | `3984e470...` | no `.github/workflows/*` in PR diff |
| Baseline `main-gate` | PASS | `d92b958...` | run 279 |
| Baseline Table Slice 6 / 8 | PASS | `d92b958...` | runs 208 / 114 |
| Baseline render/interaction/tool audit/reachability | PASS | `d92b958...` | triggered workflows successful |
| Stage 4 layout validation | NOT_RUN | current | implementation next |
| Spreadsheet direct-edit validation | NOT_RUN | current | Stage 5+ |
| Final-head applicable validation | NOT_RUN | current | Stage 8 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Worker production path qualified at baseline | PASS | existing workflow matrix on `d92b958...` |
| Direct scalar authority identified | PASS | capability module: PIPE length only |
| Dynamic X/Y scrolling | NOT_RUN | Stage 4 |
| Sticky/frozen context | NOT_RUN | Stage 4 |
| Canonical unchanged before spreadsheet Apply | NOT_RUN | Stage 5 |
| Focus/caret safe | NOT_RUN | Stage 5 |
| Stale revision safe | NOT_RUN | Stage 5+ |
| Atomic spreadsheet undo/redo | NOT_RUN | Stage 5+ |

### Explicitly not validated
No claim yet that Stage 4 layout works; no spreadsheet editing exists yet; no broad XYZ/catalogue/support edit authority is assumed.

## 9. Known Issues, Improvements, and Deferred Scope

- **Open defects:** ISS-002 (active Stage 4).
- **Deferred improvements:** IMP-005 broad authority; IMP-004 waits until edit semantics stabilize.
- **Open risks:** RISK-001/002/003.
- **Open questions:** none currently; QST-001 resolved.
- **Accepted debt:** DEBT-001.

## 10. Recommended Forward Sequence

1. Complete Stage 4 layout-only slice to resolve ISS-002/IMP-001 before editing semantics.
2. Stage 5 use existing capability authority and existing `PIPE_LENGTH` intent for direct cell editing; this is prerequisite evidence against RISK-001/003.
3. Stage 6 route `NEEDS_INPUT` valve/TEE capabilities to their existing compound editors; do not flatten them into free text.
4. Stage 7 add vertical virtualization only after active-cell semantics are stable; add extra engineering edits only with explicit production-consumed authority.
5. Stage 8 reconcile final files, rerun applicable existing checks at exact final HEAD, disposition every item, refresh PR body/report, and leave ready-for-review decision to Owner.

## 11. Next-Agent Handover

- **Current stopping point:** Stage 4 before first production edit.
- **Exact current state:** Stage 1-3 complete; PR metadata truthful; net diff before Stage 4 production code is report + two inherited worker files; QST-001 resolved.
- **PR / branch / HEAD:** #1020 / `agent/fix-topology-validation-worker-production` / `3984e470409eb47c0da107ab1928b2578fc562ba` before this report commit.
- **Last completed stage:** Stage 3.
- **Current active stage:** Stage 4; no production layout change has been made yet.
- **Start here:** `src/workspace/viewport-productivity/topology-edit-table-styles.js`. Remove fixed inner height, establish one spreadsheet overflow owner, reduce density. Inspect `topology-edit-table-grid-view.js` only for frozen-column metadata; do not touch runtime/intents/workflow in Stage 4.
- **Do not redo:** worker investigation, report bootstrap, PR metadata reconciliation, direct-editability investigation.
- **Do not assume:** all columns editable; later commits inherit baseline CI; outer overflow can be clipped without checking lower panels.
- **Files currently involved:** report; inherited worker files; next production file is table styles.
- **Known failing checks:** None known at baseline.
- **Validation still required:** Stage 4 exact diff + table/main-gate checks; all Stage 5+ editing evidence; final HEAD rerun.
- **Open engineering questions:** None.
- **Deferred improvements:** IMP-004, IMP-005.
- **Highest-risk remaining item:** RISK-001 for later editing; Stage-4-specific risk is hiding below-grid panels through incorrect flex/grid sizing.
- **Exact next recommended action:** edit table styles only, then inspect diff before adding any grid markup change.
- **Required reading:** this report §§0,2,3,4,7,8,11; `topology-edit-table-styles.js`; `topology-edit-table-grid-view.js`; `topology-edit-table-productivity-adapter.js`; `topology-edit-table-edit-capability.js`.

## 12. Process Notes / Lessons Learned

- Spreadsheet interaction does not imply spreadsheet authority; capability receipts already encode the safe edit boundary.
- Fixed nested scrolling can make a resizable panel feel clipped even with `overflow:auto`; available-space ownership must be explicit through every `min-height:0` ancestor.
- Existing `frozen`, `readOnly`, `valueType`, and `editor` metadata should drive UI policy rather than duplicated renderer rules.
- Green CI is exact-HEAD evidence only.

## 13. PR Closure Record

| Closure Criterion | Result |
|---|---|
| Mission completed | NO |
| In-scope items dispositioned | NO |
| Engineering Item Register synchronized | YES current stage |
| Changed files reconciled | YES through Stage 3; repeat after Stage 4/final |
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
Stage 4 onward incomplete.

### Recommended next PR
None for this assignment; Owner authorized all work on PR #1020.

### Final HEAD
Not final.