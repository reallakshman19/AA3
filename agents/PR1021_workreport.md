# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, examples, and handover. All work remains stacked on PR #1021. No GitHub Actions workflow gate is added or modified.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Review head before closure repair | `b7e64384f4a04f19c1bb4e0e8a282faf1b150043` |
| PR state | Draft, open, mergeable |
| Current stage | Stage 28 closure repair — expose already-sealed B31 provenance in UI and regression checks |
| Last completed stage | Stage 27 — piping-code vs local-continuum stress authority audit |
| Engineering status | Sealed presentation/CSV provenance is implemented; review found the primary results UI and presentation/export regression script did not yet consume/assert it |
| Validation status | Closure repair started after exact-head review; executable repository/browser checks remain NOT_RUN until the final head exists |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Update the read-only B31 results table and existing presentation/export regression script only; then reconcile S29 and execute the declared final-head validation |

### Handover in 60 seconds

Completed/source-guarded before S27: C01–C04, draft/delete integrity, H01–H03/H05/H06, M01/M04/M06/M08, support-action sign provenance ISS-020/021, and skew unilateral restraint fail-closed ISS-022.

S27 audit result:
- independent LFEA continuum raw stress is explicitly governed as raw element/integration-point authority; projected nodal stress remains non-authoritative review projection and prohibited for convergence;
- B31/code engine is a separate calculation path based on recovered beam actions, sealed section/material resolutions, stress factors, pressure contribution, code profile and edition dataset;
- B31 categories/allowables/utilization are not sourced from the continuum von Mises field;
- main results UI already labels the code table `B31.3 application results`, so direct continuum→code conflation was not found in the calculation path.

**ISS-023:** the B31 application retains `codeProfileSemanticHash`, `editionDatasetSemanticHash`, per-check `actionSource`, and case bindings containing `caseId + physicalLoadCaseHash + recoverySemanticHash`. Each code result also retains `codeProfileId`. The branch now seals those fields into presentation `codeRows` and exports them in B31 CSV, but exact-head review found that `linear-piping-results-view.js` still omitted them and the existing presentation/export regression script did not assert them. This closure repair addresses only those downstream consumption/guard gaps.

This is a provenance/authority defect, not a code-stress formula defect.

## 1. Engineering Invariants

- Local continuum stress, beam response and B31/code stress remain separate engineering authorities.
- B31 calculated stress/utilization must remain linked to the exact sealed code profile and edition dataset used for that result.
- B31 source cases must retain ordered case IDs and physical load-case hashes; a human `combinationId` alone is insufficient provenance.
- For ranges, from/to source-case ordering is engineering meaning and must be preserved.
- Presentation/export may add provenance but must not recalculate code stress, allowable or utilization.
- UI must consume sealed presentation provenance; it must not reconstruct source-case authority from display labels or combination IDs.
- Support/reaction sign and restraint representability fixes remain unchanged.
- No solver/code-engine formula changes and no CI workflow additions.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001–019 | Critical–Medium | IMPLEMENTED / DEFERRED as previously recorded | Local workbench audit slice |
| ISS-020 | High | IMPLEMENTED + GUARDED | 3D support-action publication/panel lost reporting sign convention |
| ISS-021 | High | IMPLEMENTED + GUARDED | Engineering XLSX omitted/could not verify reporting sign convention |
| ISS-022 | High | IMPLEMENTED + GUARDED | Skew unilateral InputXML direction could be snapped to dominant global DOF |
| **ISS-023** | **High** | **S28 CLOSURE REPAIR IN_PROGRESS** | B31 provenance is sealed/exported; results UI + regression assertions still need closure |
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
- **DEC-028:** each presentation `codeRow` adds `codeProfileId`, `codeProfileSemanticHash`, `editionDatasetSemanticHash`, ordered `sourceCaseIds`, and ordered `sourcePhysicalLoadCaseHashes`; existing stress/allowable/utilization/result hashes remain unchanged.
- **DEC-029:** source case provenance is derived from the sealed B31 check `actionSource` plus the application `caseBindings`, not guessed from `combinationId` or recovery hashes.
- **DEC-030:** B31 engineering CSV and read-only results table expose the new provenance; audit JSON gains it automatically through the sealed presentation.
- **DEC-031:** the UI renders the already-sealed ordered case/hash pairs and does not sort or recalculate them.
- **DEC-032:** S28 is not complete until the existing regression script asserts presentation, CSV, and rendered-view provenance.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S20 | DONE | Local workbench integrity/authority/presentation and reconciliations |
| S21–S23 | DONE | Support-action sign authority audit/repair/reconciliation |
| S24–S26 | DONE | Restraint semantic audit, skew-direction repair, reconciliation |
| S27 | DONE | Continuum-vs-code stress authority audit; ISS-023 registered |
| S28 | IN_PROGRESS | Close B31 code-basis + physical-case provenance across presentation/UI/export/tests |
| S29 | PLANNED | Exact final-head reconciliation and declared validation before merge |

## 5. Stage Execution Log

### Stages 1–26
Complete at documented source/patch evidence level. S26 reconciled head `925b9e247ddc31c25c8f9949ed6f393a991f2f26`: exactly 18 files, 71 commits ahead / 0 behind exact base, merge base unchanged, no workflow paths. Full repository/browser execution remained NOT_RUN at that stage.

### Stage 27 — piping-code vs local-continuum stress authority audit
**COMPLETE.**

#### Verified authority separation
- Independent LFEA workbench authority policy distinguishes raw element/integration-point stress from projected non-authoritative nodal review stress.
- B31 engine consumes recovered linear-piping beam actions and sealed code/edition/section/material/factor inputs, computes category-specific B31 calculated stress/allowable/utilization, and never consumes independent continuum `VON_MISES`.
- Code application seals case bindings (`caseId`, physical load-case hash, recovery hash), code profile hash and edition dataset hash.
- Workspace code table is explicitly titled `B31.3 application results`.

### Stage 28 — B31 code-basis and physical-case provenance repair
**IN PROGRESS — closure repair recorded before editing UI/test files.**

Already implemented before exact-head review:
1. ordered source case IDs are derived from each sealed B31 check `actionSource`;
2. those IDs map to sealed `b31Application.caseBindings` and retain ordered physical-load-case hashes;
3. all new fields are sealed inside presentation semantic/evidence hashes through the existing presentation contract;
4. B31 CSV exports code profile ID/hash, edition dataset hash, source case IDs and physical hashes;
5. no code result numerical fields are recomputed or changed.

Review-discovered closure gaps to repair now:
- `src/workspace/linear-piping-results-view.js` must show the sealed code profile, code-basis hashes and ordered source case/physical hash pairs;
- `scripts/linear-piping-presentation-export-check.mjs` must assert the presentation fields, CSV columns/values and rendered UI text.

## 6. Changed-File Ledger

At review head `b7e64384f4a04f19c1bb4e0e8a282faf1b150043`, GitHub reported 21 changed paths, 76 commits ahead / 0 behind the authorized base, with unchanged merge base. The two closure files above were not yet changed in the PR at that head. Final counts must be derived from GitHub during S29 rather than assumed.

No workflow path is authorized.

## 7. Validation Ledger

| Validation | Status |
|---|---|
| Local workbench/source guards | IMPLEMENTED / SOURCE-INSPECTED |
| Support sign guards | IMPLEMENTED / exact-head dedicated workflows previously PASS |
| Skew-restraint guard | IMPLEMENTED / SOURCE-INSPECTED |
| Review-head reconciliation | PASS — 21 files; ahead 76 / behind 0 |
| S27 stress-authority audit | PASS with ISS-023 found |
| S28 presentation/export checks | CLOSURE REPAIR IN_PROGRESS |
| Full repository/workbench commands | **NOT_RUN on final head** |
| Browser interaction/presentation | **NOT_RUN on final head** |

## 8. Examples / Edge Cases

- Sustained single case: source case list has one case ID and one physical hash.
- Expansion range: source case IDs/hashes remain ordered `[from, to]`; they are not alphabetically sorted because subtraction direction is physical meaning.
- Two different physical cases may have similar display labels; the physical hash remains the identity authority.
- `combinationId` is presentation identity, not a substitute for source case provenance.
- Continuum von Mises remains separate from B31 stress even after B31 provenance becomes more visible.

## 9. Roadmap

After S28/S29, prioritize a CAESAR/reference correlation suite and remaining source-proven authority gaps. Do not spend the next stage on cosmetic UI unless it affects engineering interpretation.

## 10. Handover

Current stopping point before closure edits: sealed B31 provenance and CSV export are present; expose that sealed provenance in the read-only B31 table, extend the existing regression script, then perform exact final-head S29 validation/reconciliation. Do not modify B31 equations, factors, allowables or case-combination math.

## 11. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| ISS-020/021 sign provenance | IMPLEMENTED + GUARDED |
| ISS-022 skew restraint | IMPLEMENTED + GUARDED |
| ISS-023 B31 provenance | CLOSURE REPAIR IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN on final head** |
| New CI workflows | **NO** |
| PR | DRAFT |
