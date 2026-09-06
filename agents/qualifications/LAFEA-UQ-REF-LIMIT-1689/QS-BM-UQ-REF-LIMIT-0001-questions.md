# Qualification questions — QS-BM-UQ-REF-LIMIT-0001

QUALIFICATION_SCOPE_ID: QSCOPE-1689-LAFEA-UQ-REFERENCE-GAUSSIAN-LIMIT-STATE
QUESTION_SET_ID: QS-BM-UQ-REF-LIMIT-0001
QUESTION_SET_STATUS: CURRENT
ISSUE: 1689
PARENT_ISSUE: 1673
DEPENDENCY_ISSUE: 1685
DEPENDENCY_PR: 1686

## Q1 — Statistical/reliability trace

Trace the complete reference path:

`frozen R,S distributions + dependency/order -> sampled primitives -> g=R-S -> failure indicator(g<=0) -> Pf estimator -> beta=-Phi^-1(Pf) -> analytical oracle comparison`.

Required analytical reconstruction:
- `R ~ N(120,10^2)`;
- `S ~ N(80,8^2)`;
- synthetic reference independence only;
- `g ~ N(40,164)`;
- `sigma_g = 12.806248474865697`;
- `beta = 3.1234752377721215`;
- `Pf = 0.0008936445184936082`.

Show that no production FEA result, production stochastic population, production code target, or observed sample output creates the oracle.

## Q2 — Failure isolation

If the reference result disagrees with the oracle, isolate in this order:
1. frozen definition/oracle transcription;
2. variable identity/order/dependency binding;
3. PRNG and normal-transform replay;
4. primitive sampling;
5. limit-state sign/event evaluation;
6. failure counting/Pf estimator;
7. inverse-normal transform;
8. finite-sampling/rare-event resolution.

Do not change an analytical oracle, solver benchmark tolerance, production output, or reliability target to make a failing result pass.

## Q3 — Authority / invariants

Only isolated reference authority may be granted. Preserve simultaneously:
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic source count `0` unless separately authorized by #1673;
- production Pf/beta target authority `NONE`;
- no code/consequence-class qualification;
- no assumption that unsourced production resistance/load variables are independent;
- no B03 activation;
- release/temperature authority false.

The numerical `beta` and `Pf` in this question set are synthetic oracle values, not design targets.

## Q4 — Independent validation / falsifiers

Required checks once material is authorized:
- exact `mu_g=40`, `var_g=164` reconstruction;
- analytical `beta=3.1234752377721215` and `Pf=0.0008936445184936082`;
- same-seed exact replay;
- different-seed stochastic-summary divergence;
- deterministic zero-variance propagation without invented scatter;
- reliability metric marked NOT_APPLICABLE or rejected where degenerate prerequisites are not met;
- consistent variable permutation leaves semantics/statistics invariant;
- inconsistent order fails closed;
- invalid distribution/sample-plan cases fail closed with structured code/path;
- sampled Pf acceptance accounts explicitly for finite event-count uncertainty and does not claim unsupported precision.

Falsifier: expected Pf/beta generated from the same samples or production FEA output under test is not independent validation.

## Q5 — Minimal patch / dependency gate

Dependency #1686 is PASS-validated at `d06138a29a5ba97ff1f2a1811eb1d4fa94c33ba8` but unmerged at this prework endpoint.

Therefore this progression may retain only issue/chain/Q1-Q5 custody. It may not duplicate or fork the covariance/normal implementation.

Material work requires either:
1. #1686 merged, followed by branch update/rebase from new main; or
2. explicit Owner authority for an intentionally stacked dependent PR, with no merge before #1686.

After dependency resolution, a fresh recognized Owner progression may authorize one material leg limited to:
- frozen limit-state reference case/plan/oracle;
- narrowly scoped reference reliability utility/checker;
- zero-variance/permutation/negative fixtures;
- chain/receipt custody.

No production UQ registry, solver, mesh, recovery, benchmark sequencing, production oracle/tolerance, roadmap, release, or temperature mutation is authorized.
