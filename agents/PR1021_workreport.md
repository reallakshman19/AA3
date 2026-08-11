# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This file is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, and handover. All work remains stacked on PR #1021; no CI workflow gates are added.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Reconciled S20 head | `3e85064289849d7abeae07164ff6cc86dabbd9f2` before S20/S21 report commits |
| PR state | Draft |
| Current stage | Stage 22 — support-action sign/provenance authority repair |
| Last completed stage | Stage 21 — focused three-surface authority/handoff audit |
| Engineering status | S21 found two source-proven downstream sign-provenance defects; S22 opened before production changes |
| Validation status | Audit source evidence complete; S22 production/guard validation pending; full repository/browser execution NOT_RUN |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Publish required reporting sign convention through support-action v2 payload, panel and XLSX, then update existing checks/validators without solver changes |

### Handover in 60 seconds

Local workbench C01–C04, N01/N02, H01–H03/H05/H06, M01/M04/M06/M08 remain implemented/source-guarded.

S21 architecture audit evidence:
- Pre-FEA preparation retains requested case identity, `loadCaseSemanticHash`, `physicalLoadCaseHash`, model/stiffness/load state hashes and source/evidence hashes.
- Solve authorization binds preparation/evidence/source/model/stiffness/load identities and authorized physical case IDs; BLOCK cannot be overridden and WARN requires explicit full limitation acceptance.
- Workbench run gate hashes the entire run request and revalidates preparation + authorization immediately before runtime creation.
- Interface recovery retains `physicalLoadCaseHash`, `loadCaseId`, `executionHash`, `analysisResultSemanticHash`, frame hash and per-interface `reportingSignConvention`.
- Main linear-piping presentation retains `reportingSignConvention` in every interface row.

**Defect found after that boundary:**
- `createLinearPipingSupportActionsPublication()` derives sign-sensitive axial/lateral/vertical forces from `result.forceGlobal` but drops `result.reportingSignConvention` from each published action.
- `lfea-support-actions-panel.js` displays signed forces without sign meaning and omits the physical-load-case hash from its visible provenance rows.
- The engineering XLSX path receives a presentation interface row that already contains `reportingSignConvention`, but its support-action input/model/sheets/comments omit it. An engineering-issued signed load therefore lacks explicit “force on pipe” versus “force on interface” meaning.

This is not a solver numerical defect; it is an engineering provenance/interpretation defect downstream of correctly recovered forces.

## 1. Engineering Intent and Invariants

- Imported package authority remains fail-closed.
- UI draft/preview state is not solver authority until explicit commit succeeds.
- Runtime results remain bound to exact model/load/authorization identities.
- Physical load-case ID/hash must survive downstream engineering handoffs.
- Signed interface/support loads must carry the exact reporting sign convention that produced their signs.
- A support-action axis degeneracy remains blocked rather than being filled with false zero transverse forces.
- Main presentation, 3D support-action panel and XLSX must not disagree on sign meaning.
- Local continuum stress remains distinct from piping-code/CAESAR stress authority.
- No solver numerical/formulation changes and no new CI workflows.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001 / C01 | Critical | IMPLEMENTED + GUARDED | Collection-context mock action had whole-package destructive scope |
| ISS-002/004 | High | IMPLEMENTED + GUARDED | Record/package drafts lost on rerender |
| ISS-003 / N02 | Medium | IMPLEMENTED + GUARDED | Delete selection cleared after synchronous mutation/render |
| ISS-006 / C02 | Critical | IMPLEMENTED + GUARDED | No-Worker solve lacked paintable RUNNING boundary |
| ISS-007 | High | IMPLEMENTED + GUARDED | No-Worker path could use stale pipeline options |
| ISS-008 / C03 | High | IMPLEMENTED + GUARDED | Wrapped errors could lose diagnostic code |
| ISS-009 / C04 | Critical | IMPLEMENTED + GUARDED | Evidence-export error escaped controller path |
| ISS-010–012 / H01–H03 | High | IMPLEMENTED + GUARDED | Analysis authority/settings and raw output codes needed safe presentation |
| ISS-013 / H04 | High (audit) | DEFERRED / RE-GROUND | Canonical columns require explicit result schemas |
| ISS-014 / H05 | High | IMPLEMENTED + GUARDED | Invalid record JSON discovered only on submit |
| ISS-015 / H06 | High | IMPLEMENTED + GUARDED | History navigation could discard qualified evidence without warning |
| ISS-016 / M01 | Medium | IMPLEMENTED + GUARDED | Run-state presentation lacked distinctions |
| ISS-017 / M06 | Medium | IMPLEMENTED + GUARDED | Deformation multiplier meaning was dimensionally ambiguous |
| ISS-018 / M08 | Medium | IMPLEMENTED + GUARDED | Progress exposed raw stages as primary text |
| ISS-019 / M04 | Medium | IMPLEMENTED + GUARDED | Quality wording hid upstream geometry gate ownership |
| **ISS-020** | **High** | **ACCEPTED / S22** | 3D support-action publication/panel drops interface reporting sign convention from signed forces |
| **ISS-021** | **High** | **ACCEPTED / S22** | Engineering XLSX omits reporting sign convention although current presentation retains it |
| IMP-001 | High | DEFERRED | Shared colour authority for cross-run comparison |
| IMP-002 | High | ACTIVE / PARTIAL AUDIT | Full linear-piping/pre-FEA/workbench authority handoff audit |
| RISK-001 | High | OPEN | Continuum von Mises may be mistaken for piping-code stress |
| RISK-002 | High | PARTIALLY MATERIALIZED as ISS-020/021 | Reaction sign convention can be lost downstream |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |

## 3. Decision Log

- **DEC-002:** no new CI workflow gates.
- **DEC-005/006:** no-Worker uses a real task/frame yield and exact identity/current options.
- **DEC-014:** deformation multiplier is dimensionless; `1×` = true displacement.
- **DEC-017:** quality display distinguishes upstream validity gates from descriptive metrics.
- **DEC-018:** architecture changes are audit-first; no speculative edits.
- **DEC-019:** support-action sign provenance is required engineering data, not optional UI decoration.
- **DEC-020:** because required publication shape changes, generated support-action event payload moves from `lfea-support-actions-published/v1` to `/v2` rather than silently redefining v1. The canonical allowed sign values remain `FORCE_ON_PIPE_FROM_INTERFACE` and `FORCE_ON_INTERFACE_FROM_PIPE`.
- **DEC-021:** XLSX sign convention is validated against the current presentation interface row and emitted per engineering-action row/comment; it cannot be supplied independently with a conflicting value.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S8 | DONE | Initial report/PR + mock/draft/delete integrity/guards/reconciliation |
| S9–S12 | DONE | C02–C04 + critical reconciliation |
| S13–S16 | DONE | H01–H03/H05/H06 + reconciliation |
| S17–S20 | DONE | M01/M04/M06/M08 + reconciliations |
| S21 | DONE | Focused three-surface authority/handoff audit and defect registration |
| S22 | IN_PROGRESS | Propagate support-action reporting sign convention through publication/panel/XLSX |
| S23 | PLANNED | Reconcile architecture slice and continue restraint/load-case audit if warranted |

## 5. Stage Execution Log

### Stages 1–20
Complete at documented source/patch evidence level. S20 reconciled head `3e85064289849d7abeae07164ff6cc86dabbd9f2`: 54 commits ahead / 0 behind exact base, nine changed files, same merge base, no workflow changes, PR draft. Full command/browser execution remains NOT_RUN.

### Stage 21 — focused three-surface engineering authority/handoff audit
**COMPLETE for the sign/provenance path; broader restraint/code-authority audit remains future scope.**

#### What was verified
- `prepareInputXmlLinearPreFea`: retains parent source/evidence hashes, model/stiffness/load state hashes, requested physical cases, per-case load semantic/physical hashes, findings/limitations and explicit no-runtime boundary.
- `authorizeInputXmlLinearSolve`: BLOCK override prohibited; WARN requires explicit approver + exact complete warnings/limitations; authorization binds parent semantic/evidence/model/stiffness/load identities and case IDs.
- `requireLinearPipingRunGate`: re-hashes complete workbench request and revalidates each preparation/authorization before runtime creation.
- `runLinearPipingWorkbenchAnalysis`: calls governed solve before production InputXML context compilation and retains authorization hashes in runtime evidence.
- `recoverLinearPipingInterfaceLoads`: requires current interface/model/stiffness/load parents; applies declared sign convention; retains load case/hash/execution/result provenance and the sign convention on every result.
- `compileLinearPipingPresentation`: preserves interface-row `reportingSignConvention`.

#### ISS-020 — support-action publication/panel sign loss
`createLinearPipingSupportActionsPublication` uses already sign-adjusted `result.forceGlobal` to derive `fAxial/fLateral/fVertical` but its action payload omits `result.reportingSignConvention`. The event validator cannot require what is absent, and the support panel shows signed loads without sign meaning. Physical load-case hash is retained top-level but also not shown in visible panel provenance.

**Engineering consequence:** +12.5 kN can mean either force on pipe from support or force on support/interface from pipe depending on interface definition. Without the convention, signed support loads are incomplete engineering data.

#### ISS-021 — XLSX sign loss
`compileLinearPipingPresentation` already supplies `interfaceRow.reportingSignConvention`, but `linear-piping-support-action-xlsx.js` neither accepts nor cross-checks it and produces engineering-eligible `Fa/Fl/Fv` columns without sign convention. Its cell provenance comments retain hashes/case/triad but not sign meaning.

**Engineering consequence:** a spreadsheet can be signed off as engineering issue while the direction/sign semantics of the exported support loads are not self-describing.

### Stage 22 — support-action sign/provenance authority repair
**IN PROGRESS — report updated before production changes.**

Planned changes:
1. `linear-piping-support-actions-publication.js`: emit `/v2`; copy each recovered result’s canonical `reportingSignConvention` into the published action.
2. `event-payload-validators.js`: require `/v2` and one of the two canonical sign values for every action.
3. `lfea-support-actions-panel.js`: show human-readable sign meaning + raw code, and show physical load-case hash in provenance.
4. Publication/panel checks and publication source guard: require sign propagation; preserve blocked vertical-axis behavior.
5. `linear-piping-support-action-xlsx.js`: require action sign convention, verify it equals current `presentation.interfaceRows` convention, include a `Reporting Sign Convention` column and provenance comments.
6. XLSX check: prove correct convention exports and mismatched supplied convention fails closed.

Non-goals: no reaction reversal changes, no triad-axis changes, no solver/recovery numerics, no arbitrary vertical fallback axis, no workflow additions.

## 6. Changed-File Ledger

S20 reconciled nine existing PR files. S22 is expected to add modifications to existing repository files outside that prior nine-file set; each must be reconciled after implementation:
- `src/workspace/linear-piping-support-actions-publication.js`
- `src/workspace/event-payload-validators.js`
- `src/workspace/lfea-support-actions-panel.js`
- `src/workspace/linear-piping-support-action-xlsx.js`
- `scripts/linear-piping-support-actions-publication-check.mjs`
- `scripts/linear-piping-support-actions-publication-source-guard.mjs`
- `scripts/lfea-support-actions-panel-check.mjs`
- `scripts/linear-piping-support-action-xlsx-check.mjs`
- plus this report.

No `.github/workflows/*` change is authorized.

## 7. Validation and Evidence Ledger

| Validation | Status |
|---|---|
| Local workbench C/H/M source/store guards | IMPLEMENTED / SOURCE-INSPECTED |
| S20 changed-file/ancestry/workflow reconciliation | PASS |
| S21 sign/provenance audit | PASS — defects ISS-020/021 grounded |
| S22 publication/panel/XLSX source checks | PENDING |
| Full `npm run check:lfea-workbench` | **NOT_RUN** |
| Browser interaction/presentation | **NOT_RUN** |

## 8. Examples / Edge Cases

- Interface definition reports `FORCE_ON_INTERFACE_FROM_PIPE`: recovery reverses solver reaction sign; publication/panel/XLSX must explicitly retain that convention.
- Different interfaces may use different reporting conventions, so sign convention belongs per action/row rather than a single assumed global convention.
- Vertical tangent parallel to gravity-up remains `BLOCKED_AXIS_DEGENERATE`: axial force may be reported, lateral/vertical remain null; sign provenance must still be present for axial force.
- An XLSX action whose supplied sign convention differs from its current presentation interface row must be rejected as stale/inconsistent.
- Physical load-case hash remains provenance distinct from human `loadCaseId`.

## 9. Known Risks / Roadmap

After S22/S23, continue IMP-002 audit for restraint/support semantic fidelity (guides, line stops, directional, gaps, friction, springs), physical case provenance and code-stress authority. RISK-001 remains open. QST-001 remains blocked by lack of authoritative vertical secondary axis; do not choose an arbitrary fallback.

## 10. Recommended Forward Sequence

1. Implement S22 exactly as registered; update this report after the stage.
2. Reconcile changed files/base ancestry/no-workflow constraint in S23.
3. Continue architecture audit only for source-proven engineering defects.
4. Before merge, run missing repository/browser validation on exact final PR head.

## 11. Handover

Current stopping point: S22 opened before production edits. Start with publication schema/sign field, then validator/panel/tests, then XLSX validation/export/tests. Do not alter core recovery sign calculation; it is already explicit and parent-validated.

## 12. Process Notes

- Sign convention is engineering provenance, not cosmetic metadata.
- A hashed recovery can preserve sign internally while downstream human exports still become ambiguous if the convention is dropped.
- Version required payload contracts when adding required engineering meaning.
- Fail closed on mismatched sign provenance rather than trusting caller-supplied text.

## 13. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| S20 reconciliation | COMPLETE |
| S21 audit | COMPLETE for sign/provenance path |
| ISS-020/021 | ACCEPTED for S22 |
| S22 implementation | IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows added | **NO** |
| PR status | DRAFT |
