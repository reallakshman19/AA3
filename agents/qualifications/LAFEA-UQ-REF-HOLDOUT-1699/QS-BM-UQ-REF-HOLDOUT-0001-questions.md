# QS-BM-UQ-REF-HOLDOUT-0001 — qualification questions

QUALIFICATION_SCOPE_ID: QSCOPE-1699-LAFEA-UQ-REFERENCE-CALIBRATION-HOLDOUT
QUESTION_SET_STATUS: CURRENT
QUESTION_DISPLAY: SHOW
FROZEN_BEFORE_MATERIAL: TRUE
PARENT_ISSUE: 1673
ISSUE: 1699
PREDECESSOR_ISSUE: 1697
PREDECESSOR_PR: 1698
MAIN_BASIS: 687b9ff3b8884031e4776f031af7a739f29eb2c8

## Q1 — trace / computational identity
Trace the complete retained computation:

`frozen split IDs + model/test values + REFERENCE_QOI unit + TEST_OVER_MODEL orientation + arithmetic-mean estimator`
`-> validate calibration/holdout disjointness`
`-> semantic calibration pairs P1..P4`
`-> ratios [1.02,1.04,1.06,1.08]`
`-> calibration-only b=1.05`
`-> freeze b before holdout use`
`-> semantic holdout pairs H1..H4`
`-> calibrated holdout predictions b*y_model`
`-> raw/calibrated residuals`
`-> mean signed residuals + RMSE diagnostics`
`-> retained result`.

Required identity rules:
- holdout observations are evaluation-only and may never enter the calibration estimator;
- within-split array order is irrelevant when IDs remain correctly bound;
- split membership is semantic authority, not positional convention;
- the implementation under test may not synthesize its own oracle.

## Q2 — failure isolation order
On disagreement, isolate without changing the frozen oracle:
1. split ID transcription and calibration/holdout disjointness;
2. pair ID/value binding and provenance uniqueness;
3. unit consistency;
4. model denominator validity;
5. ratio orientation;
6. calibration estimator and factor freeze;
7. illegal holdout refit/re-estimation;
8. factor transfer to holdout;
9. residual sign convention;
10. mean/RMSE arithmetic;
11. split leakage/provenance migration;
12. reference/production authority leakage.

Do not alter the split, data, estimator, holdout values, tolerance, production model, or expected values to obtain PASS.

## Q3 — authority / invariants
Authorized only for isolated reference holdout qualification.

Must remain invariant:
- `REFERENCE_CALIBRATION_HOLDOUT_EXECUTION_AUTHORIZED` may become true only inside the reference case/checker;
- `PRODUCTION_CALIBRATION_FACTOR_AUTHORIZED=false`;
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic-source count `0`;
- `PRODUCTION_SENSITIVITY_AUTHORIZED=false`;
- `PRODUCTION_VALIDATION_ACCEPTANCE_AUTHORIZED=false`;
- production reliability-target authority `NONE`;
- B03 activation false;
- release false;
- temperature false;
- production blocker `ENGINEERING_POPULATION_APPLICABILITY_REQUIRED`.

`b=1.05` is synthetic reference evidence only. Holdout RMSE reduction is not a production acceptance criterion.

## Q4 — independent validation / falsifiers
### Positive oracles
Calibration:
- ratios exactly `[1.02,1.04,1.06,1.08]`;
- `b=1.05` derived only from P1..P4.

Holdout:
- model `[110,140,175,220]`;
- test `[112,146,187,239]`;
- calibrated model `[115.5,147,183.75,231]`;
- raw residuals `[2,6,12,19]`;
- calibrated residuals `[-3.5,-1,3.25,8]`;
- raw mean signed residual `9.75`;
- calibrated mean signed residual `1.6875`;
- raw RMSE `11.672617529928752`;
- calibrated RMSE `4.685416203497828`;
- calibrated/raw RMSE ratio `0.4014023582529246`;
- holdout ratio mean `1.0539935064935064` post-hoc only.

### Causality / invariance controls
- consistent permutation within calibration split: exact retained result;
- consistent permutation within holdout split: exact retained result;
- split-membership permutation/migration: fail closed;
- holdout-value perturbation changes holdout metrics while calibration `b` remains exactly unchanged;
- calibration-value perturbation changes `b` and downstream holdout predictions.

### Minimum fail-closed classes
- calibration/holdout ID overlap;
- duplicate pair ID;
- missing required pair ID;
- cross-split provenance reuse;
- split-label mismatch;
- holdout-to-calibration migration;
- calibration-to-holdout migration;
- unit mismatch;
- zero model denominator;
- nonfinite model/test value;
- unsupported ratio orientation;
- unsupported calibration estimator;
- unsupported residual convention;
- illegal holdout refit/re-estimation;
- missing reference authority;
- production calibration-factor leakage;
- production statistical authority leakage;
- production source-count leakage;
- production sensitivity leakage;
- production validation acceptance leakage;
- production reliability target leakage;
- B03 leakage;
- release leakage;
- temperature leakage.

Falsifier: any expected result derived from the implementation output under test instead of the frozen arithmetic oracle is invalid evidence.

## Q5 — minimal patch
One bounded material LEG-001 may add only:
1. frozen holdout reference definition/oracle;
2. narrow reference holdout split/transfer library;
3. deterministic checker with causality/invariance and structured fail-closed cases;
4. append-only chain/receipt custody.

Forbidden changes:
- production UQ or calibration registry/data;
- production calibration factor;
- solver, mesh, recovery, benchmark sequencing;
- Owner roadmap authority mutation;
- B03 activation;
- production reliability/code target;
- production tolerance/oracle;
- release or temperature authority.

## Frozen gate conclusion
Q1-Q5 are complete and shown before material. Material may begin only after #1699 Chain Root / Active Handover / EP-0000 publication is synchronized back into repository custody.
