# M047 governed friction iteration controller — F1.1

## Mission

Add a deterministic, fail-closed outer iteration controller around the already qualified F1 local friction state kernel. This delivery does **not** implement BM4_L production friction and does not invent the remaining undocumented CAESAR controls.

## Stack

- Base PR: #1045 — generic CAESAR-style friction state kernel (F1).
- Base branch: `agent/m047-bm4l-friction-kernel`.
- Exact base SHA: `a926935b19167816b592f7795fc20a4b0a9c6510`.
- Head: `agent/m047-bm4l-friction-iteration-controller`.

## Why a controller contract is safe now

Independent Hexagon authority establishes that static friction is iterative and that:

- a non-sliding restraint uses transverse friction stiffness;
- reaching the friction limit schedules a constant sliding effort on the following iteration;
- Friction Angle Variation defaults to 15 degrees and is used only on the first non-sliding-to-sliding transition;
- Friction Normal Force Variation defaults to 0.15 and controls when the sliding friction force is adjusted;
- Friction Slide Multiplier remains an internal numeric scalar not published by the reviewed public help.

The exact formulas/order for the angle and normal-force controls are therefore **not implemented here**. The global solve callback must report `caesarFrictionControlsConverged=true` before the controller can commit a final state.

## Contract

`runGovernedFrictionIteration(...)` owns only:

1. deterministic site ordering;
2. current friction state passed into each global trial solve;
3. local F1 evaluation after the trial solve;
4. state transition scheduling;
5. the rule that a state-changing stick→slide trial cannot converge in that same iteration;
6. explicit external gates for structural equilibrium and CAESAR-specific friction controls;
7. maximum-iteration failure with **no partial final state publication**.

It does not own the global FE matrix, gap/contact state, CAESAR angle-update formula, CAESAR normal-force-update formula, or BM4_L source mapping.

## Exact zero-friction identity

A zero coefficient of friction or zero load-case friction multiplier initializes directly to the `DISABLED` friction state. This prevents a fake `STICK→DISABLED` nonlinear iteration and preserves the frictionless linear identity in one trial solve.

## Fail-closed behavior

Positive-friction sites still flow through the F1 kernel, so a missing numeric Slide Multiplier fails immediately. A missing/duplicate site response, duplicate site ID, invalid normal force, or exhausted iteration limit also blocks publication.

A blocked nonconvergent result contains the full iteration trace but `finalSites=[]`.

## Added/changed files

Relative to #1045:

```text
src/core/nonlinear-restraint-friction/governed-friction-iteration.js   added
src/core/nonlinear-restraint-friction/index.js                         export update
scripts/lfea-m047-friction-iteration-controller-check.mjs              added
agents/PR_M047_friction_iteration_controller.md                        added
```

No BM4_L profile, comparator, workflow, reference, tolerance, existing linear solver, or production benchmark source is changed.

## Focused local qualification

Executed with Node 22.16.0:

```text
node --check src/core/nonlinear-restraint-friction/governed-friction-iteration.js
PASS

node --check scripts/lfea-m047-friction-iteration-controller-check.mjs
PASS

node scripts/lfea-m047-friction-iteration-controller-check.mjs
PASS
```

The fixture proves deterministic ordering, one-pass stick convergence, required next-iteration stick→slide transition, external CAESAR-control gating, zero-friction one-pass identity, no partial final publication on nonconvergence, and fail-closed source/state errors.

## Decision

**F1.1 CONTROLLER CONTRACT QUALIFIED LOCALLY; BM4_L PRODUCTION FRICTION REMAINS BLOCKED.**

Next safe batch: BM4_L source/reference mapping and a friction differential evidence harness for L13/L6 and L7/L5. No L13 solve is authorized until the numeric Slide Multiplier and remaining exact control semantics are independently pinned.

## Non-scope

No PR #1001 modification, no Issue #991 change, no guessed Slide Multiplier, no response fitting, no reducer/gravity/stiffness tuning, no T2/T3 assumption, no merge, and no ready-for-review transition.
