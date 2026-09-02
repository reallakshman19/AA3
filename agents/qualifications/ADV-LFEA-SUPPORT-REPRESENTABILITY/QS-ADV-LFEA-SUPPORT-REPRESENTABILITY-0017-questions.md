# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0017 — support mechanics and result-custody qualification

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0017
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 91933251699971df49a1b00bca9cad0b820bc599
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace: predefined HANGER

Trace the exact current production path for a predefined HANGER from retained InputXML attributes through the predefined-hanger resolver, structural declaration/model compilation and solver assembly for spring rate, and separately through HANGER preload creation and explicit `+H` physical load cases for theoretical cold load.

Name the exact declaration kind/constraint behavior that carries rate into `K`, and the exact load primitive that carries cold preload into `F`. State why hanger sizing/design is not LFEA authority and why unsupported vertical-axis authority fails closed.

Fail if cold load is described as stiffness, if rate/preload are silently combined, if a raw rate bypasses unit conversion, or if the answer claims hanger design authority.

## Q2 — Feature exercise and frozen non-regression

State separately the positive exercise invariant for finite skew, finite CNODE and predefined HANGER, and the retained named refusal for rigid skew, rigid CNODE and incomplete/unresolved HANGER. Explain why the self-authored fixtures prove mechanism participation but cannot clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE`.

Then state the frozen BM4_L non-regression target `96.76 / 93.00 / 95.82` with substantial-reference >5% tail `7.99%`, and explain why BM4_L is not positive support evidence.

Fail if BM4_L is offered as support qualification, a self-authored fixture is treated as an external reference, or exact-head NOT_RUN evidence is promoted to PASS.

## Q3 — Mechanical invariants and authority boundaries

For finite skew, derive `K_s = k(n⊗n)` and show the exact X/Y/Z axis-aligned reduction. For finite CNODE, derive `q = n·(u_i-u_j)` and the two-node block `k[[nnT,-nnT],[-nnT,nnT]]`, including equal/opposite internal actions and common-translation invariance.

State why rigid skew/CNODE remain MPC-gated and why penalty stiffness, dominant-axis projection and grounded reclassification are prohibited.

Fail if CNODE is counted as an external ground reaction, if a rigid constraint is faked by stiffness, or if parity tolerances/signs/row selection are changed to compensate.

## Q4 — Fail-closed result custody and runtime truth

Trace a solver execution with `status === BLOCKED` through all four current boundaries:

1. normal `runLinearPipingAnalysis()` orchestration;
2. B-3.4 recovery input binding;
3. retained B-3.3/B-3.4 result composition;
4. public result relationship validation.

Name the current refusal codes. Explain the EP-0017 classification correction: before the new retained/result guards, a valid BLOCKED execution still could not produce a valid recovery because B-3.4 already refused BLOCKED and recovery status only accepts QUALIFIED/CONDITIONAL. The EP-0017 change is earlier deterministic defense-in-depth, not evidence of a previously exploitable numerical bypass.

Then state the exact current hosted-runner evidence: workflow `33305952219`, deterministic job `99242435910` with no steps, dependent BM4 job `99242439948` skipped. Classify all unexecuted gates correctly.

Fail if `steps=null` is called engineering FAIL/PASS, or if the new deliberate-break mode is claimed observed red when it is only authored.

## Q5 — Mixed fixed + directional spring reaction custody / next contribution

Trace how current solver reaction output is formed from constrained residual reactions plus `groundedSpringReactions()`. Explain why a directional spring may legally coexist with a translational FIXED restraint at the same node, why the execution contract currently does not impose unique `nodeId:dof` reaction rows, and why `generic-inputxml-solve-case.js::nodalResult()` using `.find()` creates a potential order-sensitive consumer if duplicate rows occur.

Prove that the retained `SkewSpringSupports.xml` fixture does not exercise this mixed case. Define the minimal next exercise needed to decide between aggregated public reaction rows and an explicit decomposed reaction representation without changing semantics first.

Conclude with the current promotion state for finite skew, finite CNODE, predefined HANGER, rigid MPC deferrals, external CAESAR references, BM4_L, DRAFT disclosure and PR merge authority.

Fail if reaction semantics are changed without exercising the mixed case, if duplicate-row risk is called a proven numerical defect without execution evidence, if DRAFT is cleared without external CAESAR support references, or if merge is authorized without exact Owner phrase `APPROVED MERGE`.
