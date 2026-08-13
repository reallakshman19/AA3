# M047 Stage 2 — L13 load-component ordering measurement

Status: **REAL PINNED-ACCDB MEASUREMENT — simple component ordering does not improve D1.**

## Scope

Baseline is accepted D1. The only changed mechanic is the two-stage physical order used to establish the governed L13 `W+P1` load state:

- **W_FIRST:** `W` → `W+P1`
- **P1_FIRST:** `P1` → `W+P1`

The experiment uses the linear solver's native primitive formula resolver for the intermediate `W` and `P1` states while retaining `caseId=L13`, so L13 friction authority remains active. D1 total-relative-displacement direction, friction stiffness, Coulomb cap, own-restraint normal basis, state boundaries/hysteresis, return map, secant acceleration, 400-iteration per-stage limit, convergence gates, and ±10% comparison goal are frozen.

Pinned ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
Frozen PR #1090 head: `12c695a9ed9a3dedada1d45024712df911069a80`.
Production friction solver is not modified.

## Harness representation guard

An initial harness attempt represented the W-only intermediate state by directly writing `PRESSURE1=0`. The qualified linear compiler rejected that setup before any nonlinear iteration with `PIPING_COMPONENT_PRESSURE_STIFFENING_RULE_MISMATCH`, because the zero-pressure factor set no longer matched the full-pressure component-profile declaration.

That setup is **discarded and is not an experiment result**.

The measured harness instead gives the temporary L13 case record the governed primitive formula `W` or `P1`. This lets the existing linear solver consistently include/exclude pressure loads and bend pressure stiffening while preserving L13 friction authority. Both generated ephemeral solvers pass `node --check` and exact source guards.

## W_FIRST result — converged, exactly D1

`W → W+P1` converged under the unchanged gates.

Final accuracy:

- tangential vectors within ±10%: **13/23**;
- normals within ±10%: **23/23**;
- raw worst vector relative error: ratio `7.219148663680088`;
- all 23 final restraint comparison records are numerically **exactly equal** to the measured D1 artifact;
- D1 and W_FIRST summaries are exactly equal;
- maximum numeric difference across compared final restraint values: **0**.

Decision: establishing W first does not select a different final equilibrium branch. It gives no accuracy improvement over D1.

## P1_FIRST result — nonconverged in pressure-only stage

`P1 → W+P1` does not reach stage 2. The pressure-only first stage remains **NONCONVERGED after all 400 governed iterations**.

Final iteration evidence:

- state changes: **2** (`22220 STICK→SLIDE`, `22310 SLIDE→STICK`);
- displacement update: `9.12200896307884e-10 m` (gate still open);
- reaction update: `0.0631082604668336 N` (gate still open);
- failed gates: `ACTIVE_SET_STABILITY`, `DISPLACEMENT_UPDATE_NORM`, `REACTION_UPDATE_NORM`, `COULOMB_CAP_COMPLEMENTARITY`, `SLIDE_CAPACITY_RESIDUAL`, `SLIP_UPDATE_NORM`, `FRICTION_OPPOSES_SLIP`;
- cap/slide/update gates fail throughout the 400-iteration ledger; direction gate fails in 399/400 iterations.

No iteration limit, tolerance, or state rule is changed to force convergence.

## Decision

**D1 remains the measured experimental baseline: 13/23 vectors, 23/23 normals.**

This discriminator resolves the simple ordering question:

1. W-first is not a missing CAESAR mechanism because its full-load result is exactly D1.
2. P1-first is not an admissible alternative under the existing physics gates because the pressure-only friction state itself does not converge.
3. The improvement previously seen under proportional simultaneous continuation therefore cannot be attributed merely to “weight before pressure” or “pressure before weight.”
4. Do not introduce an arbitrary intermediate pressure fraction to rescue the result; that would reintroduce the undocumented step-size knob already rejected in the proportional continuation batch.

The next roadmap work should move to a non-tuned discriminator rather than further load-step selection. R5 (friction restraints coincident with bend/tee stations and tangent-plane authority) and R6 (explicit blank `STIFFNESS`/`GAP`/`CNODE` guards) are data/authority checks and do not require changing D1 mechanics.

## Full local artifact hashes

- D1: `44d58511281d4f17b636839f9983beccc1028a51df5b3b0947ea1e4acf216de8`
- W_FIRST: `4b6306f354807124da968942cfa7ad5d8d141d0adb8187c5d377497fbadcac80`
- P1_FIRST: `b294c20b21ae637fc23fc7eaf68e8dc3a9c7b6032c6e81f22d562d5879d38386`
- harness: `a71457f3aada617f138f56e0f72159560d345a0e3394a8d44b5f1add68929052`

Compact committed evidence: `reports/lfea-m047-stage2-load-component-order-evidence.json`.
