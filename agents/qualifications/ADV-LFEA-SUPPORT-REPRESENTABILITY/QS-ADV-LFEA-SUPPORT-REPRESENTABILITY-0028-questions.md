# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0028

QUESTION_SET_ID: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0028
CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_SCOPE_ID: QSCOPE-1551-FINITE-CNODE-SPRING-ASSEMBLY
QUALIFICATION_BASIS_HEAD: e3f6fed9bc20fba4e7c7a0f02f828e81c955d8e6
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
PARENT_QUESTION_SET: QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0027

The original issue #1551 five-question engineering challenge remains the no-downgrade floor. This successor adds exact runtime evidence for finite CNODE spring constitutive/triplet assembly only. Native InputXML preflight, structural declaration/compiler intake, full production solve, BM4 and external CAESAR feature references remain unresolved.

## Q1 — Production trace

Trace a finite directional connected-node spring through the production spring assembly owner. Name the exact functions and files that convert a `LINEAR_SPRING` constraint with `nodeId`, `connectedNodeId`, direction `n` and stiffness `k` into global spring triplets. State exactly where primary and connected translational DOF indices are resolved and where the four signed blocks are generated.

## Q2 — Hand reconstruction

For `k=2000` and `n=[0.6,0.8,0]`, derive `B=k(n⊗n)` by hand and reconstruct the complete two-node translational stiffness contribution `[+B -B; -B +B]`. With `ui=[0.01,-0.02,0]` and `uj=[-0.005,0.005,0]`, derive the relative directional displacement, endpoint actions and strain energy and reconcile them to the observed exact-head execution.

## Q3 — Physical invariant / failure isolation

Prove why the connected spring must be invariant to a common rigid-body translation and must produce equal/opposite endpoint forces. Explain why omitting `connectedNodeId` converts the same directional spring into a ground spring, why that destroys the off-diagonal `-B` blocks, and why the observed `Kij[0,0]: expected -720, got 0` red is the intended failure rather than an incidental test failure.

## Q4 — Authority and refactor audit

Demonstrate that extracting `buildSpringTriplets` from `assembly.js` into `spring-assembly.js` is behavior preserving: identify the unchanged coefficient expression, sign sequence, DOF mapping, stiffness validation and scalar-spring fallback. Explain why this architectural extraction does not authorize changes to solver backend, element assembly, partitioning, recovery, tolerance, rigid-CNODE MPC semantics, BM4 or external-reference policy.

## Q5 — Next contribution / minimal patch

Identify the smallest next gate that advances issue #1551 after CNODE assembly custody. Prefer either the InputXML finite-CNODE classification→structural-declaration/compiler path if its exact closure can be bounded, or the finite skew spring assembly gate which shares the same directional spring owner. Preserve full CNODE production solve/load-share, native refusal preflight, HANGER production mechanics, aggregates/imports/lint/diff, BM4_L and external CAESAR references as NOT_RUN until actually executed.
