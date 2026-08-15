# WIP — Empirical ROM Compatibility / Reference-Structure Solver

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Base branch: `main`
- Baseline SHA: `c35ae6eb04cf819a2ed4f839f45b3e05fdeccff6`
- Working branch: `agent/empirical-rom-compatibility-20260815`
- Merge authority: not granted.
- Coordination: `SAFE` — open PR #1139 is LAFEA.3 B-bar work and does not overlap empirical piping ROM core paths.
- Grounding epoch: `GE-EMPROM-COMP-001`

## Mission

Implement the next P0 mechanics slice after merged PR #1143: a first-principles reference-structure / force-method compatibility solver for multiple bilateral translational restraint coordinates.

The governing linear relation for this phase is:

```text
(F + S) R = delta_target - delta_reference
```

where:

- `F` is the structural flexibility matrix generated from 1 N unit-load fields and virtual work;
- `S` is diagonal support flexibility (`0` for rigid support, `1/k` for an explicitly finite linear support stiffness);
- `R` is restraint reaction on the pipe, positive along the declared coordinate direction;
- `delta_reference` is the displacement of the released/reference structure under separately governed applied loading;
- `delta_target` is prescribed support/ground movement in the same coordinate convention.

Recovered compatibility is:

```text
delta_pipe + delta_support = delta_target

delta_pipe = delta_reference + F R

delta_support = S R
```

## Frozen scope before production mutation

1. Add a pure linear compatibility primitive with reciprocity/symmetry and positive-definiteness gates.
2. Reuse `solveScaledDenseSystem` for the redundant-force solve and retain residual/conditioning evidence.
3. Add an orchestrator that builds `F` only from the merged rooted-tree 1 N action generator plus exact virtual-work integration; no caller-authored internal action field is accepted.
4. Permit only bilateral translational coordinates with rigid or explicitly finite positive linear stiffness.
5. Keep gaps, unilateral contact, friction, pressure, nonlinear response, elbows/tees/reducers, and production method registration outside this phase.
6. Preserve current `EMPIRICAL_RESTRAINT_NETWORK_V1/V2` mechanics and all existing multipliers/tolerances unchanged.
7. Qualify against independent closed-form single-, two-, and three-coordinate cases including cross-flexibility, elastic support flexibility, settlement/prescribed movement, dependent-coordinate rejection, and compatibility/energy closure.

## Authority trace

```text
rooted straight-pipe reference structure
  + 1 N coordinate unit loads
  -> mechanics-derived unit actions
  -> virtual-work F matrix
  + explicit support flexibility S
  + governed reference displacements / target movements
  -> (F+S)R = target-reference
  -> reaction + displacement + compatibility + energy evidence
```

## Protected invariants

- no empirical response multiplier may enter the new solver;
- no benchmark output may be consumed at runtime;
- no tolerance may be weakened to pass a benchmark;
- no contact/gap state may be approximated as bilateral linear support;
- no redundant structural graph is solved by deleting an arbitrary member;
- no production Load Calc dispatch/publication change in this PR unless separately authorized and qualified;
- local transverse-axis mechanics remain limited to axisymmetric sections unless separate principal-axis authority exists.

## Current hypothesis and falsifier

**Hypothesis:** the merged unit-load + virtual-work mechanics are sufficient to generate the flexibility coefficients required by a classical force-method compatibility solve for independent bilateral translational restraint coordinates on a straight-pipe reference tree.

**Falsifier:** any independent analytical case fails reciprocity, reaction recovery, compatibility closure, energy closure, or requires changing the unit-load mechanics / fitting a compliance multiplier.

## Planned changed files

- `src/core/empirical-piping-mechanics/restraint-compatibility.js` — new compatibility primitive + reference-tree orchestrator.
- `src/core/empirical-piping-mechanics/contracts.js` — new formula identities only.
- `src/core/empirical-piping-mechanics/index.js` — exports.
- `scripts/empirical-restraint-compatibility-check.mjs` — analytical qualification.
- this WIP report, later renamed to `agents/PR<NUMBER>_workreport.md` after PR allocation.

## Validation state

- live-main grounding: `PASS / SOURCE_INSPECTION`.
- active-PR coordination: `PASS / SOURCE_INSPECTION`.
- implementation validation: `NOT_RUN` — implementation not yet published.
- full repository regression: `NOT_RUN`.
- exact-head CI: `NOT_RUN`.

## EXACT_NEXT_ACTION

Implement and independently execute the linear compatibility primitive and rooted-tree orchestrator against closed-form analytical cases before publishing the mechanics commit.