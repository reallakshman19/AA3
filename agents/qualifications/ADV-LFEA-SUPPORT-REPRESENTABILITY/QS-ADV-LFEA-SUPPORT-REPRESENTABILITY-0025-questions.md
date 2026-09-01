# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0025

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0025
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: a2bb2fbcb44545c6cccba78be4cea5e4d8b3f903
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0024
QUALIFICATION_SCOPE_ID: QSCOPE-1551-CNODE-TOPOLOGY-EXACT-RUNTIME

The original issue #1551 five-question qualification remains the no-downgrade engineering floor. This successor narrows the newly observed evidence to the CNODE topology/mechanism subgate and does not promote the full CNODE production mechanics gate.

## Q1 — Production trace

Trace the exact production topology logic by which a `LINEAR_SPRING` carrying `connectedNodeId` joins two kernel nodes in `connectedComponents()` and is excluded from ground-restraint ownership in `detectFloatingComponents()`. State the exact predicate that distinguishes a CNODE internal spring from an ordinary spring-to-ground.

## Q2 — Current unresolved problem / failure isolation

List the complete fourteen-file exact runtime closure for `lfea-cnode-mechanism-check.mjs`, including the test-head script blob `6e2f4bce61ecc0d42a1c68e19c04e1348817dccc`, and explain the `f8ae425e... -> a2bb2fbc...` comparison that proves the other thirteen dependencies are unchanged. Separately identify what remains unproved: CNODE stiffness assembly, production InputXML solve, >10% load share, rigid-CNODE refusal, BM4 and CAESAR reference parity.

## Q3 — Authority / invariant

State the position-independent CNODE topology invariant: a finite connected-node spring creates mechanical adjacency between its endpoints but contributes no physical ground restraint. Explain why a real ground restraint on either endpoint grounds the whole connected component while the internal spring alone must leave the pair floating.

## Q4 — Independent validation

Reproduce the observed normal PASS and deliberate-break FAIL. The break removes `connectedNodeId` in memory; show why this must split N1/N2 into separate components and identify the exact assertion that turns red. Explain why this falsifier proves the gate is live without altering solver mechanics, tolerances, references, signs or benchmark rows.

## Q5 — Next contribution / minimal patch

State the minimal next promotion target after this topology subgate: either execute a complete exact closure for the dedicated three-feature refusal gate or the finite CNODE production-mechanics check. Preserve rigid CNODE refusal pending exact MPC authority, `DRAFT_SPRING_SUPPORT_NO_REFERENCE`, the frozen BM4_L `96.76 / 93.00 / 95.82 / 7.99%` oracle, external `REF-CNODE-01`, and DRAFT/no-merge authority. Do not expand into reducer, parity-residual or tolerance tuning.
