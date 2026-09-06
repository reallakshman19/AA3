# Qualification questions — QS-BM-UQ-REF-SENS-0001

QUALIFICATION_SCOPE_ID: QSCOPE-1692-LAFEA-UQ-REFERENCE-SENSITIVITY
QUESTION_SET_ID: QS-BM-UQ-REF-SENS-0001
QUESTION_SET_STATUS: CURRENT
ISSUE: 1692
PARENT_ISSUE: 1673
DEPENDENCY_ISSUE: 1689
DEPENDENCY_PR: 1691
QUESTION_DISPLAY: SHOW

## Q1 — Statistical/sensitivity trace

Trace the complete reference path:

`frozen synthetic distributions + variable IDs/order -> model evaluation -> Morris design -> elementary effects -> mu/mu*/sigma -> Sobol A/B/AB_i sampling -> first/total estimators -> analytical oracle comparison`.

Frozen additive reference:
- `X1,X2,X3 ~ U(-1,1)` independent synthetic variables;
- `Y=X1+2X2+4X3`;
- `Var(Y)=7`;
- Morris `mu*=[1,2,4]`, `sigma=[0,0,0]`, ranking `X3>X2>X1`;
- Sobol `S=ST=[1/21,4/21,16/21]`;
- interaction variance `0`.

Frozen interaction reference:
- `Y=X1+2X2+4X3+3X1X2` on the same independent synthetic inputs;
- `V1=1/3`, `V2=4/3`, `V3=16/3`, `V12=1`, total variance `8`;
- first-order `S=[1/24,1/6,2/3]`;
- `S12=1/8`;
- total `ST=[1/6,7/24,2/3]`.

No production FEA response or sensitivity estimate under test may generate these oracle values.

## Q2 — Failure isolation

If the result disagrees with the oracle, isolate in this order:
1. frozen model/oracle transcription;
2. variable identity/order and input-bound mapping;
3. PRNG/replay or design construction;
4. model evaluation;
5. Morris step orientation/normalization;
6. Morris `mu`, `mu*`, `sigma` aggregation;
7. Sobol A/B/AB_i construction;
8. Sobol estimator and variance normalization;
9. finite-sample estimator uncertainty;
10. interaction accounting / omitted variance.

Do not change analytical oracles, model coefficients, acceptance envelopes, solver tolerances, or production outputs merely to obtain PASS.

## Q3 — Authority / invariants

Only isolated reference-sensitivity authority may be granted. Preserve:
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic-source count `0` unless separately authorized by #1673;
- `PRODUCTION_SENSITIVITY_AUTHORIZED=false`;
- production reliability-target authority `NONE`;
- no production independence assumption from these synthetic examples;
- no code/consequence-class qualification;
- no B03 activation;
- release/temperature authority false.

The exact Morris/Sobol values are verification oracles, not project acceptance criteria.

## Q4 — Independent validation / falsifiers

Required once material is authorized:
- additive Morris exact `mu*=[1,2,4]`, `sigma=[0,0,0]`, stable ranking `X3>X2>X1`;
- additive Sobol first/total indices reconstruct from analytical variance decomposition;
- interaction first/total/pairwise indices reconstruct analytically and expose `S12=1/8`;
- fixed-seed exact replay for retained stochastic summaries;
- different seed changes finite-sample summaries where stochastic estimators are used;
- consistent semantic variable permutation leaves ID-bound results invariant;
- inconsistent order fails closed;
- invalid bounds, unsupported distributions, non-finite model values, invalid sample counts/design matrices/estimator plans fail closed with structured code/path;
- finite-sample acceptance is frozen before execution and does not require monotonic raw-error reduction.

Falsifier: expected indices derived from the same implementation or samples under test are not independent validation.

## Q5 — Minimal patch / dependency gate

PR #1691 is PASS-validated at `b099d0768a4a21172307dba9187a2140e24e1eb9` but remains unmerged at this endpoint.

Therefore this progression may retain issue/chain/Q1-Q5/prework custody only. It may not duplicate or fork predecessor reference-engine implementation.

After #1691 merges, a fresh recognized Owner progression may authorize one bounded material leg limited to:
- frozen additive + interaction sensitivity reference definitions/oracles;
- narrowly scoped Morris/Sobol reference implementation/checker;
- replay/permutation/fail-closed controls;
- append-only chain/receipt custody.

No production UQ registry, solver, mesh, recovery, benchmark sequencing, production oracle/tolerance, governing roadmap, B03 activation, reliability target, code qualification, release or temperature mutation is authorized.
