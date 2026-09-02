# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0020

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0020
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: c30bb734db2727a2651fb5f8ccc3bd3528915655
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0019

The original issue #1551 qualification remains controlling. This successor adds mixed-support reaction and one-way support review custody established through EP-0020.

## Q1 — Raw reaction decomposition

Trace how a valid node can retain both a constrained reaction and one or more grounded directional-spring reaction components on the same global DOF. Explain why raw execution evidence may remain decomposed while node-level Output must present the algebraic total.

## Q2 — One-way support action isolation

For a linearized one-way support sharing a DOF with a grounded directional spring, prove why using either the last raw row or the algebraic total directly is wrong for the lift-off test. Derive the isolated one-way support reaction from retained reaction total and the exact spring action `-k(n·u)n`.

## Q3 — Production ownership

Trace the mixed-support reaction path through `solve.js`, `lfea-pipeline-analysis-controller.js`, `inputxml-linear-unilateral-restraint-review.js`, `lfea-pipeline-results-view-model.js`, Results and Export. Identify which boundary preserves decomposed evidence, which boundary aggregates display values, and which boundary isolates a one-way support action.

## Q4 — Fail-closed controls

Explain the behavior when mixed-support displacement evidence is missing, the ordinary unilateral-only compatibility path, and the deliberate-break controls for unilateral review and visible reaction aggregation. State current validation truth without converting `NOT_RUN_RUNTIME` to PASS or FAIL.

## Q5 — Promotion gate

State the remaining exact-head execution order, frozen BM4_L values, three independent CAESAR support-reference packages, rigid skew/CNODE MPC boundary, DRAFT spring-reference rule, and exact merge-authority phrase.
