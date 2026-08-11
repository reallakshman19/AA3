# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, examples, and handover. All work remains stacked on PR #1021. No GitHub Actions workflow gate is added or modified.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Reconciled S26 head | `925b9e247ddc31c25c8f9949ed6f393a991f2f26` before later report/audit commits |
| PR state | Draft, open, mergeable |
| Current stage | Stage 28 — B31 code-basis and physical-case provenance repair |
| Last completed stage | Stage 27 — piping-code vs local-continuum stress authority audit |
| Engineering status | S27 confirmed calculation-path separation but found downstream B31 presentation/export provenance loss; ISS-023 registered before code |
| Validation status | S27 source audit complete; S28 production/contract/export/view checks pending; executable repository/browser checks remain NOT_RUN |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Extend sealed code presentation rows with explicit code profile and ordered physical source-case provenance, then expose it in B31 table/CSV without changing code equations |

### Handover in 60 seconds

Completed/source-guarded before S27: C01–C04, draft/delete integrity, H01–H03/H05/H06, M01/M04/M06/M08, support-action sign provenance ISS-020/021, and skew unilateral restraint fail-closed ISS-022.

S27 audit result:
- independent LFEA continuum raw stress is explicitly governed as raw element/integration-point authority; projected nodal stress remains non-authoritative review projection and prohibited for convergence;
- B31/code engine is a separate calculation path based on recovered beam actions, sealed section/material resolutions, stress factors, pressure contribution, code profile and edition dataset;
- B31 categories/allowables/utilization are not sourced from the continuum von Mises field;
- main results UI already labels the code table `B31.3 application results`, so direct continuum→code conflation was not found in the calculation path.

**ISS-023 found:** the B31 application retains `codeProfileSemanticHash`, `editionDatasetSemanticHash`, per-check `actionSource`, and case bindings containing `caseId + physicalLoadCaseHash + recoverySemanticHash`. Each code result also retains `codeProfileId`. However `compileLinearPipingPresentation()` currently drops the code-profile ID/full hashes and physical source-case bindings when it creates `codeRows`; B31 CSV exports only category/combination/stress/utilization/governingRuleId/sourceRecoveryHashes/result hashes. A downstream engineering record therefore shows that a B31 calculation occurred but does not explicitly state the full sealed code-basis hashes or which physical case hash(es) generated the action.

This is a provenance/authority defect, not a code-stress formula defect.

## 1. Engineering Invariants

- Local continuum stress, beam response and B31/code stress remain separate engineering authorities.
- B31 calculated stress/utilization must remain linked to the exact sealed code profile and edition dataset used for that result.
- B31 source cases must retain ordered case IDs and physical load-case hashes; a human `combinationId` alone is insufficient provenance.
- For ranges, from/to source-case ordering is engineering meaning and must be preserved.
- Presentation/export may add provenance but must not recalculate code stress, allowable or utilization.
- Support/reaction sign and restraint representability fixes remain unchanged.
- No solver/code-engine formula changes and no CI workflow additions.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001–019 | Critical–Medium | IMPLEMENTED / DEFERRED as previously recorded | Local workbench audit slice |
| ISS-020 | High | IMPLEMENTED + GUARDED | 3D support-action publication/panel lost reporting sign convention |
| ISS-021 | High | IMPLEMENTED + GUARDED | Engineering XLSX omitted/could not verify reporting sign convention |
| ISS-022 | High | IMPLEMENTED + GUARDED | Skew unilateral InputXML direction could be snapped to dominant global DOF |
| **ISS-023** | **High** | **ACCEPTED / S28** | B31 presentation/engineering CSV drops explicit code-basis hashes and physical source-case hashes |
| IMP-001 | High | DEFERRED | Shared colour authority for cross-run comparison |
| IMP-002 | High | ACTIVE AUDIT | Full linear-piping/pre-FEA/workbench authority handoff audit |
| RISK-001 | High | PARTIALLY MATERIALIZED as ISS-023 | Continuum/code authority distinction needs explicit downstream code provenance |
| RISK-002 | High | PARTIALLY MITIGATED | Reaction sign convention visibility downstream |
| RISK-003 | High | MITIGATED FOR CURRENT INPUTXML PATH | Silent restraint semantic simplification |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |

## 3. Decision Log

- **DEC-002:** no new CI workflow gates.
- **DEC-018:** architecture changes are audit-first; no speculative edits.
- **DEC-019–022:** signed support-action provenance is mandatory and cross-checked.
- **DEC-024/025:** skew unilateral source direction blocks approximation rather than being snapped to a global DOF.
- **DEC-027:** do not add/modify code-stress equations during authority audit.
- **DEC-028:** each presentation `codeRow` will add `codeProfileId`, `codeProfileSemanticHash`, `editionDatasetSemanticHash`, ordered `sourceCaseIds`, and ordered `sourcePhysicalLoadCaseHashes`; existing stress/allowable/utilization/result hashes remain unchanged.
- **DEC-029:** source case provenance is derived from the sealed B31 check `actionSource` plus the application `caseBindings`, not guessed from `combinationId` or recovery hashes.
- **DEC-030:** B31 engineering CSV and read-only results table expose the new provenance; audit JSON gains it automatically through the sealed presentation.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S20 | DONE | Local workbench integrity/authority/presentation and reconciliations |
| S21–S23 | DONE | Support-action sign authority audit/repair/reconciliation |
| S24–S26 | DONE | Restraint semantic audit, skew-direction repair, reconciliation |
| S27 | DONE | Continuum-vs-code stress authority audit; ISS-023 registered |
| S28 | IN_PROGRESS | B31 code-basis + physical-case provenance in presentation/UI/export |
| S29 | PLANNED | Reconcile expanded authority slice and decide next source-proven target |

## 5. Stage Execution Log

### Stages 1–26
Complete at documented source/patch evidence level. S26 reconciled head `925b9e247ddc31c25c8f9949ed6f393a991f2f26`: exactly 18 files, 71 commits ahead / 0 behind exact base, merge base unchanged, no workflow paths. Full repository/browser execution remains NOT_RUN.

### Stage 27 — piping-code vs local-continuum stress authority audit
**COMPLETE.**

#### Verified authority separation
- Independent LFEA workbench authority policy distinguishes raw element/integration-point stress from projected non-authoritative nodal review stress.
- B31 engine consumes recovered linear-piping beam actions and sealed code/edition/section/material/factor inputs, computes category-specific B31 calculated stress/allowable/utilization, and never consumes independent continuum `VON_MISES`.
- Code application seals case bindings (`caseId`, physical load-case hash, recovery hash), code profile hash and edition dataset hash.
- Workspace code table is explicitly titled `B31.3 application results`.

#### ISS-023 provenance loss
`codeRows` currently retain check/category/component/code point/combination/calculated stress/allowable/utilization/status/governingRuleId/source recovery hashes/result hashes, but omit:
- `codeResult.codeProfileId`;
- `b31Application.codeProfileSemanticHash`;
- `b31Application.editionDatasetSemanticHash`;
- check `actionSource` case identity;
- corresponding case-binding physical load-case hash(es).

`B31_CODE_RESULTS_CSV` therefore cannot independently state the exact sealed code basis or physical source cases from the row itself.

### Stage 28 — B31 code-basis and physical-case provenance repair
**IN PROGRESS — report updated before production changes.**

Planned files:
- `src/core/linear-piping-presentation/presentation.js`
- `src/core/linear-piping-presentation/contracts.js`
- `src/core/linear-piping-presentation/export.js`
- `src/workspace/linear-piping-results-view.js`
- `scripts/linear-piping-presentation-export-check.mjs`

Planned behavior:
1. derive ordered source case IDs from each B31 check `actionSource` (`SINGLE_CASE` one ID; range from/to two IDs);
2. map those IDs to sealed `b31Application.caseBindings` and retain matching ordered physical-load-case hashes;
3. seal all new fields inside presentation semantic/evidence hashes through the existing presentation contract;
4. B31 CSV adds explicit code profile ID/hash, edition dataset hash, source case IDs and physical hashes;
5. B31 results table shows code profile and source physical cases alongside existing stress/utilization;
6. no code result numerical fields are recomputed or changed.

## 6. Changed-File Ledger

S26 reconciled exactly 18 paths. S28 may add the five existing presentation/view/check paths above; expected cumulative maximum after S28 is 23 changed files, subject to S29 exact reconciliation.

No workflow path is authorized.

## 7. Validation Ledger

| Validation | Status |
|---|---|
| Local workbench/source guards | IMPLEMENTED / SOURCE-INSPECTED |
| Support sign guards | IMPLEMENTED / SOURCE-INSPECTED / NOT_EXECUTED |
| Skew-restraint guard | IMPLEMENTED / SOURCE-INSPECTED / NOT_EXECUTED |
| S26 reconciliation | PASS — 18 files; ahead 71 / behind 0 |
| S27 stress-authority audit | PASS with ISS-023 found |
| S28 presentation/export checks | PENDING |
| Full repository/workbench commands | **NOT_RUN** |
| Browser interaction/presentation | **NOT_RUN** |

## 8. Examples / Edge Cases

- Sustained single case: source case list has one case ID and one physical hash.
- Expansion range: source case IDs/hashes remain ordered `[from, to]`; they are not alphabetically sorted because subtraction direction is physical meaning.
- Two different physical cases may have similar display labels; the physical hash remains the identity authority.
- `combinationId` is presentation identity, not a substitute for source case provenance.
- Continuum von Mises remains separate from B31 stress even after B31 provenance becomes more visible.

## 9. Roadmap

After S28/S29, prioritize a CAESAR/reference correlation suite and remaining source-proven authority gaps. Do not spend the next stage on cosmetic UI unless it affects engineering interpretation.

## 10. Handover

Current stopping point: ISS-023 is registered before code. Implement provenance-only changes through the presentation contract/UI/CSV; do not modify B31 equations, factors, allowables or case-combination math.

## 11. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| ISS-020/021 sign provenance | IMPLEMENTED + GUARDED |
| ISS-022 skew restraint | IMPLEMENTED + GUARDED |
| ISS-023 B31 provenance | IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows | **NO** |
| PR | DRAFT |
