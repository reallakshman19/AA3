# Qualification questions — BM-UQ #1673 / reference-only UQ context

QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1673-LAFEA-UQ-REFERENCE-INVERSE-E
QUESTION_SET_ID: QS-BM-UQ-1673-0004
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: Issue #1673; retained U0/U1 evidence; B02A frozen independent oracle; retained JCSS candidate prior
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Production/reference trace

Trace the proposed reference-only uncertainty case from:

1. `SRC-UQ-PRIOR-JCSS-STRUCTURAL-STEEL-E` — lognormal arithmetic mean E = 200000 MPa, COV = 0.03;
2. `validation/lafea-b02-definitions/B02A-nonuniform-bending.json` — deterministic independent engineering oracle with E0 = 200000 MPa, nu = 0.3, G = E/[2(1+nu)], and nominal tip-deflection magnitude D0 = 2.0156 mm;
3. the exact scaling `D(E) = D0 * E0 / E` when all geometry/load inputs and nu are held fixed.

Explain why this creates an analytically solvable **reference benchmark population** but does not identify or authorize the production B02A material population.

## Q2 — Failure isolation

For a discrepancy in the reference case, isolate first among:

1. source-prior transcription/parameterization error;
2. lognormal arithmetic-to-log parameter conversion error;
3. deterministic mechanics scaling error;
4. sampler/random-seed implementation error (future execution leg);
5. statistical estimator/convergence error;
6. accidental production-authority leakage.

A reference-benchmark failure must not be repaired by changing B02A deterministic tolerances, solver mechanics, or production U1 models.

## Q3 — Authority / invariant

The Owner progression authorizes use of the retained JCSS prior only for an explicitly labeled reference benchmark context used to qualify UQ machinery. It does not assert that B02A is structural steel, does not activate any production stochastic input, and does not authorize production uncertainty propagation, reliability targets, code allowables, release, temperature, or production-mesh claims.

Required invariant:

`REFERENCE_STATISTICAL_EXECUTION_AUTHORIZED` may be true for the isolated reference case while `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED` remains false and active production stochastic source count remains zero.

## Q4 — Independent analytical oracle

For E lognormal with arithmetic mean m and COV c:

- `sigma_ln = sqrt(ln(1+c^2))`
- `mu_ln = ln(m) - 0.5*sigma_ln^2`

For `D = K/E`, D is also lognormal with the same COV and:

- `K = D0 * E0`
- `E[D] = D0 * (1+c^2)` when E0 = m
- `SD[D] = E[D] * c`
- `Q_p[D] = exp(ln(K) - mu_ln + sigma_ln * Phi^-1(p))`

Frozen reference values for m = E0 = 200000 MPa, c = 0.03, D0 = 2.0156 mm:

- mean = 2.01741404 mm
- SD = 0.0605224212 mm
- variance = 0.003662963467910208 mm^2
- P5 = 1.9194375568611886 mm
- P50 = 2.016506816012281 mm
- P95 = 2.1184850345814383 mm

These values are generated from independent source+analytical equations, never from production FEA output.

## Q5 — Minimal patch

LEG-004 safe material scope is limited to:

- a reference-only probabilistic context manifest;
- an analytic inverse-E reference case/oracle;
- a fail-closed definition/oracle checker;
- chain/Issue custody.

NO-PATCH boundary:

- do not modify active production `uncertainty-models.json` or `correlation-models.json`;
- do not infer production material identity;
- do not start production U2 sensitivity;
- do not select Pf/beta targets or code allowables;
- do not alter solver/mesh/recovery/oracle/tolerance authority;
- do not activate B03;
- do not grant release/temperature authority.
