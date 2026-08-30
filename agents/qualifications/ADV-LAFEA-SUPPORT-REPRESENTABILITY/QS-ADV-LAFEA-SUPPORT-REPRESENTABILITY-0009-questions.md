# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0009 — HANGER applied-case Run gate

QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0009
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: b2696267b31ecdd43fa227b91893b93efdf486f3
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace

Trace the native intake default `IXP-W` through `requestedCaseIds`, preflight authorization, the Load-case panel's H-aware selected set, and the Run panel's current readiness predicate. Identify how Run can currently execute an authorized non-H case before the user applies the hanger-aware case choice.

Fail if the answer changes intake parsing to infer hanger mechanics, or does not distinguish selected cases from cases already sealed/authorized in preflight.

## Q2 — State reconstruction

Reconstruct four states for a model with H-bearing cases available: (a) initial preflight applied `W`, no explicit Load-case edit; (b) H-aware default displayed but not yet applied; (c) H-aware selection applied; (d) user explicitly selects and applies a non-H comparison case. State Run readiness for each. Also prove a model with no H-bearing cases retains its existing Run readiness behavior.

Fail if all legacy models become newly blocked, or if an explicit non-H comparison selection can never run.

## Q3 — Authority / invariant

Explain why blocking Run on an unapplied hanger-aware case choice is custody enforcement, not numerical authority. The gate may compare available/selected/applied case identities only; it must not derive cold load, spring rate, multiplicity or load vectors.

Fail if Run constructs H loads or silently rewrites requested cases.

## Q4 — Independent validation

Extend the focused HANGER case-selection check to prove: initial hanger `W` state is blocked pending Load-case application; applied H-bearing selection is ready; an explicit applied non-H comparison selection is ready; a changed-but-not-applied explicit selection is blocked; and no-H legacy state remains unchanged. Define deliberate-break mode that disables this custody gate and must fail.

Fail if the check can pass while initial hanger `W` is directly runnable.

## Q5 — Minimal patch / no-patch boundary

Safe files are the case-selection controller's read-only custody gate, Run panel readiness consumption, shared analysis-surface wiring, and the existing focused check. No intake default, physical-case compiler, hanger primitive, solver, BM4 parity, code authority, workflow or roadmap changes are authorized.

PR #1553 remains DRAFT; merge requires exact owner instruction `APPROVED MERGE`.
