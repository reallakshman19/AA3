# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, examples, and handover. All work remains stacked on PR #1021. No GitHub Actions workflow gate is added or modified.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Authorized base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Review head before closure repair | `b7e64384f4a04f19c1bb4e0e8a282faf1b150043` |
| Closure code head | `f54657db0a76f34e9a0cac1ef187248ecc4e74b6` |
| PR state before owner-directed merge | Draft, open, mergeable |
| Current stage | S29 — closure reconciliation / owner-directed merge handoff |
| Last completed implementation stage | S28 — B31 code-basis and physical-case provenance closure |
| Engineering status | Closure implementation complete; no solver/code-stress equations changed |
| Validation status | Exact-head `main-gate` and relevant support-action workflows PASS at closure code head; full `npm run check:lfea-workbench` and targeted Playwright remain explicitly NOT_RUN because this environment cannot obtain an executable checkout and no existing workflow runs them |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Merge decision | Owner explicitly instructed `fix and merge` after the review findings and validation limitation were disclosed; remaining NOT_RUN items are an accepted residual validation risk, not a PASS |

### Handover in 60 seconds

Completed across PR #1021: C01–C04, draft/delete integrity, H01–H03/H05/H06, M01/M04/M06/M08, support-action sign provenance ISS-020/021, skew unilateral restraint fail-closed ISS-022, and B31 presentation/export/UI provenance ISS-023.

S27 confirmed the engineering-authority separation:
- independent LFEA continuum raw stress is governed as raw element/integration-point authority;
- projected nodal stress remains non-authoritative review projection and is prohibited for convergence;
- B31/code stress is a separate calculation path based on recovered beam actions plus sealed code/edition/section/material/factor inputs;
- B31 categories/allowables/utilization are not sourced from the continuum von Mises field.

S28 closed ISS-023 by retaining the exact sealed code basis and ordered physical source cases through presentation, CSV and the read-only B31 results UI. The UI consumes sealed presentation fields; it does not infer authority from labels or recompute any code quantity.

## 1. Engineering Invariants

- Local continuum stress, beam response and B31/code stress remain separate engineering authorities.
- B31 calculated stress/utilization remains linked to the exact sealed code profile and edition dataset used for that result.
- B31 source cases retain ordered case IDs and physical load-case hashes; `combinationId` alone is not provenance.
- For ranges, from/to source-case ordering is engineering meaning and must be preserved.
- Presentation/export may add provenance but must not recalculate code stress, allowable or utilization.
- UI consumes sealed presentation provenance and must not reconstruct source-case authority from display labels or combination IDs.
- Skew unilateral restraints remain fail-closed rather than being snapped to a dominant global DOF.
- Signed support actions retain and verify their reporting sign convention downstream.
- No solver/code-engine formula changes and no CI workflow additions.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001–019 | Critical–Medium | IMPLEMENTED / DEFERRED as previously recorded | Local workbench audit slice |
| ISS-020 | High | IMPLEMENTED + GUARDED | 3D support-action publication/panel reporting sign convention |
| ISS-021 | High | IMPLEMENTED + GUARDED | Engineering XLSX reporting sign convention custody |
| ISS-022 | High | IMPLEMENTED + GUARDED | Skew unilateral InputXML directions fail closed instead of axis snapping |
| **ISS-023** | **High** | **IMPLEMENTED + GUARDED IN SOURCE** | B31 sealed code-basis + ordered physical source-case provenance retained through presentation, CSV and results UI |
| IMP-001 | High | DEFERRED | Shared colour authority for cross-run comparison |
| IMP-002 | High | ACTIVE AUDIT | Full linear-piping/pre-FEA/workbench authority handoff audit |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |

## 3. Decision Log

- **DEC-002:** no new CI workflow gates.
- **DEC-018:** architecture changes are audit-first; no speculative edits.
- **DEC-019–022:** signed support-action provenance is mandatory and cross-checked.
- **DEC-024/025:** skew unilateral source direction blocks approximation rather than being snapped to a global DOF.
- **DEC-027:** do not add/modify code-stress equations during authority audit.
- **DEC-028:** each presentation `codeRow` carries `codeProfileId`, `codeProfileSemanticHash`, `editionDatasetSemanticHash`, ordered `sourceCaseIds`, and ordered `sourcePhysicalLoadCaseHashes`; existing stress/allowable/utilization/result hashes remain unchanged.
- **DEC-029:** source case provenance derives from sealed B31 `actionSource` plus application `caseBindings`, not from `combinationId` or recovery-hash guesswork.
- **DEC-030:** B31 engineering CSV and read-only results table expose the new provenance; audit JSON retains it automatically through the sealed presentation.
- **DEC-031:** the UI renders already-sealed ordered case/hash pairs and does not sort or recalculate them.
- **DEC-032:** the existing presentation/export regression script asserts presentation fields, CSV columns/values and rendered-view provenance.
- **DEC-033:** validation evidence remains literal: checks not executed are recorded as `NOT_RUN`; owner-directed merge does not convert them to PASS.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S20 | DONE | Local workbench integrity/authority/presentation and reconciliations |
| S21–S23 | DONE | Support-action sign authority audit/repair/reconciliation |
| S24–S26 | DONE | Restraint semantic audit, skew-direction repair, reconciliation |
| S27 | DONE | Continuum-vs-code stress authority audit; ISS-023 registered |
| S28 | DONE | B31 code-basis + ordered physical-case provenance across presentation/UI/export/regression source |
| S29 | DONE WITH DECLARED VALIDATION LIMITATION | Exact closure-code-head reconciliation, CI status review and owner-directed merge handoff |

## 5. Stage Execution Log

### Stages 1–26
Complete at documented source/patch evidence level. S26 reconciled head `925b9e247ddc31c25c8f9949ed6f393a991f2f26`: 18 files, 71 commits ahead / 0 behind exact base, merge base unchanged, no workflow paths. Full repository/browser execution remained NOT_RUN at that stage.

### Stage 27 — piping-code vs local-continuum stress authority audit
**COMPLETE.**

Verified that the B31 engine consumes recovered linear-piping beam actions and sealed code/edition/section/material/factor inputs and does not consume independent continuum `VON_MISES`. The audit found downstream code-basis/source-case provenance loss and registered ISS-023 before code changes.

### Stage 28 — B31 code-basis and physical-case provenance repair
**COMPLETE.**

Implemented behavior:
1. ordered source case IDs derive from each sealed B31 check `actionSource`;
2. case IDs map to sealed `b31Application.caseBindings` and retain matching ordered physical-load-case hashes;
3. all provenance fields are sealed inside presentation semantic/evidence identity through the existing presentation contract;
4. B31 CSV exports code profile ID/hash, edition dataset hash, ordered source case IDs and physical hashes;
5. read-only B31 results table exposes code profile, code-basis hashes and ordered source case/physical hash pairs;
6. `scripts/linear-piping-presentation-export-check.mjs` now asserts presentation, CSV and rendered-view provenance;
7. no code-result numerical fields, solver equations, code-stress equations, factors, allowables or combination math were changed.

Closure commits:
- `b80d7969264a9d48362cabfd08a61caa6d27b84c` — expose sealed B31 provenance in results view;
- `f54657db0a76f34e9a0cac1ef187248ecc4e74b6` — guard B31 provenance through presentation/export/UI regression source.

### Stage 29 — reconciliation and validation disposition
**COMPLETE WITH DECLARED LIMITATION.**

At closure code head `f54657db0a76f34e9a0cac1ef187248ecc4e74b6` GitHub comparison against the authorized base reported:
- status: ahead-only;
- commits ahead: 79;
- commits behind: 0;
- merge base: exactly `751756e9140527b8dc121aa179dc76b7039fb7ad`;
- changed files: exactly 23;
- `.github/workflows/*` changes: none.

Exact-head workflow state at that code head:
- `main-gate`: PASS;
- `lfea-support-actions-publication`: PASS;
- `lfea-support-actions-panel`: PASS;
- `lfea-support-action-xlsx`: PASS;
- `non-fea-input-check-load-calc`: PASS;
- `lfea-linear-core-exact-head`: FAIL at its changed-path containment gate because this broad PR contains files outside that workflow's narrow linear-core slice; it does not establish a product regression;
- `LFEA WP-PF1 exact-head qualification`: existing incompatible scope/ancestry failure for this broad PR, not treated as execution evidence for the repaired UI slice.

Execution limitation:
- direct checkout attempt failed because the execution environment could not resolve `github.com`;
- repository workflow inventory confirms `main-gate` does not execute `npm run check:lfea-workbench` or Playwright;
- no new workflow was added to compensate, per project constraint;
- therefore `npm run check:lfea-workbench`, `e2e/lfea-workbench.spec.js`, and `e2e/linear-piping-results-workspace.spec.js` remain **NOT_RUN**, not PASS.

Owner disposition: after being told these limitations, the owner explicitly instructed `fix and merge`. This is recorded as acceptance of the residual validation risk for this merge, not as engineering qualification evidence.

## 6. Changed-File Ledger

Closure code head has exactly 23 changed paths against the authorized base. They comprise the persistent report, existing LFEA/workbench/source-guard scripts and workspace modules, linear-piping presentation contracts/export, support-action publication/XLSX, the restraint representability fix, plus the two S28 closure files:
- `src/workspace/linear-piping-results-view.js`;
- `scripts/linear-piping-presentation-export-check.mjs`.

No `.github/workflows/*` path is changed.

## 7. Validation Ledger

| Validation | Status |
|---|---|
| Exact-head main gate at closure code head | **PASS** |
| Exact-head support-action publication workflow | **PASS** |
| Exact-head support-action panel workflow | **PASS** |
| Exact-head support-action XLSX workflow | **PASS** |
| Closure-code-head base ancestry / merge base / changed-file reconciliation | **PASS — 23 files; ahead 79 / behind 0** |
| S28 presentation/export/UI regression assertions | **IMPLEMENTED + SOURCE-INSPECTED / NOT_EXECUTED directly** |
| Full `npm run check:lfea-workbench` | **NOT_RUN** |
| `e2e/lfea-workbench.spec.js` | **NOT_RUN** |
| `e2e/linear-piping-results-workspace.spec.js` | **NOT_RUN** |
| New CI workflows | **NO** |
| Owner residual-risk acceptance | **YES — explicit `fix and merge` instruction** |

## 8. Examples / Edge Cases

- Sustained single case: source case list has one case ID and one physical hash.
- Expansion range: source case IDs/hashes remain ordered `[from, to]`; they are not alphabetically sorted because subtraction direction is physical meaning.
- Two different physical cases may have similar display labels; physical load-case hash remains identity authority.
- `combinationId` is presentation identity, not a substitute for source case provenance.
- Continuum von Mises remains separate from B31 stress even after B31 provenance is visible.
- Signed support loads without a recognized reporting sign convention remain fail-closed in the downstream panel/XLSX custody path.

## 9. Roadmap

Post-merge priorities remain a CAESAR/reference correlation suite, the broader linear-piping/pre-FEA/workbench authority handoff, and eventual standalone LFEA separation. Do not convert the present NOT_RUN items into historical PASS in later documentation; execute them on a reproducible checkout if they are needed as qualification evidence.

## 10. Handover

Implementation closure is complete. The remaining gap is execution evidence only: full workbench and targeted Playwright were not runnable through the available environment and no CI workflow was added. Owner accepted that residual risk and directed merge. Future work should preserve the distinction between implementation completeness and qualification evidence.

## 11. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| ISS-020/021 sign provenance | IMPLEMENTED + GUARDED |
| ISS-022 skew restraint | IMPLEMENTED + GUARDED |
| ISS-023 B31 provenance | IMPLEMENTED + GUARDED IN SOURCE |
| Exact-head main/support workflows | PASS at closure code head |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows | **NO** |
| Merge authorization | **OWNER EXPLICITLY AUTHORIZED** |
