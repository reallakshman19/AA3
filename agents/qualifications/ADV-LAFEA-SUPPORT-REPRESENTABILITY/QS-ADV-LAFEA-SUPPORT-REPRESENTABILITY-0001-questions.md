# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0001

QUALIFICATION_PROTOCOL_VERSION: 3
QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0001
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 7d350c269217f3133e778c09a61b69d2b3909a64
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA
SOURCE_AUTHORITY: Owner-authored issue #1551

## Q1 — Production trace

Trace the exact resolver/declaration/assembly path by which a HANGER spring rate and its cold load reach the global system. Name the existing declaration kind and constraint behavior used for the rate, the load primitive/vector path used for preload, and identify which links pre-existed this chain versus which were added.

Fail if the answer is architectural intent rather than named live functions/files; cannot state whether `PARTIAL_RELEASE_SPRING` or a new kind carries the rate; or treats cold load as a constraint rather than a load.

## Q2 — Failure isolation / exercise proof

Reproduce the frozen BM4_L baseline `96.76 / 93.00 / 95.82` and substantial-reference >5% tail `7.99%` before the change and show them unchanged after. Separately show each landed feature on a model that actually contains it and identify the reaction/load-share quantity proving the support is used rather than merely carried.

Fail if pass-rate and substantial-tail denominators are mixed; BM4_L is used as positive feature evidence; or an exercise support is allowed to sit in an anchor shadow with negligible load share.

## Q3 — Authority / invariant

For each landed leg state the reference-independent constitutive invariant and why it is position-independent. For a skew spring derive `K = k(n⊗n)`, show `f = k(n·u)n`, and prove the axis-aligned reductions exactly recover the existing one-DOF spring. For a compliant CNODE derive the equal-and-opposite two-node relation. State why rigid skew/CNODE may not be faked with penalty stiffness.

Fail if the invariant is position-dependent, off-diagonal skew terms are omitted, a penalty spring is used as an MPC substitute, or parity tolerances/sign/row selection are changed.

## Q4 — Independent validation

Reconstruct every declared spring-rate conversion to SI force/length, including N/mm, N/cm, N/m and lbf/in, and state the fail-closed result when force or length units cannot be resolved. Identify the focused/full-gate PASS and the observed deliberate-break FAIL for every new check.

Fail if any declared rate is passed through raw, unresolved conversion falls back to factor 1 or rigid restraint, or a check is claimed meaningful without an observed red deliberate-break state.

## Q5 — Minimal next contribution / safe boundary

State which of HANGER, compliant CNODE and compliant skew are landed, which rigid/variant cases remain deliberately refused, and the structural/source reason for every deferral. Identify disclosure code/UI treatment for anything shipping without a CAESAR-solved reference, the exact changed-file boundary, rollback/falsifier, and NO-PATCH condition. Confirm reducer mechanics and BM4_L residual tuning remain untouched.

Fail if scope expands into reducer/parity tuning; self-authored fixtures are described as clearing DRAFT; a refusal is removed without exact representation or recorded reason; or an unreferenced feature ships without visible DRAFT disclosure.
