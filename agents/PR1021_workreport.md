# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This is the single source of truth for current PR state, engineering findings, decisions, validation evidence, deferred improvements, and next-agent handover. Current-state sections are rewritten as work progresses; stage history remains durable.

> Stage 8 was the closure checkpoint for the initial integrity slice. The Owner then explicitly authorized continuation on the same PR; subsequent work remains stacked on PR #1021.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Mission | Resolve the highest-value verified LFEA workbench defects from #1018 without solver-numeric or CI-workflow changes |
| Source issue | #1018 |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| PR state | Draft |
| Current stage | Stage 13 — H01/H02/H03 analysis-authority and output presentation |
| Last completed stage | Stage 12 — continued Critical-slice reconciliation |
| Engineering status | C01–C04 implemented and guarded; High-priority H01–H03 grounded before implementation |
| Validation status | Source/store guards and GitHub diff reconciliation complete; full repository/browser execution remains NOT_RUN |
| Current blocker | None |
| Exact next action | Add a read-only analysis-authority card, humanize authority policy and preflight labels using current real codes, and retain raw codes in data/title attributes |

### Handover in 60 seconds

**What is now true**
- C01: dangerous collection-context whole-package mock actions removed.
- C02: no-Worker run publishes a paintable queued state, executes only the captured active identity with current options, and supports cancellation during the queued interval.
- C03: failure guidance is code-driven, actionable, and retains raw diagnostic code/detail; wrapped error codes are preserved and import/document/record parse failures are classified accurately.
- C04: evidence download is fail-closed. Store still throws when evidence is not current/qualified; controller converts that or downloader failures into `LFEA_EVIDENCE_EXPORT_REJECTED`. No downloader call occurs after qualification throws.
- Existing `lfea-p0-ui-containment-check.mjs` guards all of the above without adding workflows.
- Continued Critical-slice reconciliation at head `44ece9cd0152c28db7f8092ff311ddd84fb78832`: branch is ahead-only from the authorized base and exactly six registered files differ; no `.github/workflows/*` file is changed.

**Currently being worked on**
- H01: no read-only analysis settings/authority view.
- H02: output authority policy displays raw internal codes.
- H03: preflight displays raw internal status code as the primary label.

**Grounded design correction to issue hints**
- Actual current authority codes are `AUTHORITATIVE_RAW_ELEMENT_OR_INTEGRATION_POINT_STRESS`, `NON_AUTHORITATIVE_REVIEW_PROJECTION`, `NOT_GENERATED`, and convergence policy `PROHIBITED`; implementation will map these real codes rather than stale example names in the issue.
- The solver profile has real fields including `backendIdentity`, `formulation`, `units`, `dofOrder`, `constraintMethod`, and conventions. The UI will say **solver backend** rather than inventing a generic solver-type field.
- Package element family is derived from actual `elements[].elementType`; mixed T3/Q4 packages are valid and must display both.

**Do not assume**
- H01 is an authoring form. This stage is read-only transparency only; raw package remains the governed edit authority.
- Human labels replace raw engineering codes. Raw codes remain in data/title attributes for traceability.

## 1. Mission and Engineering Intent

### Mission
Continue #1018 remediation while preserving engineering authority and making the governed model/run state understandable without requiring users to decode raw JSON or internal enums.

### Governing principles
- Read-only presentation never mutates solver profile or package authority.
- Display values come directly from the current committed package/execution.
- Mixed element families are shown, not collapsed to a false single type.
- Human-readable labels are presentation aliases; raw policy/status codes remain available for technical traceability.
- Unknown future codes fail visibly to a generic human label rather than being silently misrepresented.
- No `.github/workflows/*` changes.

## 2. Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living PR report | High | DONE / ACTIVE | S1–current | this file |
| C01 collection mock scope | Critical | IMPLEMENTED + GUARDED | S4/S7 | source guard |
| Draft persistence / delete sequencing | High/Medium | IMPLEMENTED + GUARDED | S5–S7 | source guard |
| C02 no-Worker lifecycle | Critical | IMPLEMENTED + GUARDED | S9 | source/store guard |
| C03 structured failure guidance | Critical | IMPLEMENTED + GUARDED | S10 | source/store guard |
| C04 evidence-export containment | Critical | IMPLEMENTED + GUARDED | S11 | source/store guard |
| C01–C04 reconciliation | Critical | DONE | S12 | GitHub diff/base reconciliation |
| H01 analysis settings visibility | High | IN_PROGRESS | S13 | grounded from real package/profile |
| H02 authority policy labels | High | ACCEPTED | S13 | actual pipeline codes verified |
| H03 preflight status labels | High | ACCEPTED | S13 | actual preflight codes verified |
| Runtime/browser validation | High | NOT_RUN | ongoing | environment limitation |

## 3. Engineering Item Register

| ID | Type | Sev./priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | Defect | Critical | IMPLEMENTED + GUARDED | Collection-context Mock Package actions replaced whole package | Yes |
| ISS-002 | Defect | High | IMPLEMENTED + GUARDED | Render destroyed unsaved record-editor text | Yes |
| ISS-003 | Defect | Medium | IMPLEMENTED + GUARDED | Delete selection cleared after synchronous mutation/render | Yes |
| ISS-004 | Defect | High | IMPLEMENTED + GUARDED | Render destroyed unsaved package-editor text | Yes |
| ISS-005 | Quality defect | Low | RESOLVED | Connector replacement removed trailing newlines | Yes |
| ISS-006 / C02 | Defect | Critical | IMPLEMENTED + GUARDED | No-Worker run lacked a paintable RUNNING boundary | Yes |
| ISS-007 | Defect | High | IMPLEMENTED + GUARDED | No-Worker execution used stale construction-time pipeline options | Yes |
| ISS-008 | Defect | High | IMPLEMENTED + GUARDED | Wrapped edit failures discarded structured diagnostic code | Yes |
| ISS-009 / C04 | Defect | Critical | IMPLEMENTED + GUARDED | Evidence export exception escaped controller event path | Yes |
| ISS-010 / H01 | Missing transparency | High | IN_PROGRESS | Solver profile, units and element families invisible outside raw JSON | Yes |
| ISS-011 / H02 | Presentation defect | High | ACCEPTED | Authority policy line exposes raw internal enum codes | Yes |
| ISS-012 / H03 | Presentation defect | High | ACCEPTED | Preflight primary label exposes raw internal status code | Yes |
| IMP-001 | Improvement | High | DEFERRED | Cross-run plots need shared engineering colour authority | No |
| IMP-002 | Improvement | High | DEFERRED | Upstream pre-FEA/linear-piping LFEA surfaces need dedicated audit | No |
| RISK-001 | Engineering risk | High | OPEN | Continuum von Mises may be mistaken for piping-code stress | No |
| RISK-002 | Engineering risk | High | OPEN | Support reaction sign convention may be overlooked downstream | No |
| QST-001 | Engineering question | Medium | OPEN | Authoritative fallback axis for vertical-pipe support triad degeneracy | No |

### Key active decisions
- **DEC-002:** no new CI workflows.
- **DEC-005/006:** no-Worker uses real yield + exact run identity + current options.
- **DEC-007:** failure guidance uses structured codes and retains raw detail.
- **DEC-008:** evidence export failure is diagnostic + no stale/unqualified success.
- **DEC-009 (proposed):** H01 card is read-only and derives values from committed package only.
- **DEC-010 (proposed):** H02/H03 humanize known current codes but preserve raw codes in `data-*`/`title`.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output |
|---|---|---|---|
| S1–S8 | DONE | Initial integrity slice + handover | C01/N01/N02 + report/guards |
| S9 | DONE | No-Worker lifecycle/current options | C02 / ISS-007 |
| S10 | DONE | Structured failure guidance/provenance | C03 / ISS-008 |
| S11 | DONE | Evidence-export exception containment | C04 / ISS-009 |
| S12 | DONE | Reconcile continued Critical slice | C01–C04 checkpoint |
| S13 | IN_PROGRESS | Analysis authority + output/preflight human labels | H01/H02/H03 |
| S14 | PLANNED | Reconcile H01–H03 and choose next High item | handover + roadmap |

## 5. Stage Execution Log

### Stages 1–8 — initial slice
**COMPLETE.** Established living PR report; corrected mock scope, draft lifecycle, and delete sequencing; extended existing containment guard; no workflow changes. Runtime/browser checks NOT_RUN.

### Stage 9 — C02 + option parity
**COMPLETE at source/store-guard level.** Added identity-safe active-run execution; real frame/task yield for no-Worker path; current controller options handoff; queued cancellation; stale deferred callback checks. Browser paint proof NOT_RUN.

### Stage 10 — C03 + diagnostic provenance
**COMPLETE at source/store-guard level.** Replaced raw substring failure routing with code-family guidance; retained raw codes/detail; preserved incoming error codes; classified file import/document edit/record parse fallback codes. Browser presentation NOT_RUN.

### Stage 11 — C04 evidence-export containment
**COMPLETE at source/store-guard level.**
- Controller `downloadEvidence()` now wraps qualification and downloader calls in try/catch.
- Failure publishes `LFEA_EVIDENCE_EXPORT_REJECTED` through existing diagnostic machinery.
- View has explicit evidence-export recovery guidance.
- Store's lower `isCurrentExecution && QUALIFIED_EXPORT` throw remains unchanged.
- Existing containment check guards store boundary + controller catch ordering + guidance and asserts unavailable store export still throws without mutating state.
- Full/browser runtime NOT_RUN.

### Stage 12 — continued Critical-slice reconciliation
**Status:** COMPLETE.

#### Changed-file verification
GitHub reports exactly:
1. `agents/PR1021_workreport.md`
2. `scripts/lfea-p0-ui-containment-check.mjs`
3. `src/workspace/lfea-workbench-controller.js`
4. `src/workspace/lfea-workbench-document-store.js`
5. `src/workspace/lfea-workbench-run-store.js`
6. `src/workspace/lfea-workbench-view.js`

No workflow file is changed. Base comparison at `44ece9cd0152c28db7f8092ff311ddd84fb78832` is `ahead`, 0 behind, merge base exactly the authorized base `751756e9140527b8dc121aa179dc76b7039fb7ad`.

#### Critical disposition
| Finding | Status |
|---|---|
| C01 mock destructive scope | IMPLEMENTED + GUARDED |
| C02 no-Worker feedback | IMPLEMENTED + GUARDED; mid-compute interruptibility explicitly not claimed |
| C03 raw failure guidance | IMPLEMENTED + GUARDED |
| C04 export exception | IMPLEMENTED + GUARDED |

#### Validation limitation
Full `npm run check:lfea-workbench` and browser interaction checks remain **NOT_RUN**, not PASS.

### Stage 13 — H01/H02/H03 analysis-authority and output presentation
**Status:** IN_PROGRESS — pre-stage record complete; no Stage 13 production change yet.

#### Before stage / ground truth
- Package `analysisDefinition.solverProfile` contains real authority fields including `profileIdentity`, `profileVersion`, `formulation`, `units.{length,force,stress}`, `dofOrder`, `constraintMethod`, `backendIdentity`, reaction/pressure conventions and more.
- Package-level `unitsIdentity` and `coordinateSystem` are separate governed declarations.
- Element family is per `elements[].elementType`; mixed `T3` + `Q4` packages exist and are valid.
- Current execution authority policy uses `AUTHORITATIVE_RAW_ELEMENT_OR_INTEGRATION_POINT_STRESS`, `NON_AUTHORITATIVE_REVIEW_PROJECTION` or `NOT_GENERATED`, plus `projectedStressForConvergence: PROHIBITED`.
- Preflight statuses are exactly `WITHIN_CAPACITY`, `EXPORT_LIKELY_TO_EXCEED_BYTE_CAPACITY`, `BLOCKED_BY_DECLARED_CAPACITY`.

#### Objective
Expose the declared analysis authority read-only and translate output/preflight enums into professional engineering language without losing raw-code traceability.

#### Planned implementation
1. Add `renderLfeaAnalysisSettings(root, packageValue)` to `lfea-workbench-panels.js`.
2. Add a dedicated `Analysis settings and authority` card in `LfeaWorkbenchView.content()`.
3. Display: package identity; package units identity; coordinate system; unique element families; formulation; solver profile identity/version; solver backend identity; length/force/stress units; DOF order; constraint method. Use `Not declared` only for genuinely absent optional display fields; do not synthesize authority.
4. H02: map current authority codes to human statements; include convergence prohibition; preserve raw codes in `data-*` and `title`.
5. H03: map current preflight statuses to `Within declared capacity`, `Capacity warning`, `Capacity blocked`; retain raw status in existing `data-status` and `title`.
6. Extend existing containment source guard; no workflow additions.

#### Examples / edge cases
- Mixed mesh displays `Q4, T3` (deterministic sorted set), not a false single element type.
- Sparse profile displays its actual `backendIdentity`; dense fixture displays `dense-ldlt-reference/v1`.
- Unknown future authority/preflight code gets a neutral `Policy not recognized` / `Preflight status not recognized` human label while raw code remains traceable.
- No package: analysis card states no committed package is loaded rather than fabricating defaults.

#### Risks
- A “settings” card could be mistaken for editable controls; card is deliberately read-only and named authority/settings summary.
- Current issue hint names older authority enum examples; implementation must follow current source codes, not stale examples.

## 6. Changed-File Ledger

| File | First stage | Latest stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR1021_workreport.md` | S2 | S13 | PR SSOT / handover | No | current |
| `src/workspace/lfea-workbench-view.js` | S4 | S13 planned | UI integrity + failure guidance + settings card | Yes | source guards; browser NOT_RUN |
| `src/workspace/lfea-workbench-panels.js` | S13 planned | S13 planned | analysis settings + authority/preflight labels | Yes presentation | pending |
| `scripts/lfea-p0-ui-containment-check.mjs` | S7 | S13 planned | existing regression guards | No production | source/store checks |
| `src/workspace/lfea-workbench-controller.js` | S9 | S11 | lifecycle/classification/export containment | Yes | source guard |
| `src/workspace/lfea-workbench-run-store.js` | S9 | S9 | identity-safe execution | Yes | source/store guard |
| `src/workspace/lfea-workbench-document-store.js` | S10 | S10 | diagnostic provenance/evidence gate | Yes | source/store guard |

## 7. Engineering Invariants

- Imported package validation/reseal governance remains unchanged.
- Preview/draft state is not solver authority.
- Committed model change invalidates incompatible execution/drafts.
- Run execution requires exact active identity and current intended options.
- Friendly diagnostics retain code/detail.
- Evidence export requires current qualified evidence and failure is not success.
- H01–H03 presentation is read-only and preserves raw engineering authority/status codes.

## 8. Validation and Evidence Ledger

| Validation | Status | Evidence / limitation |
|---|---|---|
| S7 initial source guards | IMPLEMENTED / SOURCE-INSPECTED | existing check |
| S9 lifecycle/store guards | IMPLEMENTED / SOURCE-INSPECTED | existing check |
| S10 diagnostic guards | IMPLEMENTED / SOURCE-INSPECTED | existing check |
| S11 evidence-export guards | IMPLEMENTED / SOURCE-INSPECTED | existing check |
| S12 GitHub changed-file/base reconciliation | PASS | six files, ahead-only, no workflows |
| Full `npm run check:lfea-workbench` | **NOT_RUN** | no executable checkout in sandbox |
| Browser interaction/presentation | **NOT_RUN** | no browser checkout in sandbox |
| S13 presentation guards | PENDING | after implementation |

## 9. Known Issues / Deferred Scope

### Active
- H01 / ISS-010 analysis settings visibility.
- H02 / ISS-011 authority human labels.
- H03 / ISS-012 preflight human labels.

### Deferred roadmap
- H04 canonical result table columns (note prior audit found displacement rows uniform and mixed raw-stress row schema currently uniform; scope must be grounded before changing generic table behavior).
- H05/H06 and medium/low findings from #1018.
- `IMP-002` full three-surface governed workflow audit.
- restraint/support fidelity including gaps/friction/springs/directional supports.
- `RISK-001` explicitly separate piping beam response, local continuum FEA, and piping-code stress.
- `RISK-002` expose support-reaction sign convention.
- `IMP-001` shared engineering colour authority for comparisons.
- `QST-001` vertical support-triad authoritative fallback axis.

## 10. Recommended Forward Sequence

1. Complete S13 H01–H03 and update report/evidence.
2. S14 reconcile and ground next High item rather than blindly applying issue hints.
3. Prioritize the full three-surface/workflow authority audit before large cosmetic expansion if no more immediate integrity defects emerge.

## 11. Next-Agent Handover

### Current stopping point
C01–C04 are implemented and guarded; Stage 12 reconciliation is complete. Stage 13 pre-record is committed before H01–H03 production changes.

### Start here
- `src/workspace/lfea-workbench-panels.js`: add read-only settings rendering and human mappings using actual codes.
- `src/workspace/lfea-workbench-view.js`: insert settings card.
- `scripts/lfea-p0-ui-containment-check.mjs`: guard card/mappings/raw-code retention.

### Do not redo
C01–C04, N01/N02, no-Worker parity, diagnostic provenance, or evidence-export grounding.

### Known failing checks
None observed. Full repository/browser checks remain NOT_RUN.

### Highest current risk
Misrepresenting a governed profile by guessing a “solver type” or hiding raw authority/status codes. Display only actual committed fields and retain raw codes.

## 12. Process Notes / Lessons Learned

- Synchronous mutation/render ordering matters.
- Durable item IDs prevent discoveries disappearing at handover.
- Source guards and browser/runtime proof are different evidence classes.
- Microtasks are not paint boundaries.
- Execution transport parity includes analysis options.
- Structured codes are routing authority; messages are detail.
- Disabled controls do not replace fail-closed controller/store boundaries.
- Audit fix hints can be stale against current enum/schema reality; ground UI mappings from source first.

## 13. PR Closure / Continuation Record

| Criterion | Current result |
|---|---|
| C01–C04 | IMPLEMENTED + GUARDED |
| Critical-slice reconciliation | COMPLETE |
| H01–H03 | IN_PROGRESS |
| Engineering Item Register synchronized | YES |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows added | **NO** |
| PR status | DRAFT |

Final closure will be rewritten after the active High-priority slice is reconciled.
