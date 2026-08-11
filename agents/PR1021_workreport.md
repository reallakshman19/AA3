# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, examples, and handover. All work remains stacked on PR #1021. No GitHub Actions workflow gate is added or modified.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Last reconciled head | `932629b5899d1345ba7ca85a93bc3bf1080d9c1b` at S23; S26 reconciliation pending after ISS-022 repair |
| PR state | Draft |
| Current stage | Stage 26 — cumulative architecture/restraint reconciliation |
| Last completed stage | Stage 25 — skew unilateral direction fail-closed repair |
| Engineering status | Local workbench slice + support-action sign provenance + skew-restraint representability fixes implemented/source-guarded |
| Validation status | S25 source/patch inspection PASS; S26 GitHub reconciliation pending; executable repository/browser checks remain NOT_RUN |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Reconcile the expected 18-file PR, verify ahead-only ancestry/no workflows, then select the next source-proven engineering-authority target |

### Handover in 60 seconds

Implemented/source-guarded before S24:
- C01–C04 critical workbench integrity/run/error/export fixes;
- package/record draft persistence and delete sequencing;
- H01–H03/H05/H06 authority/settings, failure, record-validation and history-warning improvements;
- M01/M04/M06/M08 status, quality-gate ownership, deformation-multiplier and progress clarity;
- ISS-020/021 support-action reporting-sign provenance in 3D panel and engineering XLSX.

S24 verified most nonlinear support states already fail closed: nonzero gap/friction, connecting-node and finite-stiffness InputXML restraints are unsupported/nonlinear; interface ownership prohibits GAP/UNKNOWN/CONFLICT/ONE_WAY/LIFT_OFF/FRICTION/CONTACT/NONLINEAR_SPRING and cross-checks DOF mechanics against the sealed mechanical model.

S24 found **ISS-022**: valid skew unilateral direction cosines could be snapped to the dominant global DOF under the disclosed approximation profile. Example `[0.7071, 0.7071, 0]` could become UX or UY, changing restraint orientation/stiffness physics beyond the declared unilateral→bilateral approximation.

S25 now blocks that condition:
- valid source direction remains valid source data;
- strict profile remains `NONLINEAR_OUT_OF_SCOPE` for unilateral TYPE 14/15;
- approximate profile accepts only already axis-aligned direction vectors within `1e-9`;
- skew vectors become `UNSUPPORTED_BY_GENERIC_SOLVER / MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`;
- axis-aligned +Y remains conditionally approximable as UY FIXED under the pre-existing disclosed limitation;
- gap/friction/connect-node/finite-stiffness behavior is unchanged;
- no arbitrary-direction solver equations were added.

The legacy `solveInputXmlGeneric()` raw-solve entrypoint was verified to always fail closed and direct callers to diagnose→prepare→authorize→solve, so the old helper path was not modified.

## 1. Engineering Invariants

- Unsupported nonlinear restraint behavior never silently becomes fixed/free mechanics.
- A valid source direction is not permission to rotate it to a convenient solver axis.
- Current mechanical constraints are global UX/UY/UZ/RX/RY/RZ; arbitrary-direction constraints are not represented by pretending a skew vector is one of those axes.
- Axis-aligned unilateral behavior may be linearized only under the explicitly disclosed approximation profile.
- Signed support forces carry the exact reporting sign convention and physical load-case provenance.
- Vertical support-action axis degeneracy remains blocked without authoritative secondary axis.
- Local continuum FEA stress is not ASME/B31/CAESAR piping-code stress authority.
- No solver numerical/formulation changes and no CI workflow additions.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001–019 | Critical–Medium | IMPLEMENTED / DEFERRED as previously recorded | Local workbench audit slice |
| ISS-020 | High | IMPLEMENTED + GUARDED | 3D support-action publication/panel lost reporting sign convention |
| ISS-021 | High | IMPLEMENTED + GUARDED | Engineering XLSX omitted/could not verify reporting sign convention |
| ISS-022 | High | IMPLEMENTED + GUARDED | Skew unilateral InputXML direction was approximation-eligible after dominant-axis snapping |
| IMP-001 | High | DEFERRED | Shared colour authority for cross-run comparison |
| IMP-002 | High | ACTIVE AUDIT | Full linear-piping/pre-FEA/workbench authority handoff audit |
| RISK-001 | High | OPEN | Continuum von Mises may be mistaken for piping-code stress |
| RISK-002 | High | PARTIALLY MITIGATED | Reaction sign convention visibility downstream |
| RISK-003 | High | MITIGATED FOR CURRENT INPUTXML PATH | Silent restraint semantic simplification; skew-axis defect repaired, nonlinear cases verified blocked |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |

## 3. Decision Log

- **DEC-002:** no new CI workflow gates.
- **DEC-018:** architecture changes are audit-first; no speculative edits.
- **DEC-019–022:** support-action sign provenance is required, canonical, and cross-checked against current sealed presentation.
- **DEC-023:** representability must be based on actual mechanics, not generic support labels.
- **DEC-024:** unilateral approximation requires normalized direction to be axis-aligned within `1e-9`; otherwise block with `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`.
- **DEC-025:** strict unilateral behavior remains nonlinear-blocked; S25 changes representability only, not source validity or physical unilateral equations.
- **DEC-026:** keep `targetDof` diagnostic/dominant-axis evidence for skew source rows, but block their approximate disposition so the structural compiler cannot consume that projection. This preserves the distinction between valid source direction and unsupported solver representation.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S20 | DONE | Local workbench integrity/authority/presentation and reconciliations |
| S21 | DONE | Focused authority/sign provenance audit |
| S22 | DONE | Support-action sign provenance repair |
| S23 | DONE | 16-file architecture-slice reconciliation |
| S24 | DONE | Restraint/support semantic fidelity audit; ISS-022 registered before code |
| S25 | DONE | Fail closed on skew unilateral direction in approximate linear path |
| S26 | IN_PROGRESS | Reconcile expanded architecture/restraint slice |
| S27 | PLANNED | Ground next source-proven engineering-authority target before code |

## 5. Stage Execution Log

### Stages 1–23
Complete at documented source/patch evidence level. S23 reconciled head `932629b5899d1345ba7ca85a93bc3bf1080d9c1b`: 65 commits ahead / 0 behind exact base, exactly 16 changed files, same merge base, no workflow changes. Full command/browser execution remained NOT_RUN.

### Stage 24 — restraint/support semantic fidelity audit
**COMPLETE.** Verified gap/friction/connect-node/finite-stiffness and interface prohibited states fail closed. Found ISS-022 skew-direction loss in the approximation profile and registered the defect/invariant before code. The legacy raw InputXML solve entrypoint was verified fail-closed and therefore not a reachable bypass requiring modification.

### Stage 25 — skew unilateral direction fail-closed repair
**COMPLETE at source/patch evidence level.**

Changed production file:
- `src/core/linear-piping-analysis-consumer/inputxml-feature-inventory-restraints.js`

Implementation:
- introduced shared `DIRECTION_TOLERANCE = 1e-9` for unit-direction qualification/alignment;
- added `axisAlignedDirection(direction)` on the normalized cosine vector;
- for corrected unilateral TYPE 14/15:
  - invalid/non-unit direction remains `MODEL_RESTRAINT_DIRECTION_INVALID`;
  - strict profile remains `NONLINEAR_OUT_OF_SCOPE / MODEL_RESTRAINT_UNILATERAL_UNSUPPORTED`;
  - skew-but-valid direction now returns approximate `UNSUPPORTED_BY_GENERIC_SOLVER / MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`;
  - axis-aligned direction retains existing `IMPLEMENTED_WITH_DECLARED_APPROXIMATION / GENERIC_APPROX_UNILATERAL_LINEARIZED`.

Changed existing guard:
- `scripts/linear-piping-analysis-consumer-anti-drift-check.mjs`, already part of `check:linear-piping-analysis-consumer`.

Guard evidence added:
- static assertions retain existing gap/friction/connect-node/finite-stiffness blocking and require the new skew limitation/source condition;
- direct classification check proves TYPE 14 `[0,1,0]` targets UY, strict-blocks nonlinear, approximate-accepts disclosed linearization;
- direct classification check proves TYPE 14 `[sqrt(.5),sqrt(.5),0]` remains source-direction valid but approximate-blocks with `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`;
- canonical profile keys `STRICT_INPUTXML_LINEAR_STATIC_V1` and `DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1` are used in the guard.

Patch review confirmed the production delta is limited to approximation representability; no structural compiler, solver, force, spring, gap/friction or source type mutation code changed.

**Execution limitation:** the anti-drift command was not executed in this environment; source/patch evidence only.

### Stage 26 — cumulative architecture/restraint reconciliation
**IN PROGRESS — opened before reconciliation; no production changes planned.**

## 6. Changed-File Ledger — Expected S26

Expected cumulative changed files: prior 16 plus the two S25 paths = **18** total.

1. `agents/PR1021_workreport.md`
2. `scripts/lfea-p0-ui-containment-check.mjs`
3. `scripts/lfea-support-actions-panel-check.mjs`
4. `scripts/lfea-workbench-check.mjs`
5. `scripts/linear-piping-analysis-consumer-anti-drift-check.mjs`
6. `scripts/linear-piping-support-action-xlsx-check.mjs`
7. `scripts/linear-piping-support-actions-publication-check.mjs`
8. `scripts/linear-piping-support-actions-publication-source-guard.mjs`
9. `src/core/linear-piping-analysis-consumer/inputxml-feature-inventory-restraints.js`
10. `src/workspace/lfea-support-actions-panel.js`
11. `src/workspace/lfea-workbench-controller.js`
12. `src/workspace/lfea-workbench-document-store.js`
13. `src/workspace/lfea-workbench-panels.js`
14. `src/workspace/lfea-workbench-run-store.js`
15. `src/workspace/lfea-workbench-styles.js`
16. `src/workspace/lfea-workbench-view.js`
17. `src/workspace/linear-piping-support-action-xlsx.js`
18. `src/workspace/linear-piping-support-actions-publication.js`

No workflow path is authorized.

## 7. Validation Ledger

| Validation | Status |
|---|---|
| Local workbench source/store guards | IMPLEMENTED / SOURCE-INSPECTED |
| Support sign publication/panel/XLSX guards | IMPLEMENTED / SOURCE-INSPECTED / NOT_EXECUTED |
| S23 reconciliation | PASS — 16 files; ahead 65 / behind 0; exact merge base |
| S24 restraint semantic audit | PASS with ISS-022 found |
| S25 production patch inspection | PASS |
| S25 static/direct guard source inspection | PASS / NOT_EXECUTED |
| S26 cumulative reconciliation | IN_PROGRESS |
| Full repository/workbench commands | **NOT_RUN** |
| Browser interaction/presentation | **NOT_RUN** |

## 8. Examples / Edge Cases

- Axis-aligned +Y `[0,1,0]`: strict profile rejects nonlinear unilateral behavior; disclosed approximation may compile UY FIXED after explicit limitation acceptance.
- Skew +Y source direction `[0.7071,0.7071,0]`: source direction is valid, but current solver cannot represent that arbitrary direction; approximate profile blocks instead of snapping to UX/UY.
- Non-unit/incomplete cosine vector remains invalid source direction.
- Nonzero gap/friction, connecting node and finite stiffness remain unsupported/nonlinear as before.
- Negative axis-aligned direction remains axis-aligned; S25 intentionally does not redefine CAESAR type/direction sign semantics without separate source proof.
- Vertical support-action tangent parallel to gravity-up remains axis-degenerate; no arbitrary lateral axis is invented.

## 9. Roadmap

After S26, prioritize source-proven engineering-authority work over cosmetic UI. Highest open candidates:
- RISK-001: clearly separate piping beam response, local continuum FEA stress and piping-code/CAESAR stress in downstream authority/export surfaces;
- further IMP-002 handoff audit for physical load-case provenance and any remaining support semantics;
- CAESAR/reference correlation suite for anchor, guide/line-stop, vertical riser, elbow, branch, loop and directional support.

## 10. Handover

Current stopping point: S25 implementation and source guard are complete; S26 reconciliation is the only active stage. Do not expand S25 into arbitrary-direction solver mechanics. Reconcile first, then open S27 in this report before any new code.

## 11. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| ISS-020/021 sign provenance | IMPLEMENTED + GUARDED |
| ISS-022 skew restraint | IMPLEMENTED + GUARDED |
| S26 reconciliation | IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows | **NO** |
| PR | DRAFT |
