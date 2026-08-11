# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This file is the single source of truth for current PR state, engineering findings, decisions, validation evidence, deferred improvements, and next-agent handover. Current-state sections are rewritten as work progresses; Stage Execution Log and Process Notes preserve history.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Mission | Correct LFEA workbench engineering-data integrity defects from #1018 without solver-numeric or CI-workflow changes |
| Source issue | #1018 |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Current HEAD | Stage 4 production commit `365c9f3`; this report opens Stage 5 |
| PR state | Draft |
| Current stage | Stage 5 — preserve package/record drafts across renders |
| Last completed stage | Stage 4 |
| Engineering status | ISS-001 implemented; draft-lifecycle implementation next |
| Validation status | S4 source verification PASS; behavioural draft validation pending |
| Current blocker | None |
| Exact next action | Add view-owned draft capture/restore keyed to committed model identity, without touching store/solver authority |

### Handover in 60 seconds

**Now true:** PR/bootstrap is clean; collection-context whole-package mock controls are removed; toolbar whole-package mock remains. `ISS-002` and newly recorded sibling `ISS-004` share one root cause: content replacement recreates record/package textareas from committed state.

**Current work:** Stage 5 will capture drafts before content replacement, preserve them while `(modelVersion, semanticHash)` is unchanged, preserve record drafts per collection/selection context, and clear all stale drafts when committed model identity changes.

**Unfinished:** Stage 5 draft persistence; Stage 6 delete sequencing; Stage 7 regression checks; Stage 8 final reconciliation.

**Do not assume:** render lifetime equals draft lifetime; draft data is solver authority; continuum von Mises equals piping-code stress.

**Highest-risk remaining item:** Stage 5 model-identity invalidation. A draft must survive progress/display/selection renders but must not survive a committed model replacement/edit/undo/redo as stale text.

**Next action:** implement Stage 5 only in `src/workspace/lfea-workbench-view.js`, then source-check the lifecycle before Stage 6.

## 1. Mission and Engineering Intent

Prevent destructive-scope mismatch and silent loss/inconsistency of uncommitted engineering edits while preserving existing import validation, resealing, semantic hashes, model-version lineage, solver execution, and run cancellation.

Governing principles:
- External packages remain validated, not repaired.
- Preview/draft state never becomes solve authority.
- Destructive UI matches actual scope.
- Render is not implicit discard.
- Committed model identity change invalidates stale drafts.
- No `.github/workflows/*` changes.

Non-goals: solver numerics/formulations, hash algorithms, full LFEA redesign, code-stress implementation, cross-run colour normalization, new CI gates.

## 2. Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living PR report | High | DONE | S1 | `07829ac` |
| PR allocation/report sync | High | DONE | S2 | PR #1021 |
| Changed-file baseline | High | DONE | S3 | report-only baseline |
| Remove collection mock actions | Critical | IMPLEMENTED | S4 | `365c9f3` |
| Preserve record drafts | High | IN_PROGRESS | S5 | ISS-002 |
| Preserve package draft | High | IN_PROGRESS | S5 | ISS-004 |
| Correct delete sequencing | Medium | ACCEPTED | S6 | ISS-003 |
| Regression validation | High | NOT_STARTED | S7 | — |
| Final audit/handover | High | NOT_STARTED | S8 | — |

## 3. Engineering Item Register

| ID | Type | Sev./priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | Critical | IMPLEMENTED | Collection-context Mock Package actions replaced whole package | Yes |
| ISS-002 | Defect | High | IN_PROGRESS | Render can destroy unsaved record-editor text | Yes |
| ISS-003 | Defect | Medium | ACCEPTED | Delete selection clears after synchronous mutation/render | Yes |
| ISS-004 | Defect | High | IN_PROGRESS | Render can destroy unsaved package-editor text | Yes |
| IMP-001 | Improvement | High | DEFERRED | Cross-run plots need shared engineering colour authority | No |
| IMP-002 | Improvement | High | DEFERRED | Upstream pre-FEA/linear-piping surfaces need dedicated audit | No |
| RISK-001 | Engineering risk | High | OPEN | Continuum von Mises may be mistaken for piping-code stress | No |
| RISK-002 | Engineering risk | High | OPEN | Support reaction sign convention may be overlooked downstream | No |
| QST-001 | Engineering question | Medium | OPEN | Authoritative fallback axis for vertical-pipe support triad degeneracy | No |
| DEC-001 | Decision | — | ACTIVE | Remove collection mock actions instead of relabelling | Yes |
| DEC-002 | Decision | — | ACTIVE | No new CI workflow gates | Yes |
| DEC-003 | Decision | — | ACTIVE | View-owned drafts; invalidate by committed model identity | Yes |

### ISS-001
**Resolution:** removed both records-card mock controls. Empty records card now only states no package is loaded; loaded records card contains selector/table/editor/actions without collection mock. Toolbar `[SIMULATED] Load Mock Data` remains in `renderLfeaToolbar()` with role `lfea-mock` and `handlers.onMock`.

**Closure status:** implemented; final regression/source guard pending S7.

### ISS-002 / ISS-004
**Root cause:** `render()` replaces `slots.content`; both package and record textareas are reconstructed from committed package data.

**Stage 5 resolution design:**
1. capture current textarea values before content replacement;
2. retain one package draft plus record drafts keyed by collection/selected index;
3. compute committed model identity from `state.modelVersion` plus package `semanticHash`;
4. preserve drafts when identity is unchanged (worker progress, display mode, row/collection navigation);
5. clear drafts when identity changes (successful add/update/delete/apply, import/mock, undo/redo);
6. never pass draft state into model/solver functions except existing explicit Apply/Add/Update user actions.

### ISS-003
Delete must make selection safe before synchronous mutation; failure handling will be considered so a rejected delete can restore the prior selection/draft.

### Deferred engineering items
IMP-001 shared comparison range; IMP-002 upstream LFEA surface audit; RISK-001 result authority; RISK-002 reaction sign convention visibility.

## 4. Stage Roadmap

| Stage | Status | Purpose | Output | Commit |
|---|---|---|---|---|
| S1 | DONE | Initialize report/findings | register/handover | `07829ac` |
| S2 | DONE | Allocate PR/sync report | permanent report | `ee8a7ea`, `6335c68` |
| S3 | DONE | Verify documentation baseline | report-only diff | `5c0a947` report record |
| S4 | DONE | Remove misleading collection mocks | ISS-001 | `365c9f3` |
| S5 | IN_PROGRESS | Persist package/record drafts | ISS-002/004 | — |
| S6 | NOT_STARTED | Fix delete selection sequencing | ISS-003 | — |
| S7 | NOT_STARTED | Regression qualification | existing check + targeted guards | — |
| S8 | NOT_STARTED | Final reconcile/handover | closure record | — |

## 5. Stage Execution Log

### Stage 1 — Report initialization and technical findings
**Status:** COMPLETE. Created `PR_PENDING`; verified main `751756e9`; no production/workflow changes; durable IDs established.

### Stage 2 — PR allocation and report synchronization
**Status:** COMPLETE. Created draft PR #1021, permanent `agents/PR1021_workreport.md`, removed temporary path.

### Stage 3 — Changed-file verification and documentation-stage completion
**Status:** COMPLETE. GitHub changed-file list returned exactly `agents/PR1021_workreport.md`. Source review additionally found `ISS-004`, the package-editor sibling of N01.

### Stage 4 — Correct collection mock behaviour
**Status:** COMPLETE.

**Before:** `recordEditor()` exposed `[SIMULATED] Load Collection Mock Data` when empty and `[SIMULATED] Reload Mock for <collection>` when loaded; both used global `handlers.onMock`.

**Objective:** eliminate local/global destructive-scope mismatch without inventing collection-mock semantics.

**Scope:** `src/workspace/lfea-workbench-view.js` only plus report.

**Implementation:** removed both collection-context controls; empty state now only displays the no-package message; loaded state appends selector/table/textarea/actions only.

**Changed files:** `src/workspace/lfea-workbench-view.js` (`365c9f3`).

**Validation performed:** fetched branch source after commit and confirmed no collection mock construction/append remains in `recordEditor()`. Separately verified `renderLfeaToolbar()` still constructs role `lfea-mock` using `handlers.onMock`. No controller/store/solver/hash file changed.

**Stage decision:** COMPLETE (implementation). S7 will add durable regression guard.

**Handover delta:** whole-package mock is now exposed only at toolbar/global scope; draft-loss defects remain.

### Stage 5 — Preserve package and record drafts across renders
**Status:** IN_PROGRESS.

**Before:** package and record textarea values live only in DOM; content replacement reconstructs them from committed state. Row/collection callbacks also call `render(state)`.

**Objective:** retain uncommitted package/record text across non-model renders/navigation while invalidating stale drafts on committed model identity change.

**Scope:** `src/workspace/lfea-workbench-view.js` only for production code; report before/after. No store/controller/solver changes planned.

**Engineering rationale:** Drafts are UI authoring state. View ownership keeps them outside governed package/solver state, while `(modelVersion, semanticHash)` provides a deterministic invalidation boundary after committed mutations.

**Planned implementation:** add `documentDraft`, `recordDrafts`, and last model identity to the view; capture DOM drafts before replacement; tag record textarea with stable collection/index draft key; restore matching drafts; clear on model-identity change; clear on destroy.

**Examples/edge cases:** worker progress preserves both drafts; switching row/collection and returning restores prior record draft; successful commit/import/undo/redo clears stale drafts; failed edit with unchanged model identity retains text.

**Validation planned:** inspect resulting branch source; add S7 source guard to existing `lfea-p0-ui-containment-check.mjs`; do not add workflow.

**Risk:** stale draft surviving a real model change, or model change being falsely inferred from display-only state. Mitigation: identity uses modelVersion + semanticHash, both unchanged by display/progress updates.

## 6. Changed-File Ledger

| File | First stage | Latest stage | Purpose | Eng-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR1021_workreport.md` | S2 | current | PR SSOT/handover | No | continuous |
| `src/workspace/lfea-workbench-view.js` | S4 | current | mock scope/draft lifecycle/delete sequencing | Yes | S4 verified; S5/S6 pending |
| `scripts/lfea-p0-ui-containment-check.mjs` | S7 planned | S7 | durable source regression guard | No production | pending |

## 7. Engineering Decisions and Invariants

**DEC-001:** remove collection-global mock entrypoints, retain toolbar global mock.

**DEC-002:** no new CI workflows.

**DEC-003:** drafts stay view-owned and are invalidated by committed model identity, not by generic render.

**INV-001:** external package identity still validated, not repaired.

**INV-002:** preview/draft state is not solver authority.

**INV-003:** render is not implicit discard.

**INV-004:** model-changing operations invalidate incompatible execution and, after S5, stale editor drafts.

## 8. Validation and Evidence Ledger

### Software
| Validation | Status | Evidence |
|---|---|---|
| Bootstrap changed-file baseline | PASS | report only before coding |
| S4 collection mock source verification | PASS | branch `lfea-workbench-view.js` |
| Toolbar global mock retained | PASS | `lfea-workbench-panels.js` |
| S5 draft source verification | PENDING | — |
| S6 delete source verification | PENDING | — |
| Existing `check:lfea-workbench` guard extension | PENDING S7 | no workflow added |

### Engineering
| Property | Status |
|---|---|
| External package/hash authority unchanged | PASS-by-scope; store/model untouched |
| Execution lineage unchanged | PASS-by-scope; run store/controller untouched |
| Collection destructive scope | IMPLEMENTED, final guard pending |
| Draft survives unrelated render | PENDING S5 |
| Draft invalidates on committed model change | PENDING S5 |
| Delete selection coherent | PENDING S6 |

## 9. Known / Deferred Work

Current PR: ISS-002, ISS-003, ISS-004; ISS-001 implemented.

Deferred: IMP-001 comparison colour authority; IMP-002 upstream surface audit; RISK-001 result authority; RISK-002 support reaction sign convention; QST-001 vertical support-axis authority.

## 10. Recommended Forward Sequence

S5 shared draft lifecycle → S6 delete sequencing → S7 existing-check/source regression evidence → S8 final changed-file/register/handover reconciliation.

Future PRs: three-surface LFEA audit; restraint/support semantics; result-authority labelling; run comparison; CAESAR/reference correlation.

## 11. Next-Agent Handover

**Stopping point:** Stage 5 pre-change design is recorded; S4 commit is `365c9f3`.

**Start here:** modify `LfeaWorkbenchView` constructor/render/documentEditor/recordEditor/destroy only. Capture drafts before `slots.content.replaceChildren`; clear them only when committed identity changes. Do not touch model/store/solver.

**Do not redo:** C01/N01/N02 verification, PR bootstrap, S4 removal.

**Known failing checks:** none known; runtime checks not yet executed in this connector-only environment.

**Highest-risk item:** stale draft invalidation semantics.

**Exact next action:** implement the model-identity-aware draft lifecycle, fetch/inspect branch source, update this report, then open S6.

## 12. Process Notes / Lessons Learned

PN-001: synchronous store mutation can render before the following handler statement.

PN-002: credible findings are registered even if deferred.

PN-003: sibling editor surfaces must be checked for the same lifecycle defect; N01 led to ISS-004.

## 13. PR Closure Record

| Criterion | Result |
|---|---|
| Mission completed | PENDING |
| In-scope items dispositioned | PENDING |
| Register synchronized | YES |
| Changed files reconciled | pre-production PASS; final pending |
| Final-HEAD validation | PENDING |
| Deferred improvements recorded | YES |
| Handover current | YES |
| New CI workflows added | NO |
| Final HEAD | PENDING |
