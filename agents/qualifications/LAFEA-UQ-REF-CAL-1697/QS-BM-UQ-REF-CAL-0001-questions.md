# QS-BM-UQ-REF-CAL-0001 — BM-UQ-REF-CAL #1697

QUALIFICATION_SCOPE_ID: QSCOPE-1697-LAFEA-UQ-REFERENCE-CALIBRATION-BIAS
QUESTION_SET_ID: QS-BM-UQ-REF-CAL-0001
QUESTION_SET_STATUS: CURRENT
QUESTION_DISPLAY: SHOW
PARENT_ISSUE: 1673
PREDECESSOR_ISSUE: 1694
PREDECESSOR_PR: 1695
MAIN_BASIS: 65a5aa6c29ef533f358e5c4c296318025dfafe9f

## Q1 — statistical/engineering trace

Trace the frozen reference calculation as:

`pair IDs + paired y_model/y_test values + common unit + observation provenance -> semantic pair validation -> ratio orientation TEST_OVER_MODEL -> r_i -> arithmetic mean b -> selected N-1 ratio scatter -> calibrated model b*y_model -> residual test-calibrated -> RMSE observables -> retained reference result`.

Pair-array permutation is allowed only when IDs and their values/provenance move together. The checker must not construct expected values from the function output under test.

## Q2 — failure isolation

On mismatch, isolate in this order:
1. pair ID/value/provenance transcription;
2. semantic pair/order binding;
3. unit binding;
4. zero/nonfinite denominator or values;
5. ratio orientation;
6. bias estimator;
7. scatter estimator and denominator (`N-1` versus `N`);
8. factor application;
9. residual sign convention;
10. RMSE arithmetic;
11. authority leakage.

Do not change the frozen observations, selected estimator/scatter convention, production solver/model, or any acceptance criterion to obtain PASS.

## Q3 — authority / invariants

`REFERENCE_CALIBRATION_BIAS_EXECUTION_AUTHORIZED` may be true only for this synthetic reference context. Preserve all of the following:
- `PRODUCTION_CALIBRATION_FACTOR_AUTHORIZED=false`;
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic-source count `0`;
- `PRODUCTION_SENSITIVITY_AUTHORIZED=false`;
- `PRODUCTION_VALIDATION_ACCEPTANCE_AUTHORIZED=false`;
- production reliability-target authority `NONE`;
- B03 activation false;
- code qualification/release/temperature authority false.

The synthetic `b=1.05` is never production correction data.

## Q4 — independent validation / falsifiers

Frozen positive oracle:
- model `[100,125,150,200]`;
- test `[102,130,159,216]`;
- ratios `[1.02,1.04,1.06,1.08]`;
- mean bias `b=1.05`;
- selected sample SD (`N-1`) `0.025819888974716113`;
- population-SD cross-check `0.022360679774997897`;
- calibrated model `[105,131.25,157.5,210]`;
- residual sign `test - calibrated model`;
- calibrated residuals `[-3,-1.25,1.5,6]`;
- raw RMSE `9.565563234854496`;
- calibrated RMSE `3.49329715312053`;
- consistent pair permutation produces identical semantic result.

Required fail-closed categories:
- duplicate pair ID;
- missing pair ID;
- inconsistent pair/order binding;
- model/test unit mismatch;
- zero model denominator;
- nonfinite model value;
- nonfinite test value;
- unsupported ratio orientation;
- unsupported bias estimator;
- unsupported scatter convention;
- fewer than two pairs for sample SD;
- duplicate observation provenance token;
- missing provenance/source token;
- silent denominator/convention mismatch;
- unauthorized production calibration factor;
- production statistical authority leakage;
- nonzero active production source count;
- production sensitivity leakage;
- production validation-acceptance leakage;
- production reliability-target leakage;
- B03/release/temperature leakage.

Falsifier: expected values derived from the same aggregation output are not independent validation.

## Q5 — minimal patch

LEG-001 may add only:
- one frozen reference calibration/bias case/oracle;
- one narrowly scoped reference calibration/bias library;
- one checker with positive/permutation/fail-closed cases;
- append-only chain receipt/endpoint custody.

Prohibited: production uncertainty/calibration/correlation data, solver/mesh/recovery changes, benchmark sequencing or governing roadmap changes, production correction factors or tolerances, B03 activation, reliability/code targets, release, or temperature authority.
