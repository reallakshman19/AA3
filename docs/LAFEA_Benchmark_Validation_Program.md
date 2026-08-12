# LAFEA Sequential Benchmark Validation Program

## Purpose

This program turns LAFEA benchmark qualification into an auditable sequence: **one benchmark case, every applicable method, defects/fixes, then the next case**. A later benchmark is not authorized until the current case passes all of its declared method routes.

The program is validation evidence only. It does not create numerical authority, application release authority, temperature/thermal-strain authority, or permission to rewrite an independent engineering oracle from observed production output.

## Audit record

Every execution record binds:

- exact 40-character Git head and tracked-clean-tree state;
- benchmark case, LAFEA stage, method and authority classification;
- exact command used;
- SHA-256 of every declared benchmark script/oracle/input reference;
- process exit code and elapsed time;
- retained stdout/stderr paths and SHA-256 hashes;
- any governed evidence file emitted by the method;
- case PASS/FAIL, next-case authorization and execution-baseline eligibility;
- explicit false values for release authority and temperature authority;
- a deterministic SHA-256 over the complete audit record body.

Generated records live under `reports/qualification/lafea-benchmark-program/<run-id>/`. They are evidence artifacts; whether a particular record is committed is a qualification decision, not an automatic side effect of the runner.

## Baseline discipline

`ELIGIBLE_EXECUTION_BASELINE` means only that every declared method in that case passed at the recorded exact head. It may be used to detect later execution drift. It **does not** mean observed outputs become expected values. Existing frozen analytical/theory oracles remain authoritative and may not be changed after observing production results merely to make a benchmark pass.

## B01 — continuum affine patch

B01 is intentionally first because it tests formulation mechanics before more complicated geometry and response benchmarks:

1. T3 governed patch receipt against the frozen closed-form oracle;
2. T6 rigid-body/affine patch, distorted/obtuse geometry, invariance and non-positive-Jacobian rejection;
3. Q8 rigid-body/affine patch, distorted geometry, invariance and non-positive-Jacobian rejection.

The three routes share the affine/constant-strain benchmark class but do not claim direct numerical parity across dissimilar element fixtures. Cross-method acceptance is based on the declared invariant and qualification contracts.

## Future queue

After B01 passes, the program is extended in order for continuum engineering response, shell patch/bending, trunnion footprint, analytical foundation/screening, and finally governance-negative cases. Each case is activated only after its predecessor has an exact-head PASS record.

## Commands

```bash
node scripts/lafea-benchmark-program-check.mjs && node scripts/lafea-benchmark-program-self-test.mjs
node scripts/run-lafea-benchmark-program.mjs --case B01 --expected-head <40-char-sha>
```

A failed method is retained in the audit record. The runner still executes the other methods within the current case to collect a complete defect picture, but `nextBenchmarkAuthorized` remains false until every method passes.
