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
| Current stage | Stage 11 — evidence-export exception containment |
| Last completed stage | Stage 10 — structured failure guidance and diagnostic-code preservation |
| Engineering status | C02/C03 and supporting parity/provenance defects implemented and guarded; C04 grounded before implementation |
| Validation status | Source/store guards updated; full repository/browser execution still NOT_RUN in this sandbox |
| Current blocker | None |
| Exact next action | Catch evidence-export/download failures in the controller, surface `LFEA_EVIDENCE_EXPORT_REJECTED`, add dedicated guidance, and guard the fail-closed path |

### Handover in 60 seconds

**What is now true**
- C01: collection-context whole-package mock controls removed; toolbar global mock retained.
- N01/sibling: package and record drafts survive benign renders and invalidate on committed model identity change.
- N02: delete clears selection before synchronous mutation with identity-preserving failure recovery.
- C02: no-Worker Run publishes RUNNING/QUEUED, yields a real frame/task opportunity, then executes the captured run identity with current pipeline options; queued cancellation is supported.
- C03: FAILED header no longer chooses guidance from raw message substrings. It uses diagnostic-code families for summary/recovery while retaining the original code(s) and diagnostic message detail.
- `reportEditError` now preserves an incoming `error.code`; operation-specific fallbacks classify malformed file import as `LFEA_IMPORT_REJECTED`, document-text edit parse failure as `LFEA_EDIT_REJECTED`, and record edits as `LFEA_RECORD_EDIT_REJECTED`.
- Existing containment check guards C02/C03 and prior integrity fixes without adding workflows.

**Currently being worked on**
- C04: `downloadEvidence()` can call `exportEvidence()` in an unexpected invalid state and allow its TypeError to escape the UI event path.

**Still unresolved**
- H01–H03 and remaining lower-priority #1018 findings.
- Full repository/browser validation remains NOT_RUN in this environment.

**Do not assume**
- Disabled-button state is a sufficient governance boundary for evidence export; controller/store boundaries still need fail-closed handling.
- Catching an export exception should produce a stale evidence file. The correct outcome is diagnostic + no download.
- Main-thread no-Worker compute is mid-solve interruptible; only the queued/yield interval is cancellable.

## 1. Mission and Engineering Intent

### Mission
Continue #1018 remediation on one draft PR while preserving engineering-state authority, run identity, diagnostic provenance, evidence-export qualification, and truthful user guidance.

### Governing principles
- Imported package authority remains fail-closed; stale hashes are not repaired on import.
- Draft/preview UI state is not solver authority.
- Run completion/failure is accepted only for the exact active run identity.
- Worker and no-Worker paths consume equivalent current analysis options.
- Recovery guidance is driven by structured diagnostic codes, with raw code/detail retained.
- Evidence export is permitted only for the current qualified execution; failures must not create/download evidence.
- No `.github/workflows/*` changes.
- Validation claims distinguish executed, source-inspected, and NOT_RUN evidence.

## 2. Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living PR report | High | DONE / ACTIVE | S1–current | this file |
| Collection mock scope | Critical | IMPLEMENTED + GUARDED | S4/S7 | source guard |
| Package/record draft persistence | High | IMPLEMENTED + GUARDED | S5/S7 | source guard |
| Delete sequencing | Medium | IMPLEMENTED + GUARDED | S6/S7 | source guard |
| C02 no-Worker feedback | Critical | IMPLEMENTED + GUARDED | S9 | source/store guard |
| No-Worker current options parity | High | IMPLEMENTED + GUARDED | S9 | ISS-007 |
| C03 structured failure guidance | Critical | IMPLEMENTED + GUARDED | S10 | view/store/controller + guard |
| Preserve wrapped diagnostic code | High | IMPLEMENTED + GUARDED | S10 | ISS-008 |
| C04 evidence-export error surfacing | Critical | IN_PROGRESS | S11 | #1018 + source grounding |
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
| ISS-008 | Defect | High | IMPLEMENTED + GUARDED | `reportEditError` discarded incoming structured `error.code` | Yes |
| ISS-009 | Defect / C04 | Critical | IN_PROGRESS | Evidence export exception can escape controller event path instead of becoming a diagnostic | Yes |
| IMP-001 | Improvement | High | DEFERRED | Cross-run plots need shared engineering colour authority | No |
| IMP-002 | Improvement | High | DEFERRED | Upstream pre-FEA/linear-piping LFEA surfaces need dedicated audit | No |
| RISK-001 | Engineering risk | High | OPEN | Continuum von Mises may be mistaken for piping-code stress | No |
| RISK-002 | Engineering risk | High | OPEN | Support reaction sign convention may be overlooked downstream | No |
| QST-001 | Engineering question | Medium | OPEN | Authoritative fallback axis for vertical-pipe support triad degeneracy | No |
| DEC-001 | Decision | — | ACTIVE | Remove collection mock actions instead of relabelling | Yes |
| DEC-002 | Decision | — | ACTIVE | No new CI workflow gates | Yes |
| DEC-003 | Decision | — | ACTIVE | View-owned drafts invalidated by committed model identity | Yes |
| DEC-004 | Decision | — | ACTIVE | Delete clears selection before mutation; failed delete restores by identity | Yes |
| DEC-005 | Decision | — | ACTIVE | No-Worker fallback uses begin → real frame/task yield → captured-identity execute | Yes |
| DEC-006 | Decision | — | ACTIVE | Active-run executor accepts current pipeline options and no-ops on stale/cancelled identity | Yes |
| DEC-007 | Decision | — | ACTIVE | Failure UI uses code families for guidance while retaining raw code/detail | Yes |
| DEC-008 | Decision | — | PROPOSED | Evidence export failure becomes `LFEA_EVIDENCE_EXPORT_REJECTED` diagnostic and must not call downloader | Yes |

### ISS-009 — C04 evidence-export exception containment
`documentStore.exportEvidence()` intentionally throws if execution is not current or `evidenceExport.status !== 'QUALIFIED_EXPORT'`. Toolbar disablement normally prevents the call, but `controller.downloadEvidence()` currently performs `exportEvidence()` and `downloadLfeaJson()` without a try/catch.

**Engineering consequence:** an unexpected UI/state/direct-call path can surface an unhandled exception instead of an explicit fail-closed evidence-governance diagnostic.

**Required outcome:** on failure, no download is attempted; state receives a stable evidence-export rejection diagnostic with recovery guidance. Qualified current evidence continues through the existing download path unchanged.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output |
|---|---|---|---|
| S1–S8 | DONE | Initial integrity slice + handover checkpoint | C01/N01/N02 + report/guards |
| S9 | DONE | No-Worker feedback + current-option parity | C02 / ISS-007 |
| S10 | DONE | Structured failure guidance + code preservation | C03 / ISS-008 |
| S11 | IN_PROGRESS | Evidence-export exception containment | C04 / ISS-009 |
| S12 | PLANNED | Reconcile/validate continued Critical slice | final continued-slice report |

## 5. Stage Execution Log

### Stages 1–8 — initial slice checkpoint
**COMPLETE.** Living report/PR created; collection destructive scope, draft lifecycle, and delete sequencing corrected; existing source guard extended; initial diff reconciled with no workflow changes. Full repository/browser checks were NOT_RUN.

### Stage 9 — no-Worker run feedback and execution-option parity
**COMPLETE at source/guard level.** Added identity-safe `executeActiveRun`; controller no-Worker path now begins, yields frame/task, executes captured identity using current `pipelineOptions`; no-Worker queued cancel works; existing check guards ordering/current options/stale callbacks. Runtime browser paint proof remains NOT_RUN.

### Stage 10 — structured failure guidance and diagnostic-code preservation
**Status:** COMPLETE at source/store-guard level.

#### Before stage
FAILED header joined raw diagnostic messages and selected its only hint by checking message substrings. `reportEditError` could discard incoming error codes.

#### Implementation performed
- `reportEditError(path,index,error,fallbackCode)` now preserves any incoming string `error.code` on its location-prefixed wrapper and accepts an operation-specific fallback.
- Controller file-input read/JSON failures use fallback `LFEA_IMPORT_REJECTED`.
- Controller document-text JSON failures use fallback `LFEA_EDIT_REJECTED`.
- Record parse/edit failures retain `LFEA_RECORD_EDIT_REJECTED` default.
- View FAILED header delegates to `failureBanner(diagnostics)` / `failurePresentation`.
- Code families cover semantic-hash mismatch, package shape/schema, unsupported declarations, invalid engineering values/connectivity, duplicate/empty structure, local edit rejection, and unknown fallback.
- Banner exposes primary diagnostic code via `data-code`, aggregate codes via `title`, and raw technical message detail in a secondary detail line.
- Removed raw-message substring routing.
- Existing containment check guards all above and adds store-level checks for incoming-code preservation and operation fallback classification.

#### Changed files
| File | Change | Why |
|---|---|---|
| `src/workspace/lfea-workbench-document-store.js` | preserve incoming code + fallback parameter | diagnostic provenance |
| `src/workspace/lfea-workbench-controller.js` | classify import/document parse failures | accurate recovery routing |
| `src/workspace/lfea-workbench-view.js` | code-family failure presentation | C03 actionable UI without hiding detail |
| `scripts/lfea-p0-ui-containment-check.mjs` | source/store guards | durable regression evidence |
| `agents/PR1021_workreport.md` | stage/handover update | SSOT |

#### Validation performed
- View patch re-read: old substring logic removed; structured code/detail retained.
- Guard patch re-read; one capitalization mismatch in the source assertion was found and corrected before stage closure.
- Store check now verifies a `NONFINITE_VALUE` code survives location-prefix wrapping.
- Store check verifies explicit `LFEA_IMPORT_REJECTED` fallback classification.
- Full `npm run check:lfea-workbench`: **NOT_RUN**.
- Browser presentation checks: **NOT_RUN**.

#### Handover delta
- **Newly true:** C03 guidance is structured/code-driven and code provenance survives wrapping.
- **Still unresolved:** C04 and full runtime/browser evidence.
- **Next stage starts with:** controller evidence-export exception containment.

### Stage 11 — evidence-export exception containment
**Status:** IN_PROGRESS — pre-stage record complete; no Stage 11 production change yet.

#### Before stage
- Toolbar enables export only for a current `QUALIFIED_EXPORT` execution.
- Store independently enforces that boundary and throws `TypeError('Qualified LFEA evidence export is unavailable.')` when violated.
- Controller `downloadEvidence()` does not catch either that governance exception or a downstream downloader exception.

#### Objective
Ensure evidence export fails closed through a diagnostic rather than an unhandled browser exception, with zero stale/unqualified download attempt.

#### Planned implementation
1. Wrap `downloadEvidence()` export + download in try/catch.
2. On failure call `store.reportEditError('evidenceExport', null, error, 'LFEA_EVIDENCE_EXPORT_REJECTED')`.
3. Add `LFEA_EVIDENCE_EXPORT_REJECTED` guidance: current qualified evidence is unavailable; rerun/requalify the current model before export; no stale evidence was downloaded.
4. Extend existing containment check to require try/catch ordering and code/guidance.
5. Add a store-level check that unavailable `exportEvidence()` still throws as the lower governance boundary; controller containment is an additional UI boundary, not a weakening of the store.

#### Edge cases
- Direct `downloadEvidence()` call before any run.
- Model edited after a qualified run, invalidating current execution.
- Active run/direct call while export button is disabled.
- Downloader/environment failure after qualified evidence retrieval: diagnostic is surfaced; evidence object is not treated as successfully downloaded.

#### Risks
Using `reportEditError` changes status to FAILED when no run is active. This is intentional for a user-triggered failed export; it preserves package authority and makes the failure visible. During an active run, existing `editFailureState` keeps RUNNING.

## 6. Changed-File Ledger

| File | First stage | Latest stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR1021_workreport.md` | S2 | S11 | PR SSOT / handover | No | current |
| `src/workspace/lfea-workbench-view.js` | S4 | S11 planned | mock scope, drafts, delete sequencing, failure/export guidance | Yes | source guards; browser NOT_RUN |
| `scripts/lfea-p0-ui-containment-check.mjs` | S7 | S11 planned | existing regression guards | No production | source/store checks |
| `src/workspace/lfea-workbench-controller.js` | S9 | S11 planned | no-Worker lifecycle + failure classification + export containment | Yes | source guard; runtime/browser NOT_RUN |
| `src/workspace/lfea-workbench-run-store.js` | S9 | S9 | active-run identity-safe execution | Yes | source/store guard |
| `src/workspace/lfea-workbench-document-store.js` | S10 | S10 | diagnostic-code provenance + evidence governance boundary | Yes | source/store guard |

## 7. Engineering Decisions and Invariants

- **INV-001:** imported package validation/reseal governance remains unchanged.
- **INV-002:** preview/draft state is not solver authority.
- **INV-003:** unrelated render is not implicit discard.
- **INV-004:** committed model change invalidates incompatible execution and stale drafts.
- **INV-005:** delete render boundary does not observe stale pre-delete selection.
- **INV-006:** synchronous execution proceeds only for the exact captured active run identity.
- **INV-007:** Worker/no-Worker paths consume equivalent current controller analysis options.
- **INV-008:** friendly failure presentation retains structured code and technical detail.
- **INV-009:** evidence download can occur only after the store returns current qualified evidence; failure at either export or download boundary becomes visible failure, never stale evidence success.

## 8. Validation and Evidence Ledger

| Validation | Status | Evidence / limitation |
|---|---|---|
| Initial-slice source guards | IMPLEMENTED / SOURCE-INSPECTED | S7 |
| Stage 9 source/store guards | IMPLEMENTED / SOURCE-INSPECTED | S9 |
| Stage 10 source/store guards | IMPLEMENTED / SOURCE-INSPECTED | S10 |
| Full `npm run check:lfea-workbench` | **NOT_RUN** | no executable checkout in sandbox |
| Browser interaction/paint/presentation | **NOT_RUN** | no browser checkout in sandbox |
| Stage 11 source/store guards | PENDING | after implementation |

## 9. Known Issues, Improvements, and Deferred Scope

### Current active scope
- C04 / `ISS-009` evidence-export exception containment.

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

1. Complete S11 and update this report with actual implementation/evidence.
2. S12: reconcile changed files/base ancestry, review all Critical findings C01–C04 disposition, and leave a fresh handover checkpoint.
3. Then proceed to H01/H02/H03 or full three-surface audit according to Owner priority.

## 11. Next-Agent Handover

### Current stopping point
Stage 10 is complete at source/store-guard level. Stage 11 pre-stage record is committed before production changes.

### PR / branch
- PR: #1021
- Branch: `agent/lfea-workbench-integrity-1018`
- Base: `751756e9140527b8dc121aa179dc76b7039fb7ad`

### Start here
`src/workspace/lfea-workbench-controller.js` → `downloadEvidence()`. Add fail-closed try/catch, then add evidence-export guidance in `lfea-workbench-view.js` and guards in existing containment check.

### Do not redo
- C01/N01/N02 and draft fixes.
- Stage 9 no-Worker lifecycle/current-options work.
- Stage 10 code-family failure presentation and diagnostic provenance work.

### Known failing checks
None observed. Full repository/browser checks remain NOT_RUN.

### Highest current risk
Accidentally treating an unavailable/stale evidence object as downloadable after an export failure. The store's qualification throw must remain intact and downloader must not be called on that path.

## 12. Process Notes / Lessons Learned

- PN-001: synchronous mutation/render ordering matters for UI-local state.
- PN-002: durable register IDs prevent discoveries from disappearing at handover.
- PN-003: committed model identity is a useful draft invalidation boundary.
- PN-004: source inspection, guards, runtime execution, and browser tests are different evidence classes.
- PN-005: microtasks are not browser paint boundaries.
- PN-006: execution-transport parity includes current analysis options.
- PN-007: structured diagnostic codes are the routing authority; raw messages are detail, not a stable interface.
- PN-008: disabled UI controls are usability guards, not substitutes for fail-closed controller/store boundaries.

## 13. PR Closure / Continuation Record

| Criterion | Current result |
|---|---|
| Initial integrity slice | COMPLETE checkpoint |
| C02 | IMPLEMENTED + GUARDED |
| C03 | IMPLEMENTED + GUARDED |
| C04 | IN_PROGRESS |
| Engineering Item Register synchronized | YES |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows added | **NO** |
| PR status | DRAFT |

Final continued-slice closure will be rewritten after Stage 12 reconciliation.
