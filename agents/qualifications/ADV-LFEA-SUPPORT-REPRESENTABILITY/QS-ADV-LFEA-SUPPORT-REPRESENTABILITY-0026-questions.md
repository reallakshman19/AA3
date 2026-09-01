# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0026

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0026
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: ef275dfea07000b2dd3acaba4c462443c231cade
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0025
QUALIFICATION_SCOPE_ID: QSCOPE-1551-SPRING-RATE-UNIT-RESOLVER

The original issue #1551 five-question qualification remains the no-downgrade engineering floor. This successor adds observed exact runtime only for the named spring-rate conversion/withholding authority; it does not promote the broader structural-compilation unit gate.

## Q1 — Production trace

Trace `springRateToSiFactor(forceDeclaration, lengthUnit)` and `resolveSpringRate(declared, toSiFactor)` in `restraint-spring-rate.js`. Derive the quotient `forceScale / lengthScale` and show how `stiffnessDeclared`, `stiffnessValue` and `stiffnessUnitsResolvable` remain separate facts.

## Q2 — Current unresolved problem / failure isolation

Reconstruct the exact factors N/m=`1`, N/cm=`100`, N/mm=`1000`, lbf/in=`175.12683524647636`, then show `400 N/mm -> 400000 N/m`. Explain why a solver can still balance when the wrong raw value `400 N/m` is used and therefore why reaction/displacement self-consistency alone cannot detect the 1000x defect.

## Q3 — Authority / invariant

State the unit invariant `k_SI = k_declared * forceScale / lengthScale`. Explain why an unresolved quotient is not an SI declaration and therefore the only safe resolved stiffness is `null` while the original declared number remains evidence.

## Q4 — Independent validation

List the two exact Git blobs in the resolver micro-gate and reproduce all three observed executions: normal PASS, raw-rate break FAIL (`400 !== 400000`), and unresolved-fallback break FAIL (`400 !== null`). State why the explicit ESM runtime flag changes module interpretation only and does not alter numerical logic.

## Q5 — Next contribution / minimal patch

Distinguish the now-qualified resolver boundary from the still-unexecuted structural fail-closed path `INPUTXML_STRUCTURAL_SPRING_RATE_UNRESOLVED`. The minimal next unit-related contribution is to execute the broader `lfea-spring-rate-units-check.mjs` only after its full structural-compiler import closure is hash-verified. Preserve all support DRAFT, BM4, CAESAR-reference, reducer/parity and merge-authority boundaries.
