# Qualification questions — BM-UQ #1673 / reference sampler propagation

QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1673-LAFEA-UQ-REFERENCE-SAMPLER-PROPAGATION
QUESTION_SET_ID: QS-BM-UQ-1673-0005
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: Issue #1673; retained U0/U1 evidence; PASSed inverse-E analytical reference context; PR #1682 exact-head validation evidence
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Statistical trace

Trace the reference propagation chain from:

1. `SRC-UQ-PRIOR-JCSS-STRUCTURAL-STEEL-E` retained as a reference-only lognormal prior;
2. `UQ-REF-E-INVERSE-01` with frozen analytical relation `D(E)=K/E`;
3. the frozen seeded standard-normal generator and lognormal transform;
4. generated reference E samples;
5. propagated D samples;
6. retained sample mean, sample SD, P05, P50 and P95;
7. comparison against the independently frozen closed-form oracle.

Production FEA output is not in the oracle path and must not generate or tune expected statistical values.

## Q2 — Failure isolation

For a sampler/reference discrepancy isolate, in order, among:

1. PRNG/replay implementation failure;
2. Box-Muller normal-transform failure;
3. lognormal parameterization/transform failure;
4. inverse-E propagation error;
5. sample-summary or empirical-quantile implementation error;
6. finite-sample statistical fluctuation outside the pre-frozen acceptance envelope;
7. accidental production-authority leakage.

A reference sampling failure must not be repaired by changing the analytical oracle, BM-S tolerances, solver mechanics, production U1 distributions/correlations, or the pre-frozen acceptance envelope after observation.

## Q3 — Authority / invariant

The sampler may execute only under `REFERENCE_BENCHMARK_ONLY` authority.

Required invariants:

- reference sampler/statistical execution may be true;
- `PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED` remains false;
- active production numeric stochastic source count remains zero;
- production U2 sensitivity remains unauthorized;
- no governing reliability standard, consequence class, Pf/beta target or code allowable is selected;
- release and temperature authority remain false.

## Q4 — Independent statistical acceptance

Freeze before sampler execution:

- PRNG: xorshift32;
- seed: `1673005`;
- normal transform: Box-Muller cosine/sine pair;
- nested sample counts: `4096, 16384, 65536, 262144`;
- sample SD denominator: `N-1`;
- empirical quantiles: Hyndman-Fan Type 7;
- final normalized-error maximum: `5` analytical sampling standard errors for mean, SD, P05, P50 and P95;
- same-seed replay must match exactly;
- a different seed must change the retained final summary;
- all generated E and D samples must be finite and positive;
- monotonic raw-error reduction is not required because Monte Carlo convergence is stochastic, not monotone.

Analytical standard errors use only the already-frozen lognormal response distribution:

- mean SE = oracle SD / sqrt(N);
- SD SE = `sqrt((mu4 - variance^2)/(4*N*variance))` using the exact fourth central moment and delta method;
- quantile SE = `sqrt(p(1-p)/(N*f(q_p)^2))` using the exact lognormal density at the oracle quantile.

These criteria must not be retuned to observed sampler results.

## Q5 — Minimal patch

LEG-005 material scope is limited to:

- `validation/lafea-benchmark-data/UQ/reference/UQ-REF-E-INVERSE-01-sampling-plan.json`;
- `scripts/lib/lafea-uq-reference-sampler.mjs`;
- `scripts/lafea-uq-reference-sampler-check.mjs`;
- chain/Issue/qualification custody outside the material diff.

NO-PATCH boundary:

- do not activate production `uncertainty-models.json` or `correlation-models.json`;
- do not infer production material/load/geometry/boundary populations;
- do not start production U2 sensitivity;
- do not select Pf/beta targets or code allowables;
- do not alter solver/mesh/recovery/benchmark oracle/tolerance/program authority;
- do not activate B03;
- do not grant release or temperature authority.
