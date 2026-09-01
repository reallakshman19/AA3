# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0002

QUALIFICATION_PROTOCOL_VERSION: 3
QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0002
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 2565e788ca2528b8b01aa1da0dcd24a09e500262
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace
Trace one finite skew InputXML restraint from direction cosines and converted rate through inventory, declaration/model compilation and sparse global stiffness assembly. Name the exact new representation and every existing owner reused.

## Q2 — Numerical reconstruction
For `k = 1000 N/m` and `n = (0.6,0.8,0)`, reconstruct the exact 3x3 spring block, its nonzero eigenvalue/rank, and the force for `u = (0.01,-0.02,0)m`. Identify the first wrong boundary if off-diagonal terms are absent.

## Q3 — Invariant / authority
Prove `K=k(n⊗n)` is symmetric PSD rank 1, `f=k(n·u)n`, and `U=0.5k(n·u)^2`. Show exact X/Y/Z axis reduction to the pre-existing single-DOF `LINEAR_SPRING`. Explain why rigid skew remains refused rather than penalty-stiffened.

## Q4 — Independent validation
Show the self-authored exercise invariant and load-participation guard, plus the deliberate-break failure obtained by removing/corrupting an off-diagonal term. Confirm the fixture remains DRAFT and is not a CAESAR reference.

## Q5 — Minimal patch boundary
Name exact production/test files changed for finite skew support, unchanged protected domains, rollback boundary, and NO-PATCH condition if the current model/compiler contract cannot carry the direction without broader authority change. State the precise retained refusal for rigid skew.
