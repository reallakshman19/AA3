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

## Acceptance boundary

No production code is changed on this branch. R8 cannot be promoted without a fresh custody-verified real `BM4_L.ACCDB` solve, committed evidence, unchanged convergence/equilibrium gates, and subsequent frozen-control regression if the experiment is nominated.

Queue **Friction Angle Variation** only after R8, as a separate one-mechanic batch; do not combine it with NFV15.
