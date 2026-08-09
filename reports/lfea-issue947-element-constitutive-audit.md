# Issue 947 — element-first constitutive residual audit

## Source custody

- Benchmark: `BM4_NL`
- Physical case: `L19 = W+P1`
- Source ACCDB SHA-256: `85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`
- Canonical package source: successful real-ACCDB Actions run `31300020859`
- Replayed audit: Actions run `31302752324` (`success`)

## Method

This audit does not ask whether a candidate improves the downstream restraint reaction. It injects CAESAR's own nodal translations and rotations into the LFEA element law and evaluates

`q_global = T^T [K_local (T d_global) - f_equivalent_local - f_initial_local]`.

The resulting element action is compared with the CAESAR source-element action. A large residual under the same imposed displacement identifies a constitutive/load/transformation mismatch rather than a global-solution displacement mismatch.

No CAESAR result value is used as a solver parameter or update rule.

## First robust plain-frame witnesses

Elements 3 and 4 are plain 273 mm OD × 18.262599945 mm wall pipe spans. They precede `BEND_PTR 1` and have exact coordinate/declaration lengths, so they avoid the short-span precision ambiguity of the first source span.

The current Euler–Bernoulli element and the repository's already-qualified Cowper thin-annulus Timoshenko element were evaluated against exactly the same CAESAR nodal displacement field, section/material, closed-end pressure strain, gravity load, axes and action convention.

| Source element | Span | Euler–Bernoulli normalized residual L2 | Timoshenko κ=0.53 normalized residual L2 | Ratio |
|---|---|---:|---:|---:|
| E3 | 20020→20030 | 2.837015900 | 0.133741834 | 0.047141 |
| E4 | 20030→20090 | 1.366148272 | 0.074900423 | 0.054826 |

The fixed Cowper formulation therefore reduces the constitutive residual by about 95% on both independent adjacent plain-frame witnesses without fitting κ to BM4.

For E4, the independently reconstructed physical gravity line weight is 1458.00232083 N/m and total span weight is 3827.25609218 N. CAESAR's E4 vertical end-force resultant is 3827.24139404 N, so the observed in-plane residual is not explained by distributed-weight ownership.

## Independent authority

The candidate is not a benchmark-derived parameter. The repository already qualifies

- formulation: `PIPE_FRAME3D_TIMOSHENKO_V1`
- `shearCorrectionFactorY = 0.53`
- `shearCorrectionFactorZ = 0.53`
- source: `COWPER-1966-THIN-ANNULUS-INPUT`

in `scripts/lfea-b3.1-frame-element-check.mjs`, including the independent closed-form shear-deflection identity

`δ = P L^3/(3 E I) + P L/(κ A G)`

and slender-beam convergence back to Euler–Bernoulli.

## Candidate production change

Commit `0729262bcb64f1ae7a839b4dcb999a1cbe6194e5` changes only the ACCDB adapter frame profile from Euler–Bernoulli to the existing qualified Timoshenko formulation with κ=0.53 in both transverse directions.

It does **not** change the sparse direct solver, scaling, convergence limits, load-case compilation, restraint model, B31/B31J factor equations, Bourdon equations, reaction convention or result-recovery equation.

## Acceptance state

`PENDING_REAL_ACCDB_L19` — the constitutive hypothesis is independently supported, but it is retained only if a fresh solve of the exact pinned ACCDB preserves solver/equilibrium invariants and improves the real L19 comparison without introducing compensating regressions.
