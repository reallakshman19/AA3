# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This file is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, and handover. All work remains stacked on PR #1021; no CI workflow gates are added.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| Reconciled S23 head | `932629b5899d1345ba7ca85a93bc3bf1080d9c1b` before later report/audit commits |
| PR state | Draft, open, mergeable |
| Current stage | Stage 25 — skew unilateral restraint direction fail-closed repair |
| Last completed stage | Stage 24 — restraint/support semantic fidelity audit |
| Engineering status | S24 found one source-proven directional fidelity defect; nonlinear gap/friction/etc. blocking otherwise verified |
| Validation status | S24 source grounding complete; S25 implementation/guards pending; executable repository/browser validation NOT_RUN |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Block non-axis-aligned unilateral restraint directions in the disclosed approximation profile instead of rotating them to a dominant global DOF; guard both governed and legacy generic paths |

### Handover in 60 seconds

Previously implemented/source-guarded: C01–C04, draft/delete integrity, H01–H03/H05/H06, M01/M04/M06/M08, and downstream support-action sign provenance ISS-020/021.

S24 restraint audit results:
- support-restraint capability classifier retains `GAP`, `SPRING`, `UNKNOWN`, `CONFLICT` states rather than coercing them to RESTRAINED/FREE;
- interface definitions prohibit `GAP`, `CONFLICT`, `UNKNOWN`, `ONE_WAY`, `LIFT_OFF`, `FRICTION`, `CONTACT`, `NONLINEAR_SPRING` and cross-check each DOF behavior/stiffness against the current mechanical model;
- InputXML feature inventory marks nonzero gap/friction as `NONLINEAR_OUT_OF_SCOPE`, connecting-node and finite-stiffness restraint mechanics as unsupported, so those cannot reach the governed structural constraint compiler;
- strict profile accepts only exact anchor mechanics among the currently compiled InputXML restraints;
- disclosed approximation profile permits unilateral corrected TYPE 14/15 only after explicit WARN/limitation acceptance.

**ISS-022 found:** the direction classifier accepts any unit direction-cosine vector, records its single dominant global axis, and the structural compiler emits a global fixed DOF. Therefore a skew vector such as `(0.70710678, 0.70710678, 0)` can become UX or UY. The declared limitation covers unilateral→bilateral linearization, but not skew-axis→global-axis rotation. This changes restraint orientation and stiffness physics.

Safe rule: current global-DOF model may approximate unilateral behavior only when the declared direction is already axis-aligned within a stated numerical tolerance. Valid skew directions must be marked unsupported for the approximation profile until arbitrary-direction constraint mechanics exist.

## 1. Engineering Invariants

- Unsupported nonlinear restraint behavior must never silently become fixed/free mechanics.
- A valid source direction is not permission to rotate it to a convenient solver axis.
- The current mechanical model constraint basis is GLOBAL and only directly represents UX/UY/UZ/RX/RY/RZ.
- Axis-aligned unilateral restraint may be converted to bilateral FIXED only under the explicitly disclosed approximation profile.
- Skew unilateral direction must block rather than be projected/snapped to the dominant global axis.
- Gap/friction/contact/lift-off/one-way mechanics remain explicit nonlinear/out-of-scope unless separately implemented.
- Physical load-case and reaction sign provenance remain first-class authority.
- No solver numerical/formulation changes and no CI workflow additions.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001–019 | Critical–Medium | IMPLEMENTED / DEFERRED as previously recorded | Local workbench audit slice |
| ISS-020 | High | IMPLEMENTED + GUARDED | 3D support-action publication/panel lost reporting sign convention |
| ISS-021 | High | IMPLEMENTED + GUARDED | Engineering XLSX omitted/could not verify reporting sign convention |
| **ISS-022** | **High** | **ACCEPTED / S25** | Skew unilateral InputXML direction can be snapped to dominant global DOF under approximation profile |
| IMP-001 | High | DEFERRED | Shared colour authority for cross-run comparison |
| IMP-002 | High | ACTIVE AUDIT | Full linear-piping/pre-FEA/workbench authority handoff audit |
| RISK-001 | High | OPEN | Continuum von Mises may be mistaken for piping-code stress |
| RISK-002 | High | PARTIALLY MITIGATED | Reaction sign convention visibility downstream |
| RISK-003 | High | MATERIALIZED as ISS-022 for skew direction; other nonlinear states currently blocked | Restraint/support semantic simplification |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |

## 3. Decision Log

- **DEC-002:** no new CI workflow gates.
- **DEC-018:** architecture changes are audit-first; no speculative edits.
- **DEC-019–022:** signed support actions retain/cross-check canonical sign provenance downstream.
- **DEC-023:** distinguish representable linear behaviors from prohibited/nonlinear states; never infer mechanics from generic support labels alone.
- **DEC-024:** a unilateral direction is approximation-eligible only if its normalized cosine vector is axis-aligned within `1e-9`; otherwise approximation disposition is `UNSUPPORTED_BY_GENERIC_SOLVER` with `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`.
- **DEC-025:** strict profile remains nonlinear-blocked for unilateral behavior regardless of direction; S25 changes only approximation representability, not physical unilateral mechanics or solver equations.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1–S20 | DONE | Local workbench integrity/authority/presentation and reconciliations |
| S21 | DONE | Focused authority/sign provenance audit |
| S22 | DONE | Support-action sign provenance repair |
| S23 | DONE | 16-file architecture-slice reconciliation |
| S24 | DONE | Restraint/support semantic fidelity audit + ISS-022 registration |
| S25 | IN_PROGRESS | Fail closed on skew unilateral direction in approximate linear path |
| S26 | PLANNED | Reconcile architecture/restraint slice and decide next authority target |

## 5. Stage Execution Log

### Stages 1–23
Complete at documented source/patch evidence level. S23 reconciled head `932629b5…`: 65 commits ahead / 0 behind exact base, 16 changed files, same merge base, no workflow change. Full command/browser execution remains NOT_RUN.

### Stage 24 — restraint/support semantic fidelity audit
**COMPLETE.**

#### Verified fail-closed behavior
- `inputxml-feature-inventory-restraints.js`: nonzero GAP → `MODEL_RESTRAINT_GAP_UNSUPPORTED`; friction → `MODEL_RESTRAINT_FRICTION_UNSUPPORTED`; connecting node and finite stiffness unsupported by the generic solver.
- strict InputXML linear static profile treats unilateral 14/15 as `NONLINEAR_OUT_OF_SCOPE`.
- `linear-piping-interface/interface-set.js` explicitly prohibits gap/conflict/unknown/one-way/lift-off/friction/contact/nonlinear-spring states and cross-checks representable DOF mappings against the sealed mechanical model.
- model compiler refuses unrepresentable constraint kinds and emits global nodal constraints only from supplied representable declarations.

#### ISS-022 — skew direction loss
`directionOf()` validates only vector completeness/unit magnitude, then chooses `dominantAxis`. For approximate unilateral TYPE 14/15, `restraintDispositions()` treats that as acceptable and `compileInputXmlStructuralConstraints()` emits a global FIXED DOF at that chosen axis. The older `generic-inputxml-solve-model.js` helper contains the same dominant-axis projection pattern.

Example: normalized direction `[0.70710678, 0.70710678, 0]` is a legitimate skew source direction but current mechanics cannot represent a fixed displacement along that arbitrary vector. Snapping it to UX or UY changes the physical boundary condition.

#### Engineering conclusion
Do not add arbitrary-direction solver mechanics in this PR. Block skew vectors in the approximate path, preserve axis-aligned disclosed unilateral linearization, and guard against reintroduction of dominant-axis snapping as silent representability.

### Stage 25 — skew unilateral direction fail-closed repair
**IN PROGRESS — report updated before production changes.**

Planned files:
- `src/core/linear-piping-analysis-consumer/inputxml-feature-inventory-restraints.js`
- governed InputXML representability/pre-FEA check(s) or targeted existing test
- `src/core/linear-piping-analysis-consumer/generic-inputxml-solve-model.js` only if reachable legacy helper must be made fail-closed rather than silently snap
- related existing checks/source guards; no workflow.

Expected behavior:
- axis aligned `[0,1,0]` +Y or `[0,0,1]` +Z: strict BLOCK nonlinear; approximation remains CONDITIONAL and may compile UY/UZ FIXED with existing limitation;
- skew `[sqrt(.5),sqrt(.5),0]`: strict remains nonlinear; approximation becomes unsupported/block with `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED`;
- invalid/non-unit direction retains existing source-invalid behavior;
- gap/friction/finite-stiffness/connect-node behavior unchanged.

## 6. Changed-File Ledger — S23 Reconciled + S25 Expected

S23 reconciled 16 files as previously recorded. S25 may add existing core InputXML restraint source/check files; every new path must be added and reconciled in S26. No workflow path is authorized.

## 7. Validation Ledger

| Validation | Status |
|---|---|
| Local workbench source/store guards | IMPLEMENTED / SOURCE-INSPECTED |
| Support sign publication/panel/XLSX checks | IMPLEMENTED / SOURCE-INSPECTED / NOT_EXECUTED |
| S23 reconciliation | PASS — 16 files; ahead 65 / behind 0; exact merge base |
| S24 restraint semantic audit | PASS with ISS-022 found |
| S25 targeted checks/source guards | PENDING |
| Full repository/workbench commands | **NOT_RUN** |
| Browser interaction/presentation | **NOT_RUN** |

## 8. Edge Cases to Preserve

- Axis-aligned +Y/+Z disclosed approximation remains available when explicitly accepted.
- Skew direction is valid source data but unsupported by current global-DOF constraint mechanics; BLOCK, do not call it invalid and do not rotate it.
- One-way/gap/friction fixed DOF is physically different and remains prohibited unless explicitly approximated by a governed profile.
- UNKNOWN/CONFLICT is not FREE and not FIXED.
- Vertical support-action triad degeneracy remains blocked without authoritative secondary axis.

## 9. Roadmap

After S25/S26, continue IMP-002 only for source-proven engineering issues. RISK-001 piping-code-vs-continuum authority and CAESAR/reference correlation remain higher value than cosmetic UI work.

## 10. Handover

Current stopping point: ISS-022 registered before code. Implement the smallest fail-closed axis-alignment rule and targeted checks; do not add arbitrary-direction constraint equations or change unilateral mechanics.

## 11. PR Continuation Record

| Criterion | Current result |
|---|---|
| Local workbench issue slice | IMPLEMENTED + GUARDED |
| ISS-020/021 sign provenance | IMPLEMENTED + GUARDED |
| S23 reconciliation | COMPLETE |
| S24 restraint audit | COMPLETE — ISS-022 found |
| S25 implementation | IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows | **NO** |
| PR | DRAFT |
