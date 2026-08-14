# M047 Stage 2 — R8 NFV15 measurement batch

This branch is stacked directly on frozen Stage 2 head `101b3973fb24bba71d2f82f6e9e2c58a0fe6b538` and is intentionally separate from the L1 hydrotest-basis branch.

## Authority

CAESAR II v14 documents **Friction Normal Force Variation** as the permitted variation in the normal force before the sliding friction force is adjusted. The documented default is `0.15` (15%). Primary authority: Hexagon CAESAR II Users Guide, configuration setting `Friction Normal Force Variation` (document id 334794).

This is not the already-rejected C2 previous-iteration normal experiment. C2 refreshed the capacity every nonlinear iteration; NFV15 intentionally retains the last accepted normal basis while its variation remains within the configured threshold.

## One mechanic only

The R8 experiment must preserve production R2/D1 unchanged except for the sliding-capacity normal basis:

- current own-restraint signed normal remains the physical normal source;
- on first STICK→SLIDE transition, seed the retained capacity basis from the current own normal;
- while the support remains sliding, retain that basis until `abs(N_current-N_basis)/N_basis > 0.15`, then refresh it to the current normal;
- if the support returns to STICK, discard the retained sliding basis; a later breakaway seeds again from the then-current normal;
- `k_f`, `mu`, D1 direction, return mapping, state boundaries, hysteresis, acceleration, iteration ceiling, load stepping, equilibrium and all tolerances remain unchanged.

Ledger every iteration: current normal, retained basis entering the iteration, variation ratio, refresh event, capacity-basis normal, governed retained capacity, current-normal diagnostic capacity, and next retained basis.

The Coulomb and slide-residual gates must use the governed retained capacity. A separate NFV gate must reject a state whose retained basis violates the 15% refresh rule. The current-final-normal cap remains diagnostic only for this experiment.

## Real-file experiment harness

`scripts/lfea-m047-stage2-r8-nfv15-experiment.mjs` is the non-production measurement boundary. It fails closed unless both pinned source identities match:

- `BM4_L.zip` SHA-256 `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`, 582,488 bytes;
- `BM4_L.ACCDB` SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`, 5,136,384 bytes.

It also requires production R2 solver git blob `5b3ba1ce89f6ff7509bf8be82361993a32497ad2`, materializes a temporary sibling module, injects only NFV15, deletes the temporary module afterward, and fails if the production blob changed.

First governed discriminator command:

```bash
node scripts/lfea-m047-stage2-r8-nfv15-experiment.mjs \
  --zip artifacts/bm4l-stage2/source/BM4_L.zip \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --case L13 \
  --out reports/lfea-m047-stage2-r8-nfv15-L13.json
```

A nomination repeat uses the same command with `--repeat 2`; repeat count is never used to choose a better result.

## When accuracy is measured

Accuracy is measured **immediately after each custody-verified primitive run reaches all nonlinear convergence and physical-equilibrium gates**. The artifact reports the CAESAR normal-reaction and coordinate-invariant tangential-vector errors at that point. A nonconverged or equilibrium-failing run gets no accuracy claim.

There are two distinct boundaries:

1. **Candidate/discriminator measurement:** one real pinned-ACCDB run is enough to compute and record accuracy for the one-mechanic experiment. This answers whether R8 is explanatory and worth nominating; the script must not fail merely because the benchmark error count is high.
2. **Qualification measurement:** promotion requires nominal repeats with identical result hashes, the frozen L2-L6/L14 control regression, and the required case order `L13 -> L7 -> L15 -> L1`. `L15` is algebraic `L7-L13`, never an independent nonlinear solve. L1 remains last and its friction accuracy is not used to tune R8 while the separate HYD `WW` linear-basis RCA is unresolved.

`Friction Angle Variation` remains blocked behind the measured R8 result and must be a separate one-mechanic batch.

## Acceptance boundary

No production code is changed on this branch. R8 cannot be promoted without a fresh custody-verified real `BM4_L.ACCDB` solve, committed evidence, unchanged convergence/equilibrium gates, and subsequent frozen-control regression if the experiment is nominated.
