# M047 Stage 2 — C2 lagged own-normal capacity measurement

## Question

Does accepted D1 improve if the Coulomb capacity uses the **same restraint's own normal from the immediately previous nonlinear iterate** rather than the current iterate?

This is a one-mechanic discriminator. Iteration 1 has no predecessor and therefore uses the current own normal as a deterministic seed. From iteration 2 onward:

```text
capacity_i = mu * |N_(i-1)|
F_cap direction = accepted D1 total-relative-tangential-displacement direction
```

Everything else is frozen: `k_f`, own-restraint normal definition, D1 direction, return-mapped slip-offset form, active-set boundaries/hysteresis, secant acceleration, 400-iteration limit, convergence gates, comparison rule, and ±10% goal.

Pinned ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

## Result

C2 **converged** in the governed run.

| metric | D1 | C2 lagged own-normal |
|---|---:|---:|
| tangential vectors within ±10% | **13/23** | **10/23** |
| normals within ±10% | 23/23 | 23/23 |
| worst normal error | 1.79% | 2.70% |
| raw mean vector error | 60.42% | 109.39% |
| raw worst vector error | 721.91% | 1951.21% |
| above provisional R1 floor: passes | 13/22 | **10/22** |
| above provisional R1 floor: mean error | 30.35% | **25.67%** |
| above provisional R1 floor: worst error | 176.22% | **103.58%** |

C2 improves aggregate error above the provisional resolution floor, but the governed row count gets worse. It loses three D1 passes and gains none:

- lost: `21800, 22020, 22120`
- gained: none

Therefore aggregate-error improvement is not a basis for promotion.

## Key rows

- **20710:** vector error `9.03% -> 7.19%`; solved tangential magnitude `568.319 -> 579.812 N`; current normal `1894.398 -> 1933.140 N`.
- **22140:** `176.22% -> 16.34%`.
- **22220:** `111.57% -> 10.12%` (near the ±10% boundary, but still outside).
- **21740:** `35.28% -> 103.58%`.
- **21800:** `7.18% -> 29.81%`.
- **22020:** `1.28% -> 18.90%`.
- **22120:** `8.45% -> 31.28%`.
- **21930:** `721.91% -> 1951.21%`; this remains below the provisional R1 resolution floor and is not excluded from qualification.

The pattern is branch redistribution: C2 substantially repairs the earlier 22140/22220 branch problem, but moves other previously-good supports onto worse locked-after-slip branches.

## What the 20710 test establishes

At the converged fixed point, the lag cannot remain materially different from the current normal because the unchanged reaction-update gate forces successive iterates together.

For 20710:

- reference tangential force magnitude: `624.738342 N`;
- C2 solved tangential magnitude: `579.811511 N`;
- C2 current normal: `1933.139713 N`;
- C2 capacity normal reconstructed from the lagged cap: `1933.139713 N`;
- lagged-cap minus current-normal-cap: `-3.36202674589e-08 N`.

Across all 23 supports, the maximum absolute lagged-cap/current-cap difference at convergence is only `6.08787514e-06 N`.

So previous-iteration normal timing **does affect the nonlinear path and equilibrium branch**, but it cannot justify CAESAR's published 20710 force as a permanent 10.6% over-cap state under the unchanged convergence contract.

## Decision

**REJECT C2 for promotion. Keep D1 as the experimental baseline.**

C2 is useful RCA evidence: normal-force timing is another confirmed branch-selection lever, consistent with the broader load-path findings. But it is not stable global authority because it drops the coordinate-invariant ±10% result from 13/23 to 10/23 and creates new regressions.

No tolerance, comparison rule, node exception, production friction source, or frozen control was changed.

Full local C2 artifact SHA-256: `7b06f25249a2f0649ac74a4d0c09c07d8df0e68f08978944ea8fa675833cc52b`. The committed compact evidence preserves all 23 restraint comparisons and this full-artifact identity.
