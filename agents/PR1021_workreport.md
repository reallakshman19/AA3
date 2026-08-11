# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This file is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, and handover. All work remains stacked on PR #1021; no CI workflow gates are added.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Last reconciled head | `3e85064289849d7abeae07164ff6cc86dabbd9f2` at S20; S23 reconciliation pending after architecture slice |
| PR state | Draft |
| Current stage | Stage 23 — architecture-slice reconciliation |
| Last completed stage | Stage 22 — support-action sign/provenance authority repair |
| Engineering status | ISS-020/021 implemented/source-guarded without solver/recovery numerical changes |
| Validation status | S22 source/patch inspection complete; S23 changed-file/ancestry reconciliation pending; executable repo/browser checks remain NOT_RUN |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Reconcile 16-file cumulative PR, verify ahead-only ancestry/no workflows, then decide whether to continue support/restraint semantic audit |

### Handover in 60 seconds

Implemented/source-guarded before S21: local workbench C01–C04, N01/N02, H01–H03/H05/H06, M01/M04/M06/M08.

S21 verified the upstream authority chain is substantially fail-closed: pre-FEA preparation retains source/model/stiffness/load/case hashes; authorization binds those identities and blocks override; workbench run gate re-hashes the full request immediately before solve; interface recovery retains physical load case, execution/result hashes and per-interface sign convention; main presentation retains that sign convention.

S21 then found two downstream provenance defects:
- **ISS-020:** 3D support-action publication/panel dropped the recovered sign convention before displaying signed axial/lateral/vertical loads.
- **ISS-021:** engineering XLSX omitted reporting sign convention although the current presentation interface row already retained it.

S22 fixes:
- publication action now carries `reportingSignConvention: result.reportingSignConvention` per interface/action;
- publication remains additive `lfea-support-actions-published/v1` for compatibility; no core sign semantics changed;
- support panel recognizes only the two canonical meanings, displays human + raw sign convention and physical-load-case hash, and **fails closed without showing signed loads** if the convention is missing/unknown;
- publication check/source guard prove sign propagation and retain vertical-axis blocking behavior;
- XLSX imports canonical `INTERFACE_SIGN_CONVENTIONS`, requires action convention, cross-checks it against the current presentation interface row, rejects unknown/opposite convention, emits a visible `Reporting Sign Convention` column and includes it in every force-cell provenance comment;
- engineering/audit sheets still retain load case, physical case hash, analysis/execution/recovery/triad hashes and export eligibility.

No reaction signs were recalculated, no forces reversed, no triad axes changed, no arbitrary vertical fallback was added.

## 1. Engineering Intent and Invariants

- Imported and runtime engineering authority remains fail-closed and hash/version bound.
- Signed interface/support forces are incomplete engineering data without their reporting sign convention.
- Physical load-case identity/hash remains distinct from human load-case label.
- A downstream export may not accept caller-supplied sign semantics that disagree with the current sealed presentation.
- Axis degeneracy remains explicit: axial may survive; unresolved lateral/vertical remain null, never fake zero.
- Local continuum FEA remains distinct from piping-code/CAESAR stress authority.
- No solver numerical/formulation changes and no new CI workflow gates.

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
| **ISS-020** | **High** | **IMPLEMENTED + GUARDED** | 3D support-action publication/panel lost reporting sign convention |
| **ISS-021** | **High** | **IMPLEMENTED + GUARDED** | Engineering XLSX omitted/could not verify reporting sign convention |
| IMP-001 | High | DEFERRED | Shared colour authority for cross-run comparison |
| IMP-002 | High | ACTIVE / PARTIAL AUDIT | Full linear-piping/pre-FEA/workbench authority handoff audit |
| RISK-001 | High | OPEN | Continuum von Mises may be mistaken for piping-code stress |
| RISK-002 | High | PARTIALLY MITIGATED by ISS-020/021 | Reaction sign convention visibility downstream |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |

## 3. Decision Log

- **DEC-002:** no new CI workflow gates.
- **DEC-018:** architecture changes are audit-first; no speculative edits.
- **DEC-019:** support-action sign provenance is required engineering data, not UI decoration.
- **DEC-020 (final):** keep `lfea-support-actions-published/v1` additively compatible. The controlled producer now always emits per-action sign convention; the panel refuses to display signed loads if old/malformed payloads lack recognized provenance. This avoids silently redefining force values or forcing a broad event-contract migration.
- **DEC-021:** XLSX convention is validated against the current presentation interface row and exported per row/comment; conflicting caller input fails closed.
- **DEC-022:** XLSX validation imports `INTERFACE_SIGN_CONVENTIONS` from the core interface package rather than duplicating allowed sign values.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S20 | DONE | Local workbench integrity/authority/presentation + cumulative reconciliations |
| S21 | DONE | Focused three-surface authority/handoff audit and sign-defect registration |
| S22 | DONE | Propagate support-action sign convention through publication/panel/XLSX |
| S23 | IN_PROGRESS | Reconcile architecture slice, changed files, ancestry and workflow constraint |
| S24 | PLANNED | Continue restraint/support semantic audit only if source evidence justifies code |

## 5. Stage Execution Log

### Stages 1–20
Complete at documented source/patch evidence level. S20 reconciled `3e850642…`: 54 commits ahead / 0 behind exact base, nine changed files, merge base unchanged, no workflow changes, PR draft. Full command/browser execution remains NOT_RUN.

### Stage 21 — focused authority/handoff audit
**COMPLETE for sign/provenance path.** Verified pre-FEA/authorization/run-gate/interface recovery/main presentation retain model/load/case/sign authority through the governed chain. Found sign convention was lost only in downstream support publication/panel and engineering XLSX; registered ISS-020/021 before coding.

### Stage 22 — support-action sign/provenance authority repair
**COMPLETE at source/patch evidence level.**

#### Publication / panel
- `linear-piping-support-actions-publication.js` adds each recovered result’s `reportingSignConvention` to the derived action next to `loadCaseId` and recovery/triad hashes.
- Existing `/v1` schema is retained as an additive producer change.
- `lfea-support-actions-panel.js` maps the two canonical conventions to human meanings while displaying the raw code.
- Panel provenance now includes physical-load-case hash.
- Missing/unknown convention returns STALE with zero signed-force rows, preventing ambiguous load use.
- Degenerate vertical action still shows axial only; lateral/vertical remain blocked/null.

#### XLSX
- `linear-piping-support-action-xlsx.js` imports the core `INTERFACE_SIGN_CONVENTIONS` authority.
- Each action must supply a recognized convention and it must equal the current `presentation.interfaceRows` value for the same interface/load case.
- Invalid code → `PIPING_SUPPORT_ACTION_XLSX_SIGN_CONVENTION_INVALID`.
- Recognized-but-opposite current sign → `PIPING_SUPPORT_ACTION_XLSX_SIGN_CONVENTION_STALE`.
- Engineering/Audit sheets add `Reporting Sign Convention` before force columns.
- Force-cell comments include reporting sign alongside physical load case and analysis/execution/recovery/triad provenance.
- Cover states that signed force convention is per action row and must match the current interface presentation.

#### Checks updated
- `linear-piping-support-actions-publication-check.mjs`
- `linear-piping-support-actions-publication-source-guard.mjs`
- `lfea-support-actions-panel-check.mjs`
- `linear-piping-support-action-xlsx-check.mjs`

Patch inspection verified shifted XLSX column/comment indexes and both invalid/opposite-sign fail-closed cases. These scripts were **not executed** in this environment.

### Stage 23 — architecture-slice reconciliation
**IN PROGRESS — opened before reconciliation; no production edits planned.**

## 6. Changed-File Ledger

Expected cumulative changed files now total 16:
1. `agents/PR1021_workreport.md`
2. `scripts/lfea-p0-ui-containment-check.mjs`
3. `scripts/lfea-support-actions-panel-check.mjs`
4. `scripts/lfea-workbench-check.mjs`
5. `scripts/linear-piping-support-action-xlsx-check.mjs`
6. `scripts/linear-piping-support-actions-publication-check.mjs`
7. `scripts/linear-piping-support-actions-publication-source-guard.mjs`
8. `src/workspace/lfea-support-actions-panel.js`
9. `src/workspace/lfea-workbench-controller.js`
10. `src/workspace/lfea-workbench-document-store.js`
11. `src/workspace/lfea-workbench-panels.js`
12. `src/workspace/lfea-workbench-run-store.js`
13. `src/workspace/lfea-workbench-styles.js`
14. `src/workspace/lfea-workbench-view.js`
15. `src/workspace/linear-piping-support-action-xlsx.js`
16. `src/workspace/linear-piping-support-actions-publication.js`

`event-payload-validators.js` was deliberately **not changed**: additive `/v1` producer compatibility remains, while the consuming panel fails closed if sign provenance is unavailable.

## 7. Validation and Evidence Ledger

| Validation | Status |
|---|---|
| Local workbench C/H/M source/store guards | IMPLEMENTED / SOURCE-INSPECTED |
| S20 changed-file/ancestry/workflow reconciliation | PASS |
| S21 sign/provenance audit | PASS |
| S22 production patch inspection | PASS |
| S22 check/source-guard updates | IMPLEMENTED / NOT_EXECUTED |
| S23 cumulative reconciliation | IN_PROGRESS |
| Full `npm run check:lfea-workbench` | **NOT_RUN** |
| Browser interaction/presentation | **NOT_RUN** |

## 8. Examples / Edge Cases

- `FORCE_ON_INTERFACE_FROM_PIPE`: publication retains this exact code; panel shows “Force on interface from pipe”; XLSX row/comment carries the same value.
- A valid but opposite convention submitted to XLSX is rejected even if all hashes otherwise match.
- Missing/unknown panel sign provenance suppresses signed load rows instead of guessing.
- Different interfaces may legitimately carry different reporting conventions, so sign remains per action/row.
- Physical load-case hash remains visible provenance distinct from `loadCaseId`.
- Vertical tangent parallel to gravity-up remains `BLOCKED_AXIS_DEGENERATE`; no false zero transverse load is created.

## 9. Known Risks / Roadmap

Continue IMP-002 after S23 for support/restraint semantic fidelity: guides, line stops, directional constraints, gaps, friction, constant/variable springs and unsupported nonlinear states. RISK-001 remains open. QST-001 remains blocked by lack of authoritative vertical secondary axis; never select an arbitrary fallback.

## 10. Recommended Forward Sequence

1. Complete S23 16-file reconciliation, ancestry and no-workflow proof.
2. Open S24 in this report before further architecture source/code work.
3. Audit restraint/support representability and any silent simplification into fixed UX/UY or linearized behavior.
4. Implement only source-proven engineering defects.
5. Before merge, run missing repository/browser validation on exact final PR head.

## 11. Handover

S22 is complete at source/patch level. S23 is reconciliation-only. Do not alter core reaction recovery sign calculation: it was already correct and provenance-bound. The next technical target after reconciliation is restraint/support semantic fidelity, not more sign arithmetic.

## 12. Process Notes

- Signed loads without sign convention are incomplete engineering data.
- Additive producer provenance plus consumer fail-closed behavior can preserve compatibility without weakening current generated data.
- Engineering exports must cross-check sign semantics against sealed presentation, not trust caller input.
- Canonical domain constants should be imported rather than duplicated downstream.

## 13. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| S21 audit | COMPLETE for sign/provenance path |
| ISS-020/021 | IMPLEMENTED + GUARDED |
| S23 reconciliation | IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows added | **NO** |
| PR status | DRAFT |
