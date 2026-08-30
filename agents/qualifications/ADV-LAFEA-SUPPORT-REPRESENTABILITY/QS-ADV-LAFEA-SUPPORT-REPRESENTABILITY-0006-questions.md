# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0006

QUALIFICATION_PROTOCOL_VERSION: 3
QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0006
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: 6c4adde35f8b9ddbb1256e5aee095e0a2db5b9a7
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — End-to-end support and recovery trace
Trace each landed finite support from retained InputXML evidence through classification, constraint declaration, sealed model identity, global assembly, qualification and result recovery:

1. grounded skew spring: prove `K = k(n⊗n)` and recovered ground reaction `R = -k(n·u)n`;
2. finite CNODE spring: prove `K = k[[nnT,-nnT],[-nnT,nnT]]`, explain why it is internal mechanical connectivity, and prove it is neither a constrained DOF nor a grounded support reaction;
3. predefined HANGER: trace location spring rate independently to `K` and theoretical cold load independently to explicit `+H` load primitives/cases and `F`.

Name the exact files/functions at the first authoritative transition for source, stiffness, load, solver qualification and recovery.

## Q2 — Numerical reconstruction and material exercise
Reconstruct without reference to program output:

- skew fixture `1000 N/mm → 1.0e6 N/m`, `n=(0.6,0.8,0)`, and the three recovered reaction components from a supplied solved displacement;
- CNODE fixture `100000 N/mm → 1.0e8 N/m`, `q=(ui-uj)·n`, endpoint actions `Fi=kqn`, `Fj=-Fi`, and why both endpoint actions cancel in global force equilibrium;
- HANGER `1750 N/mm → 1.75e6 N/m`, `4500 N`, and the count-2 totals `3.5e6 N/m` / `9000 N`.

Identify the non-vacuous exercise quantity for each landed feature: skew vertical ground-reaction share, CNODE internal vertical-force share, and HANGER vertical-reaction share. Each must exceed 10% in its self-authored exercise.

## Q3 — Exactness, mechanism and authority invariants
Prove all of the following:

- `k(n⊗n)` is symmetric rank one and reduces exactly to the legacy scalar spring on X/Y/Z axes;
- a CNODE spring is invariant to common rigid translation and is a mechanical adjacency edge, but does not ground a floating assembly;
- rigid skew and rigid CNODE require exact constraint-equation/MPC authority and remain refused; no penalty stiffness is permitted;
- HANGER cold load belongs to `F`, not `K`, so `ΔR = kΔq` removes preload;
- a self-authored exercise can prove implementation behavior but cannot clear `DRAFT_SPRING_SUPPORT_NO_REFERENCE`.

## Q4 — Validation integrity and deliberate breaks
For every focused check, state the actual execution truth. Do not turn authored tests, source inspection, mergeability, or an Actions run with zero steps into PASS.

Explain the deliberate-break falsifiers:

- unresolved finite spring units must never collapse to FIXED;
- skew scalarization must fail qualification equilibrium;
- dropping CNODE connected-node custody must fail qualification equilibrium;
- hanger multiplicity/rate/preload corruption must fail its focused invariant.

Reproduce BM4_L only as non-regression evidence and keep the frozen targets separate from positive feature evidence: L2 `96.76%`, L5 `93.00%`, L6 `95.82%`, substantial-reference >5% tail `7.99%`.

## Q5 — Landed/deferred/UI/merge boundary
State the exact release matrix:

- finite bidirectional skew spring: landed DRAFT;
- rigid skew: deferred/refused pending MPC;
- finite bidirectional CNODE spring: landed DRAFT;
- rigid CNODE: deferred/refused pending MPC;
- fully predefined positive-rate/positive-cold-load/positive-integer-count Y-vertical HANGER subset: landed DRAFT;
- unresolved/malformed hanger data or alternate vertical-axis authority: fail closed;
- hanger sizing/design: out of scope.

Trace `DRAFT_SPRING_SUPPORT_NO_REFERENCE` through preflight and solved-result presentation custody, and prove the obsolete blanket `INPUTXML_HANGER_PRESENT_NOT_COMPILED` warning is normalized to neutral retained-source evidence on the governed path.

Confirm no reducer mechanics, BM4 parity tuning, Timoshenko formulation, code authority, workflow or roadmap mutation was introduced. Confirm PR #1553 must remain DRAFT and may not be merged unless the owner explicitly states `APPROVED MERGE`.
