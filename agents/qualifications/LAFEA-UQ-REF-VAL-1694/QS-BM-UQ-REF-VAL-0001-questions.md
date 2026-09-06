# Qualification questions — QS-BM-UQ-REF-VAL-0001

QUALIFICATION_SCOPE_ID: QSCOPE-1694-LAFEA-UQ-REFERENCE-VALIDATION-METRIC
QUESTION_SET_ID: QS-BM-UQ-REF-VAL-0001
QUESTION_SET_STATUS: CURRENT
ISSUE: 1694
PARENT_ISSUE: 1673
DEPENDENCY_ISSUE: 1692
DEPENDENCY_PR: 1693
QUESTION_DISPLAY: SHOW

## Q1 — validation-metric trace

Trace the complete reference path:

`frozen scalar model/test values + common unit + component IDs/roles/bases -> signed E = y_model-y_test -> standard-uncertainty normalization -> sum of component variances -> u_val -> z=abs(E)/u_val -> retained reference result`.

Frozen positive oracle:
- unit `REFERENCE_QOI`;
- `y_model=102`, `y_test=100`, `E=2`;
- standard uncertainties `u_test=0.75`, `u_num=0.50`, `u_input=1.00`, `u_model=1.25`;
- variance sum `3.375`;
- `u_val=1.8371173070873836`;
- `z=1.0886621079036347`.

Expanded-uncertainty metadata, when exercised, must retain original expanded uncertainty, coverage factor `k`, coverage statement/assumption, and derived standard uncertainty. No production FEA or aggregation output under test may generate the oracle.

## Q2 — failure isolation

If the result disagrees with the oracle, isolate in this order:
1. model/test value or unit transcription;
2. signed-error convention;
3. component ID/role mapping;
4. uncertainty basis (`STANDARD` vs `EXPANDED`);
5. coverage-factor conversion and provenance;
6. duplicate or omitted component role;
7. quadrature arithmetic;
8. zero-total-uncertainty applicability;
9. normalized-z arithmetic;
10. authority leakage.

Do not alter the frozen values, omit components, change uncertainty basis, or invent a z threshold to obtain PASS.

## Q3 — authority / invariants

Only isolated reference-validation-metric execution may be authorized. Preserve:
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic-source count `0`;
- `PRODUCTION_SENSITIVITY_AUTHORIZED=false`;
- `PRODUCTION_VALIDATION_ACCEPTANCE_AUTHORIZED=false`;
- production reliability-target authority `NONE`;
- production applicability blocker `ENGINEERING_POPULATION_APPLICABILITY_REQUIRED`;
- no B03 activation;
- release/temperature authority false.

The synthetic uncertainty values and z are verification oracles, not production inputs or universal acceptance criteria.

## Q4 — independent validation / falsifiers

Required material/checker behavior:
- exact `E=2`, variance sum `3.375`, `u_val=1.8371173070873836`, `z=1.0886621079036347`;
- swapping model/test values reverses signed E but leaves absolute z invariant;
- all-zero standard-uncertainty components return explicit `NOT_APPLICABLE_ZERO_UNCERTAINTY`, never Infinity/NaN as a qualified z;
- valid expanded-uncertainty normalization retains original `U`, positive finite `k`, coverage metadata and derived standard uncertainty;
- unit mismatch, negative/nonfinite values, missing or duplicate component roles, unsupported basis, expanded uncertainty without valid `k`, invalid coverage metadata, duplicate variance contribution and production-authority leakage fail closed with structured code/path.

Falsifier: expected E/u_val/z derived from the same aggregation result under test is not independent validation.

## Q5 — minimal patch

One bounded LEG-001 is limited to:
- frozen U3 reference definition/oracle;
- narrowly scoped validation-metric aggregation library;
- exact-head checker with sign/zero-uncertainty/provenance controls and structured fail-closed negatives;
- append-only chain/material receipt/endpoint custody.

No production uncertainty/correlation registry, solver, mesh, recovery, benchmark sequencing, production oracle/tolerance, governing roadmap, B03 activation, reliability target, code qualification, release or temperature mutation is authorized.
