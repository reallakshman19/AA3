# QS-ADV-LFEA-SUPPORT-REPRESENTABILITY-0029

CHAIN_ID: ADV-LFEA-SUPPORT-REPRESENTABILITY
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_SCOPE_ID: QSCOPE-1551-FINITE-SKEW-SPRING-ASSEMBLY
QUALIFICATION_BASIS_HEAD: 695aed9899d86eb32e929bf1f2d3cd3d74ea008f
PR: #1553 DRAFT
ISSUE: #1551

The original issue challenges remain controlling. This refresh tests takeover competence for the newly qualified finite-skew spring assembly boundary; it does not imply full InputXML or external-reference qualification.

## Q1 — Production trace

Trace a finite directional skew spring from the retained `LINEAR_SPRING` constraint consumed by `buildSpringTriplets()` through `buildDirectionalSpringTriplets()` and `pushDirectionalBlock()`. Identify the exact production owner and show why a ground skew spring contributes only `B=k(n⊗n)` at the supported node, while a connected CNODE spring contributes `[+B -B; -B +B]`.

## Q2 — Numeric reconstruction

For `k=2000` and `n=[0.6,0.8,0]`, derive by hand:

- `B=[[720,960,0],[960,1280,0],[0,0,0]]`;
- for `u=[0.01,-0.02,0]`, `q=-0.01`, `F=[-12,-16,0]`, and strain energy `0.1`;
- why `[0.008,-0.006,0]` is orthogonal to `n` and must produce zero force/energy.

## Q3 — Failure isolation / authority boundary

Explain why replacing the directional declaration by a scalar `UX` spring is not a harmless approximation: show how the matrix changes from `k(n⊗n)` to a single `Kxx=k`, why the check turns red at `B[0,0]`, and why an exact rigid skew support requires an MPC/constraint equation rather than an arbitrarily large spring rate.

## Q4 — Independent validation

Reconstruct the complete fifteen-file exact closure and reproduce both observed outcomes:

- normal exit 0 with four nonzero directional triplets and the full skew invariants;
- deliberate-break exit 1 at `B[0,0]: expected 720, got 2000`.

State precisely what this proves and what remains NOT_RUN.

## Q5 — Next contribution

Propose the smallest next patch that materially advances #1551 without changing solver formulas, tolerances, recovery, BM4 oracle authority, or external-reference policy. Preference: close upstream support declaration/compiler custody if its full closure can be proven; otherwise target predefined HANGER mechanics or a complete native-preflight refusal path. No partial closure may be promoted as exact runtime evidence.
