# M047 Stage 2 — next L13 accuracy batch after measured D1

Issue: #1083  
Baseline entering this batch: **real pinned-ACCDB D1, 13/23 tangential vectors within ±10%, normals 23/23**.  
Source ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

## Decision

**Keep D1 as the experimental baseline.** This batch rejects four candidate explanations/fixes for the 22140/22220 regressions and narrows the next work to a physical load-path / equilibrium-selection experiment rather than another re-lock or accelerator retune.

No tolerance, comparison rule, cap coefficient, normal basis, source value or production friction solver was changed.

## D2 — post-breakaway re-lock direction projection: REJECT

One additional mechanic from D1: for re-locked restraints only, preserve the current trial-force magnitude but orient it opposite total relative tangential displacement.

- converged: **yes**;
- vectors within ±10%: **11/23** (D1 = 13/23);
- normals within ±10%: **23/23**;
- 22140: **176.22% → 59.09%** vector error, but force magnitude falls to 257.0 N vs 628.1 N reference;
- 22220: **111.57% → 14.44%**;
- 20710 remains ~9.57% and one-axis sliding.

Local repair at the named nodes is not enough: other re-locked force magnitudes collapse, so the generic direction projection is rejected.

## S2 — re-anchor spring on SLIDE→STICK: REJECT

One additional mechanic from D1: when a sliding restraint re-locks, reintroduce the retained tangential spring at the current position with zero initial elastic force.

- converged: **yes**;
- vectors within ±10%: **4/23**;
- normals within ±10%: **23/23**;
- 22140 remains 171.61% error;
- 22220 remains 110.63% error.

This essentially loses the D1 gain and is rejected.

## R2 — first state-stable / partial-mobilisation stopping rule: REJECT

A data-only replay of every accepted-D1 nonlinear iterate was compared to CAESAR.

- D1 converged in **396 iterations**;
- first state-stable iterate: **iteration 2**, with **0/23** vector passes and 12/23 constitutive matches;
- by iteration 22 the solve already reaches the final **13/23** vector-pass count;
- by iteration 23 it reaches the final **19/23** constitutive-match count;
- iteration 24 is state-stable and has the same headline accuracy as the final state, but the displacement/reaction/cap/slip/direction fixed-point gates are still open;
- final converged state remains 13/23.

Therefore the D1 accuracy gap is **not caused by continuing past a better first state-stable iterate**. A state-stable-but-physically-open iterate cannot be promoted.

Path detail at 22140 is still important: it is near-correct while stuck at iterations 14–15 (~22.3% / 19.9%), then later breaks away and re-locks on the wrong force branch. That identifies equilibrium/path selection as the remaining issue, but not the simple stopping rule.

## R3 — per-axis capacity partition: not the 22140/22220 mechanism

Reference-only partition analysis finds:

- per-axis box can explain a resultant-over-cap reference at **22370** and **21470**;
- **22140: not a partition candidate**;
- **22220: not a partition candidate**;
- **20710: one free tangent and 1.1063 utilisation**, so per-axis vs resultant cannot explain it.

No per-axis nonlinear solve is justified for the two named regressions. 20710 remains a separate capacity-path signal.

## N1 — disable secant slip acceleration: REJECT for non-convergence

Same D1 law and same 400-iteration budget, with only componentwise secant acceleration removed.

- **NONCONVERGED after 400**;
- final reaction update: **65.79 N** vs 0.01 N gate;
- final displacement update: **1.028e-6 m** vs 1e-10 m gate;
- cap, slide residual, slip update and direction gates remain open.

Plain return mapping is too slow / unsettled under the governed budget and cannot replace D1.

## N2 — active-set-preserving secant acceleration: REJECT for non-convergence

One numerical safeguard: keep the D1 secant accelerator, but reject an extrapolated slip candidate if it crosses the existing governed stick/slide boundary where the raw return-map step does not. No new tolerance is introduced.

- **NONCONVERGED after 400**;
- final reaction update: **24.74 N**;
- final displacement update: **3.866e-7 m**;
- cap, slide residual, slip update and direction gates remain open.

This is better than N1 numerically but still far from the unchanged gates. It does not displace converged D1.

## What the batch establishes

1. D1 stays the measured baseline at **13/23**, normals **23/23**.
2. 22140/22220 are **path/equilibrium-selection problems**, not capacity-partition problems and not fixed by a generic re-lock direction/reference rule.
3. The first-state-stable CAESAR stopping hypothesis is rejected for the current D1 map.
4. Secant acceleration is necessary for convergence under the current budget, but simple removal or active-set clipping is not a replacement.
5. 20710 remains separate: its one-axis CAESAR force is ~10.63% over `mu|N_L13|`; C1 already showed the frictionless L6 normal makes the fit worse.
6. The next one-mechanic experiment should be **declared physical load-path continuation from zero load**, keeping D1 direction/cap/state law fixed, rather than another numerical re-lock patch.

## Evidence

Compact measured evidence: `reports/lfea-m047-stage2-next-accuracy-batch-evidence.json`.

Full locally generated R2 path artifact SHA-256: `29bde371e22a63f20b6a85764ab384f6fc53664686baca8572e3701f912953d8` (8,342,632 bytes). The compact committed evidence retains the governing summary, selected iterations and all three named target traces.
