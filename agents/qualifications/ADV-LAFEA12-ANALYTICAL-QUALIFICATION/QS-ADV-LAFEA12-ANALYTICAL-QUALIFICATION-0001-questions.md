# QS-ADV-LAFEA12-ANALYTICAL-QUALIFICATION-0001 — takeover qualification questions

QUALIFICATION_PROTOCOL_VERSION: 3
CHAIN_ID: ADV-LAFEA12-ANALYTICAL-QUALIFICATION
QUESTION_SET_ID: QS-ADV-LAFEA12-ANALYTICAL-QUALIFICATION-0001
QUALIFICATION_BASIS_HEAD: 80dcfe8311b7cee367873fe2794ab059a242921b
QUESTION_SET_STATUS: CURRENT
PURPOSE: QUALIFICATION_ONLY
NOT_AN_IMPLEMENTATION_TASK: TRUE
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c

## Q1 — Production trace: analytical authority to publication

Repository anchors:
- `src/core/local-stress/constants.js`
- `src/core/local-attachment-screening/constants.js`
- `src/workspace/lafea-stage-components.js`
- `src/workspace/lafea-stage-composition-root.js`
- `src/workspace/lafea-result-presenters/index.js`
- `src/workspace/lafea-result-presenters/common.js`
- `src/workspace/lafea-analytical-calc-content.js`

Production object/case:
An otherwise accepted `local-attachment-screening-result/v1` presented on the EMP.1.B route.

Required technical work:
Trace `calculateLocalAttachmentScreening` result custody through composition acceptance, `presentLafeaResult`, presenter validation, and `renderLafeaEvidence`. Identify the earliest boundary where an accepted result with the wrong result schema or engineering level is currently not rejected.

Required numerical/technical evidence:
Name the live acceptance predicates and the expected LAFEA.1/LAFEA.2 engineering levels. Distinguish numerical acceptance from publication authority.

First authority/ownership boundaries:
Kernel result schema/engineering level; workspace acceptance; presenter admission; EMP.1 display.

Fail if:
The answer treats disclosure prose as code enforcement, skips the composition root, or proposes changing numerical formulas to fix a presentation-authority defect.

## Q2 — Current unresolved problem: pressure-thrust double counting

Repository anchors:
- `src/core/local-stress/constants.js`
- `src/core/local-attachment-screening/canonical-request.js`
- `src/core/local-attachment-screening/calculate.js`
- `src/core/local-attachment-screening/case-resultants.js`

Calculation/reconstruction:
For a closed-end pressure definition with internal pressure `p`, assessed inner radius `Ri`, outer radius `Ro`, and a mechanical axial resultant `Fx`, derive the axial pressure resultant `Fp = p*pi*Ri^2`, the exact annular area `A = pi*(Ro^2-Ri^2)`, and show the combined axial stress when `Fx` (a) excludes and (b) already includes `Fp`.

Required numerical/technical evidence:
Show explicitly why adding LAFEA.1 closed-end axial pressure stress on top of an `Fx` that already includes `Fp` counts pressure thrust twice.

Predicted intermediate values:
Case (a): `(Fx + Fp)/A` before bending; case (b), if uncorrected: `(Fx + Fp)/A` where the supplied `Fx` already contains `Fp`, yielding one extra `Fp/A`.

First wrong boundary:
Loss/absence of semantic custody for whether incoming axial mechanical resultants include pressure thrust.

Falsifier:
If the live request/result contract already carries and enforces this provenance, the proposed new custody field is unnecessary and must not be added.

Fail if:
The answer claims the duplicate can always be detected from final stress numbers alone, or assumes a piping load-case convention without source evidence.

## Q3 — Authority/invariant: what can and cannot change

Repository anchors:
- `AGENTS.md`
- `docs/OWNER_ROADMAP.md`
- `docs/IntegratedLAFEAroadmap.md`
- issue #1533
- LAFEA.1/.2 constants and result contracts

Required technical work:
Build an authority matrix separating (1) analytical mechanics, (2) independent oracle evidence, (3) request/result semantic custody, (4) presenter/publication authority, and (5) WRC/EMP.1.C local-correlation authority.

Authority/source trace:
Explain why independent textbook/standard equations may qualify existing analytical mechanics without authorizing WRC local-attachment, weld, shell-discontinuity, fatigue, or code-compliance claims.

Protected invariant:
`NO_FEA`, `NO_LOCAL_ATTACHMENT_STRESS`, `NO_WELD_STRESS`, `NO_CODE_COMPLIANCE`, no silent fallback engineering data, source/benchmark/oracle separation, and no Owner-roadmap mutation.

First wrong boundary:
State whether a found discrepancy belongs to mechanics, semantic custody, publication, or external-source evidence before patching.

Falsifier:
Any source or current code proving broader authority requires reclassification and requalification rather than silent scope expansion.

Invalid shortcut:
Changing limitations, labels, benchmark expected values, tolerances, or WRC authority merely to make a failing route pass.

Fail if:
The answer conflates WRC correlation with the LAFEA.1/.2 nominal analytical baseline.

## Q4 — Independent validation: combined nominal stress

Repository anchors:
- `src/core/local-attachment-screening/mechanics.js`
- `src/core/local-attachment-screening/invariants.js`
- `src/core/local-attachment-screening/envelopes.js`
- issue #1533 Q4/Q5

Required technical work:
Using OD 168.3 mm, t 7.11 mm, `Fx=-30 kN`, `My=4.2 kN*m`, `Mz=1.8 kN*m`, `T=0.9 kN*m`, `p=6 MPa`, independently calculate exact annulus A/I/J, the maximum-bending angular direction under the repository sign convention, same-point axial/hoop/radial/torsional stress components at the outer fibre, principal stresses, and 3D von Mises.

Independent oracle:
Closed-form mechanics derived independently of production output; any published source used must record author/publisher/edition/year/page/equation and notation mapping.

Required numerical/technical evidence:
All intermediate section properties, stress components, units, signs, and the invariant calculation.

Units/sign/tolerance:
N, mm, MPa, N*mm; tolerances must be justified from source precision and floating arithmetic rather than copied from production.

Falsifier:
A disagreement that disappears only after changing the oracle to production output invalidates the qualification.

Fail if:
Thin-wall section properties replace exact annulus formulas or production results are used as their own oracle.

## Q5 — Minimal safe patch boundary

Repository anchors:
- `src/core/local-attachment-screening/canonical-request.js`
- `src/core/local-attachment-screening/calculate.js`
- `src/workspace/lafea-stage-components.js`
- `src/workspace/lafea-result-presenters/index.js`
- `src/workspace/lafea-result-presenters/common.js`
- relevant focused checks discovered on the pinned basis

Required technical work:
Define the smallest patch that (a) makes pressure-thrust provenance explicit and fail-closed, and (b) rejects a result whose stage/schema/engineering-level authority does not match its presenter route.

Safe patch boundary:
Request/result custody + stage acceptance/presenter admission + focused UI disclosure only. No LAFEA.3+ solver, WRC correlation numeric, code-stress, benchmark tolerance, workflow, or roadmap mutation.

Expected before/after evidence:
Before: accepted-state predicate can admit authority-mismatched results; pressure-thrust inclusion provenance is absent. After: wrong authority is non-publishable; unknown nonzero closed-end thrust basis is rejected; known includes/excludes cases count pressure exactly once.

Protected unchanged domains:
LAFEA.1 Lamé formulas, load-transfer convention, LAFEA.2 annulus/bending/torsion/invariant formulas unless an independent oracle proves a defect; all FEA stages; WRC correlation authority; Owner roadmap.

Validation required:
Focused positive/negative kernel-contract tests, cross-stage presenter rejection, unknown-thrust rejection, known-thrust single-count cases, existing EMP.1 disclosure regression, repository non-FEA/import/build/diff checks where executable.

Negative test:
Remove or falsify the authority/thrust-basis metadata and prove publication/calculation fails closed rather than defaulting.

Rollback/falsifier boundary:
Rollback if the patch changes nominal mechanics without independent oracle support, permits a missing provenance default, weakens limitations, or causes unrelated FEA/WRC authority drift.

No-patch condition:
If live repository evidence already enforces both semantic boundaries, record the proof and do not duplicate them.

Fail if:
The proposed patch broadens engineering authority or uses UI text alone as the safety boundary.
