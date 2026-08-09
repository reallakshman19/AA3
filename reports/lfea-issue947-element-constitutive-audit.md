# Issue 947 — element-first constitutive residual audit

## Source custody

- Benchmark: `BM4_NL`
- Physical case: `L19 = W+P1`
- Source ACCDB SHA-256: `85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`
- Canonical package source: successful real-ACCDB Actions capture
- Constitutive audit replay: Actions run `31302752324` (`success`)
- κ=0.53 canonical-package qualification: Actions run `31303217949` (`success`)

## Method

This audit does not ask whether a candidate improves the downstream restraint reaction. It injects CAESAR's own nodal translations and rotations into the LFEA element law and evaluates

`q_global = T^T [K_local (T d_global) - f_equivalent_local - f_initial_local]`.

The resulting element action is compared with the CAESAR source-element action. A large residual under the same imposed displacement identifies a constitutive/load/transformation mismatch rather than a global-solution displacement mismatch.

No CAESAR result value is used as a solver parameter or update rule.

## First robust plain-frame witnesses

Elements 3 and 4 are plain 273 mm OD × 18.262599945 mm wall pipe spans. They precede `BEND_PTR 1` and have exact coordinate/declaration lengths, so they avoid the short-span precision ambiguity of the first source span.

The original Euler–Bernoulli element and the repository's already-qualified Cowper thin-annulus Timoshenko element were evaluated against exactly the same CAESAR nodal displacement field, section/material, closed-end pressure strain, gravity load, axes and action convention.

| Source element | Span | Euler–Bernoulli normalized residual L2 | Timoshenko κ=0.53 normalized residual L2 | Ratio |
|---|---|---:|---:|---:|
| E3 | 20020→20030 | 2.837015900 | 0.133741834 | 0.047141 |
| E4 | 20030→20090 | 1.366148272 | 0.074900423 | 0.054826 |

The fixed Cowper formulation therefore reduced the constitutive residual by about 95% on both independent adjacent plain-frame witnesses without fitting κ to BM4.

For E4, the independently reconstructed physical gravity line weight is 1458.00232083 N/m and total span weight is 3827.25609218 N. CAESAR's E4 vertical end-force resultant is 3827.24139404 N, so the observed in-plane residual is not explained by distributed-weight ownership.

## κ=0.53 real-data disposition

The κ=0.53 ACCDB profile corrected the original dominant L19 restraint miss:

- node 20090 UY: reference `-1659.836792 N`, candidate `-1638.908067 N`, relative error `1.26%`;
- L19 displacement/rotation failures reduced from 72 to 55 components;
- L19 source end-action failures reduced from 20 to 17 components.

It did not fully close L19: node 20390 UZ remained `-30.626309 N` versus `-36.448513 N`. With the locked 50 N force scale floor, that is `11.64%`, so the L19 restraint gate remained open.

The first remaining source-action failure is E17 (20290→20295), a 0.143 m plain run-pipe span terminating at the 20295 tee junction. The B31J run flexibility factors at this junction floor to 1.0, so E17 carries no active tee rotational spring. Injecting the CAESAR endpoint displacement field isolates the remaining E17 residual to the short-pipe transverse shear/bending constitutive pair rather than tee spring flexibility, gravity ownership, pressure strain, or recovery sign.

## CAESAR-specific thin-wall pipe shear authority

The generic B-3.1 frame package remains qualified with its independent Cowper thin-annulus fixture at κ=0.53. That generic authority is not changed.

For CAESAR parity, the vendor-authored CAESAR II CAUx 2015 training material, `F=KX — How CAESAR II formulates the global stiffness matrix` (© Intergraph 2015), develops the straight-pipe stiffness matrix with a thin-wall pipe shear coefficient of 2 and

`phi = 12 E I / [ G (A / shear) L^2 ]`.

The frozen LFEA Timoshenko kernel uses

`phi = 12 E I / [ G kappa A L^2 ]`.

Therefore the direct authority mapping is

`kappa = 1 / shear = 1 / 2 = 0.5`.

This mapping is regression-tested in `scripts/lfea-issue947-caesar-pipe-shear-authority-check.mjs`. The check contains no BM4 reaction, displacement, or element-action reference value and does not optimize κ.

As a diagnostic cross-check only, not as the authority for the value, E17's injected-CAESAR-displacement normalized residual falls from about 0.1445 at κ=0.53 to about 0.01494 at the independently sourced κ=0.5.

## Candidate production change

Commit `d738f53e63c87d47a4fa844c9b8f65ea8be0cdee` changes only the CAESAR ACCDB adapter profile to

- `PIPE_FRAME3D_TIMOSHENKO_V1`;
- `shearCorrectionFactorY = 0.5`;
- `shearCorrectionFactorZ = 0.5`;
- source `INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2`.

It does **not** change the generic frame kernel or Cowper fixture, sparse direct solver, scaling, convergence limits, load-case compilation, restraint model, B31/B31J factor equations, Bourdon equations, reaction convention or result-recovery equation.

## Acceptance state

`PENDING_EXACT_HEAD_L19` — the CAESAR-specific shear authority is independently sourced and its algebraic mapping is executable, but the change remains accepted only if the exact-head canonical replay and fresh real-ACCDB solve preserve solver/equilibrium invariants and close the L19 restraint gate without compensating regressions.
