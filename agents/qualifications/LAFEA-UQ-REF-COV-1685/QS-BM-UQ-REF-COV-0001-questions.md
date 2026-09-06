# Qualification questions — BM-UQ-REF-COV #1685

QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1685-LAFEA-UQ-REFERENCE-CORRELATED-GAUSSIAN
QUESTION_SET_ID: QS-BM-UQ-REF-COV-0001
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: Issue #1685; parent #1673 retained sampler evidence; merged PR #1674
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Statistical trace

Trace the complete positive path:

`frozen Gaussian mu/Sigma + variable order -> deterministic standard-normal stream -> covariance factor -> correlated X samples -> linear transform Y -> retained sample moments/covariances -> analytical oracle comparison`.

The expected-value path must not consume production FEA output. Variable ordering must be explicit and custody-bound.

## Q2 — Failure isolation

For a correlated-reference discrepancy, isolate in this order:

1. analytical/source transcription;
2. variable-order or dimension binding;
3. covariance/correlation validation;
4. factorization implementation;
5. PRNG/normal generation and replay;
6. linear-transform implementation;
7. summary estimator or finite-sample error.

Do not repair a statistical failure by modifying the analytical oracle, production solver behavior, or benchmark tolerances.

## Q3 — Authority / invariants

`REFERENCE_CORRELATED_STATISTICAL_EXECUTION_AUTHORIZED` may become true only for the frozen reference case while all of the following remain binding:

- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED=false`;
- active production numeric stochastic source count remains 0 unless separately authorized under #1673;
- unsourced production correlations remain `UNKNOWN_NOT_ZERO`;
- production U2 sensitivity remains unauthorized;
- Pf/beta target, code qualification, release and temperature authority remain false/unselected.

## Q4 — Independent validation / falsifiers

Positive cases must reconstruct the closed-form linear-Gaussian identities:

`E[Y] = A mu + d`

`Cov[Y] = A Sigma A^T`.

The fail-closed suite must reject, before sampling where applicable:
- non-square matrices;
- dimension mismatch;
- nonsymmetry beyond frozen tolerance;
- negative diagonal variance;
- correlation outside [-1,1];
- non-unit correlation diagonal;
- non-PSD covariance/correlation;
- duplicate/missing variable IDs or ordering mismatch;
- NaN/Infinity/non-numeric entries;
- unsupported singular covariance when a positive-definite factorization is required.

Same-seed retained summaries must replay exactly; a different seed must change stochastic summaries without changing analytical oracles.

## Q5 — Minimal patch

LEG-001 safe material scope is limited to:
- a frozen reference correlated-Gaussian case and sampling/acceptance plan;
- a reference-only covariance validation/factorization/sampling utility;
- one qualification checker covering analytical positive behavior and fail-closed negatives;
- append-only chain/custody artifacts.

Must not modify:
- production `validation/lafea-benchmark-data/UQ/inputs/uncertainty-models.json`;
- production `validation/lafea-benchmark-data/UQ/inputs/correlation-models.json`;
- solver/mesh/recovery code;
- benchmark-program sequencing;
- production oracles/tolerances;
- governing roadmaps/workflows;
- release/temperature authority.
