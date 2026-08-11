# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This is the single source of truth for current PR state, engineering findings, decisions, validation evidence, deferred improvements, and next-agent handover. Current-state sections are rewritten as work progresses; stage history remains durable.

> Stage 8 was the closure checkpoint for the initial integrity slice. The Owner then explicitly authorized continuation on the same PR; Stage 9 onward is stacked on that PR rather than opened separately.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Mission | Resolve the highest-value verified LFEA workbench defects from #1018 without solver-numeric or CI-workflow changes |
| Source issue | #1018 |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Continuation baseline | `b9b18d53f3ad146aadc354a0d977c23078f397db` |
| PR state | Draft |
| Current stage | Stage 10 — structured failure guidance and diagnostic-code preservation |
| Last completed stage | Stage 9 — no-Worker run feedback and execution-option parity |
| Engineering status | C02 + no-Worker option parity implemented and guarded; C03 grounded before implementation |
| Validation status | Source/patch guards updated; full repository/browser execution still NOT_RUN in this sandbox |
| Current blocker | None |
| Exact next action | Preserve incoming diagnostic codes in `reportEditError`, replace substring-driven failure banner logic with code-driven presentation, then extend the existing containment check |

### Handover in 60 seconds

**What is now true**
- Collection-context whole-package mock controls are removed; only the explicit toolbar whole-package mock remains.
- Package/record drafts survive benign renders and are invalidated on committed model identity change.
- Delete clears selection before synchronous mutation and restores context only on identity-preserving failure.
- No-Worker Run now publishes `RUNNING/QUEUED`, yields a real browser frame/task opportunity, and only then executes the captured active run identity.
- A cancelled/stale deferred no-Worker callback cannot execute or hijack a replacement run.
- No-Worker execution receives current `controller.pipelineOptions`, eliminating construction-time convergence/review-option drift relative to the Worker path.
- No-Worker Cancel now works during the queued/yield interval. Main-thread computation remains non-preemptible once it starts.
- Existing `scripts/lfea-p0-ui-containment-check.mjs` guards the Stage 9 ordering, current-options handoff, queued cancellation, and stale-identity behavior.

**Currently being worked on**
- C03: replace raw/substr-derived failure messaging with structured code-driven recovery guidance.
- New prerequisite `ISS-008`: `reportEditError()` wraps an error in a fresh `TypeError` and can discard the original `error.code`, weakening structured guidance.

**Still unresolved**
- C04 evidence-export exception containment.
- H01–H03 and remaining audit findings.
- Full repository/browser validation remains NOT_RUN in this environment.

**Do not assume**
- `queueMicrotask()` is a browser paint boundary; Stage 9 deliberately uses frame/task scheduling.
- No-Worker cancel can interrupt an already-running CPU-bound solve.
- All validation failures use broad `LFEA_*` codes: mesh-package validation often preserves specific codes such as `STALE_PACKAGE_SEMANTIC_HASH`, `NONFINITE_VALUE`, `MISSING_FIELD`, or `UNSUPPORTED_*`.

**Exact next action**
- Implement Stage 10 only after this pre-stage report update.

## 1. Mission and Engineering Intent

### Mission
Continue #1018 remediation on one draft PR while preserving engineering-state authority, run identity, diagnostic provenance, and truthful user guidance.

### Governing principles
- Imported package authority remains fail-closed; stale hashes are not repaired on import.
- Draft/preview UI state is not solver authority.
- Run completion/failure is accepted only for the exact active run identity.
- Worker and no-Worker paths consume equivalent current analysis options.
- User-facing recovery guidance is driven by structured diagnostic codes, not raw message substring guesses.
- Original technical diagnostic detail/code remains available for engineering traceability.
- No `.github/workflows/*` changes.
- Validation claims explicitly distinguish executed, source-inspected, and NOT_RUN evidence.

## 2. Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living PR report | High | DONE / ACTIVE | S1–current | this file |
| Collection mock scope | Critical | IMPLEMENTED + GUARDED | S4/S7 | source guard |
| Package/record draft persistence | High | IMPLEMENTED + GUARDED | S5/S7 | source guard |
| Delete sequencing | Medium | IMPLEMENTED + GUARDED | S6/S7 | source guard |
| C02 no-Worker feedback | Critical | IMPLEMENTED + GUARDED | S9 | controller/run-store + containment guard |
| No-Worker current options parity | High | IMPLEMENTED + GUARDED | S9 | ISS-007 |
| C03 structured failure guidance | Critical | IN_PROGRESS | S10 | #1018 + source grounding |
| Preserve wrapped diagnostic code | High | ACCEPTED | S10 | ISS-008 |
| C04 evidence-export error surfacing | Critical | NOT_STARTED | S11 | #1018 |
| H01/H02/H03 usability/authority | High | NOT_STARTED | later | #1018 |
| Runtime/browser validation | High | NOT_RUN | ongoing | environment limitation |

## 3. Engineering Item Register

| ID | Type | Sev./priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | Critical | IMPLEMENTED + GUARDED | Collection-context Mock Package actions replaced whole package | Yes |
| ISS-002 | Defect | High | IMPLEMENTED + GUARDED | Render destroyed unsaved record-editor text | Yes |
| ISS-003 | Defect | Medium | IMPLEMENTED + GUARDED | Delete selection cleared after synchronous mutation/render | Yes |
| ISS-004 | Defect | High | IMPLEMENTED + GUARDED | Render destroyed unsaved package-editor text | Yes |
| ISS-005 | Quality defect | Low | RESOLVED | Connector replacement removed trailing newlines | Yes |
| ISS-006 | Defect / C02 | Critical | IMPLEMENTED + GUARDED | No-Worker run lacked a paintable RUNNING boundary | Yes |
| ISS-007 | Defect | High | IMPLEMENTED + GUARDED | No-Worker execution used stale construction-time pipeline options | Yes |
| ISS-008 | Defect | High | ACCEPTED | `reportEditError` can discard an incoming structured `error.code` | Yes |
| IMP-001 | Improvement | High | DEFERRED | Cross-run plots need shared engineering colour authority | No |
| IMP-002 | Improvement | High | DEFERRED | Upstream pre-FEA/linear-piping LFEA surfaces need dedicated audit | No |
| RISK-001 | Engineering risk | High | OPEN | Continuum von Mises may be mistaken for piping-code stress | No |
| RISK-002 | Engineering risk | High | OPEN | Support reaction sign convention may be overlooked downstream | No |
| QST-001 | Engineering question | Medium | OPEN | Authoritative fallback axis for vertical-pipe support triad degeneracy | No |
| DEC-001 | Decision | — | ACTIVE | Remove collection mock actions instead of relabelling | Yes |
| DEC-002 | Decision | — | ACTIVE | No new CI workflow gates | Yes |
| DEC-003 | Decision | — | ACTIVE | View-owned drafts invalidated by committed model identity | Yes |
| DEC-004 | Decision | — | ACTIVE | Delete clears selection before mutation; failed delete restores by identity | Yes |
| DEC-005 | Decision | — | ACTIVE | No-Worker fallback begins run, yields a real frame/task boundary, then executes captured identity | Yes |
| DEC-006 | Decision | — | ACTIVE | Synchronous active-run executor accepts explicit current pipeline options and no-ops on stale/cancelled identity | Yes |
| DEC-007 | Decision | — | PROPOSED | Failure UI uses diagnostic-code families for primary guidance while retaining raw code/detail for traceability | Yes |

### ISS-006 / ISS-007 — Stage 9 outcome
`LfeaWorkbenchController.run()` now begins a no-Worker run, captures identity, awaits `yieldRunFeedbackFrame()`, and calls `store.executeActiveRun(identity, this.pipelineOptions)`. `executeActiveRun` verifies that identity is still the active run before executing. No-Worker `cancelRun()` delegates to store cancellation during the queued interval. Standalone `store.run()` remains synchronous but delegates through the same identity-safe executor.

**Limitation:** once synchronous CPU execution starts on the main thread it cannot process UI cancellation until it returns. This PR does not claim otherwise.

### ISS-008 — diagnostic code lost during report wrapping
`reportEditError(path,index,error)` currently creates a fresh `TypeError` with location-prefixed text and passes it to `editFailureState`. Unless code is copied onto that wrapper, `failedState` falls back to `LFEA_RECORD_EDIT_REJECTED` even when the incoming error had a more specific engineering/contract code.

**Engineering consequence:** code-driven recovery guidance can lose the most useful classification at the UI boundary.

**Planned resolution:** retain the location-prefixed user/detail text but copy an existing string `error.code` to the wrapper before publishing.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output |
|---|---|---|---|
| S1 | DONE | Report initialization and findings | living report/register |
| S2 | DONE | PR allocation/report sync | PR #1021 report identity |
| S3 | DONE | Bootstrap changed-file verification | clean starting diff |
| S4 | DONE | Collection mock correction | ISS-001 |
| S5 | DONE | Draft persistence | ISS-002/004 |
| S6 | DONE | Delete sequencing | ISS-003 |
| S7 | DONE | Source guards/hygiene | regression evidence |
| S8 | DONE | Initial-slice handover checkpoint | reconciled draft PR |
| S9 | DONE | No-Worker feedback + current-option parity | ISS-006/007 |
| S10 | IN_PROGRESS | Structured failure guidance + code preservation | C03 / ISS-008 |
| S11 | PLANNED | Evidence-export exception containment | C04 |
| S12 | PLANNED | Reconcile/validate continued Critical slice | report + PR evidence |

## 5. Stage Execution Log

### Stages 1–8 — initial slice checkpoint
**COMPLETE.** Created the living report/PR; corrected C01/N01/N02 plus package-editor sibling draft loss; added existing-source regression guards; reconciled the initial slice with no workflow changes. Full repository/browser checks were NOT_RUN in this environment.

### Stage 9 — no-Worker run feedback and execution-option parity
**Status:** COMPLETE at source/guard level.

#### Before stage
- Controller delegated no-Worker execution directly to synchronous `store.run()`.
- Intermediate RUNNING state was published but could not paint before computation.
- No-Worker Cancel was a no-op.
- Store run options were captured at construction while Worker input used current controller options.

#### Implementation performed
- Added `executeActiveRun(identity, optionsOverride)` to `lfea-workbench-run-store.js`.
- Preserved standalone synchronous `run()` as `beginRun()` + identity-safe execution.
- Added exact active-identity check before numerical execution.
- No-Worker controller path now `beginRun → yieldRunFeedbackFrame → executeActiveRun(identity,currentOptions)`.
- Added no-Worker queued cancellation through `store.cancelRun()`.
- `yieldRunFeedbackFrame` uses `requestAnimationFrame` followed by a timer task where available; timer-only fallback is used outside browser frame scheduling.
- Extended existing containment check with source assertions plus store-level cancelled/stale deferred identity tests.

#### Changed files
| File | Change | Why |
|---|---|---|
| `src/workspace/lfea-workbench-run-store.js` | identity-safe active-run executor + explicit options override | stale/cancelled deferred callbacks and current-options parity |
| `src/workspace/lfea-workbench-controller.js` | real feedback yield + no-Worker cancellation/current options | fix C02 accurately without changing solver numerics |
| `scripts/lfea-p0-ui-containment-check.mjs` | source/runtime guards | durable regression evidence without new workflow |
| `agents/PR1021_workreport.md` | before/after handover state | required SSOT |

#### Validation performed
- Controller and run-store PR patches re-read: intended changes only; no missing-newline marker.
- Existing containment check asserts old direct no-Worker `store.run()` path is absent.
- Guard asserts begin/yield/execute ordering and `this.pipelineOptions` handoff.
- Guard asserts no-Worker cancellation.
- Store checks exercise cancelled identity and old callback versus replacement run identity.
- GitHub changed-file list after S9 was exactly report, containment check, controller, run-store, and prior view file; no workflow file.
- Full `npm run check:lfea-workbench`: **NOT_RUN** in this sandbox.
- Browser proof that RUNNING paints before solve: **NOT_RUN** in this sandbox.

#### Risks / limitations
Main-thread solve remains non-preemptible after compute starts. The UI must not imply Worker-equivalent mid-solve cancellation.

#### Handover delta
- **Newly true:** no-Worker lifecycle is identity-safe, paint-yielded, queued-cancellable, and current-options aligned.
- **Still unresolved:** C03/C04 and runtime/browser execution evidence.
- **Next stage starts with:** preserve diagnostic code and replace substring-based failure guidance.

### Stage 10 — structured failure guidance and diagnostic-code preservation
**Status:** IN_PROGRESS — pre-stage record complete; no Stage 10 production change yet.

#### Before stage
- Failure banner joins `diagnostics[].message` and tests raw message substrings (`lfea-mesh-package/v1` / `schema`) to decide whether to append one piping-workspace hint.
- `failedState` already exposes structured `diagnostic.code` when the thrown error carries one.
- Mesh validation can produce concrete codes including `STALE_PACKAGE_SEMANTIC_HASH`, `UNSUPPORTED_PACKAGE_SCHEMA`, `UNSUPPORTED_UNITS`, `UNSUPPORTED_COORDINATE_SYSTEM`, `MISSING_FIELD`, `UNSUPPORTED_FIELD`, `NONFINITE_VALUE`, `NONPOSITIVE_VALUE`, `INVALID_MATERIAL`, `INVALID_ELEMENT_CONNECTIVITY`, duplicate/empty collection identities, and other `UNSUPPORTED_*` codes.
- `reportEditError` can erase an incoming code by wrapping the error.

#### Objective
Make the failure banner actionable for engineering users without hiding the original diagnostic authority/detail.

#### Planned implementation
1. Preserve an existing incoming `error.code` in `reportEditError` while retaining location-prefixed message detail.
2. Replace message-substring routing in `LfeaWorkbenchView.header()` with a helper driven by `diagnostics[].code`.
3. Use code families/categories rather than an exhaustive fragile one-code-per-message map:
   - schema/shape → valid LFEA package / correct upstream surface guidance;
   - semantic hash → re-export/rebuild from authoritative source; do not repair imported hash;
   - unsupported units/coordinate/formulation/element/constraint → correct/convert upstream, no silent coercion;
   - invalid numeric/material/connectivity → correct indicated engineering value/connectivity;
   - duplicate/empty collections → correct identified package structure;
   - local edit rejection → committed package remains authoritative; correct edit and retry;
   - fallback → operation failed; inspect retained code/detail.
4. Primary banner text becomes friendly summary + recovery action; retain raw diagnostic code/detail in secondary/traceable attributes/text.
5. Extend existing containment check; no workflow additions.

#### Expected examples
- `STALE_PACKAGE_SEMANTIC_HASH`: “Imported package content does not match its declared semantic hash. Re-export/rebuild from the authoritative source; imported hashes are intentionally not repaired.” Raw code/detail remains available.
- `NONFINITE_VALUE`: “Correct the indicated engineering numeric value and retry.” Original detail such as `nodes[3].x must be finite` remains visible.
- `UNSUPPORTED_PACKAGE_SCHEMA`: “Import a valid `lfea-mesh-package/v1`; piping project datasets belong in the 3D Piping Workspace.”
- local JSON/edit error: “The local edit was rejected; committed engineering state was not accepted from this edit. Correct the JSON/data and retry.”

#### Edge cases
- Multiple diagnostics with different code families: choose the first ERROR as primary while retaining all detail.
- Unknown future code: deterministic generic guidance, no substring fallback.
- Mid-run edit error keeps status RUNNING, so the header FAILED banner is still not shown; results diagnostic remains the authoritative feedback for that state.

#### Planned validation
- Source guard rejects old `errorMsg.includes(...)` guidance logic.
- Guard requires code-driven failure presentation and retained raw code/detail.
- Store-level check verifies `reportEditError` preserves incoming code.
- Re-read final view/document-store/check patches.
- Full/browser runtime remains NOT_RUN unless environment changes.

## 6. Changed-File Ledger

| File | First stage | Latest stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR1021_workreport.md` | S2 | S10 | PR SSOT / handover | No | current |
| `src/workspace/lfea-workbench-view.js` | S4 | S10 planned | mock scope, drafts, delete sequencing, failure guidance | Yes | source guards; runtime/browser NOT_RUN |
| `scripts/lfea-p0-ui-containment-check.mjs` | S7 | S10 planned | existing regression guards | No production | source/store checks |
| `src/workspace/lfea-workbench-controller.js` | S9 | S9 | no-Worker lifecycle/current options/cancel | Yes | patch + guard inspected |
| `src/workspace/lfea-workbench-run-store.js` | S9 | S9 | active-run identity-safe execution | Yes | patch + guard inspected |
| `src/workspace/lfea-workbench-document-store.js` | S10 planned | S10 planned | preserve structured edit diagnostic code | Yes | pending |

## 7. Engineering Decisions and Invariants

- **INV-001:** imported package validation/reseal governance remains unchanged.
- **INV-002:** preview/draft state is not solver authority.
- **INV-003:** unrelated render is not implicit discard.
- **INV-004:** committed model change invalidates incompatible execution and stale drafts.
- **INV-005:** successful delete render boundary does not observe stale pre-delete selection.
- **INV-006:** synchronous execution proceeds only for the exact captured active run identity.
- **INV-007:** Worker and no-Worker paths consume equivalent current controller analysis options.
- **INV-008:** user-friendly failure presentation must not discard the structured diagnostic code or technical detail used for traceability.

## 8. Validation and Evidence Ledger

| Validation | Status | Evidence / limitation |
|---|---|---|
| Initial-slice source guards | IMPLEMENTED / SOURCE-INSPECTED | S7 |
| Stage 9 source/store guards | IMPLEMENTED / SOURCE-INSPECTED | containment check |
| Stage 9 patch review | PASS | controller/run-store/check reviewed |
| Full `npm run check:lfea-workbench` | **NOT_RUN** | no executable checkout in sandbox |
| Browser interaction/paint tests | **NOT_RUN** | no browser checkout in sandbox |
| Stage 10 source/store guards | PENDING | after implementation |

## 9. Known Issues, Improvements, and Deferred Scope

### Current active scope
- C03 structured failure guidance.
- `ISS-008` diagnostic-code preservation through edit-error wrapping.

### Next Critical finding
- C04 evidence export can throw through the controller without diagnostic containment.

### Deferred roadmap
- H01 read-only analysis settings/authority summary.
- H02 authority-policy human labels.
- H03 preflight human labels.
- `IMP-002` full three-surface governed workflow audit.
- restraint/support fidelity: guides, line stops, directional restraints, gaps, friction, springs, vertical cases.
- `RISK-001` distinguish piping beam response, local continuum FEA, and piping-code stress.
- `RISK-002` expose support-reaction sign convention.
- `IMP-001` shared engineering colour authority for comparisons.
- `QST-001` authoritative vertical support-triad fallback-axis policy.

## 10. Recommended Forward Sequence

1. Complete S10 and update report with exact implementation/evidence.
2. S11: C04 evidence-export exception containment and diagnostic surfacing.
3. S12: reconcile changed files, remaining Critical findings, and handover.
4. Then move to H01/H02/H03 or the larger three-surface audit according to Owner priority.

## 11. Next-Agent Handover

### Current stopping point
Stage 9 is complete at source/guard level. Stage 10 pre-stage documentation is committed before production changes.

### PR / branch
- PR: #1021
- Branch: `agent/lfea-workbench-integrity-1018`
- Base: `751756e9140527b8dc121aa179dc76b7039fb7ad`
- Continuation baseline: `b9b18d53f3ad146aadc354a0d977c23078f397db`

### Start here
1. `src/workspace/lfea-workbench-document-store.js` — preserve existing incoming `error.code` in the location-prefixed wrapper used by `reportEditError`.
2. `src/workspace/lfea-workbench-view.js` — replace raw message substring routing in the FAILED header with structured code-family presentation.
3. `scripts/lfea-p0-ui-containment-check.mjs` — add guards/store assertion.

### Do not redo
- C01/N01/N02 and package-draft investigation/fixes.
- Stage 9 no-Worker lifecycle/options grounding or implementation.
- Discovery that mesh validation propagates specific contract codes.

### Known failing checks
None observed. Full repository/browser checks are NOT_RUN, not PASS.

### Highest current risk
Over-simplifying error guidance in a way that hides engineering detail or encourages silent coercion of unsupported/invalid model authority.

### Exact next action
Preserve diagnostic code in `reportEditError`, then implement code-family failure presentation while retaining raw code/detail.

## 12. Process Notes / Lessons Learned

- PN-001: synchronous store mutation can render before the next event-handler line.
- PN-002: credible out-of-scope findings receive durable IDs.
- PN-003: sibling surfaces often share lifecycle defects.
- PN-004: committed model identity is an effective UI-draft invalidation boundary.
- PN-005: source inspection, source guards, runtime execution, and browser interaction are distinct evidence classes.
- PN-006: connector full-file writes require patch/file-ending review.
- PN-007: an explicit Owner continuation can supersede a prior closure checkpoint while preserving its handover value.
- PN-008: microtasks are not browser paint boundaries.
- PN-009: execution-transport parity includes current analysis options.
- PN-010: structured diagnostic codes are engineering authority for recovery routing; raw message substrings are not a stable interface.

## 13. PR Closure / Continuation Record

| Criterion | Current result |
|---|---|
| Initial integrity slice | COMPLETE checkpoint |
| Stage 9 | COMPLETE at source/guard level |
| Stage 10 | IN_PROGRESS |
| C04 | PENDING |
| Engineering Item Register synchronized | YES |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows added | **NO** |
| PR status | DRAFT |

Final closure will be rewritten after the continued Critical-finding slice is reconciled.
