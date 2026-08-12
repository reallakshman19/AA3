# M047 Stage 2 — BM4_L static-friction qualification

Issue: #1083

## Scope and base

This change is stacked on exact Stage 1 head `0855afb22b76c4b7657a81641c7fbaa890474cd7` and preserves the existing BM4_L W/T1/P1 element assembly, load construction, finite normal restraints, recovery, bend/tee handling, Bourdon handling, reducer/rigid mechanics, and benchmark comparison.

The nonlinear path changes only tangential support terms. It does not implement stress, lift-off, one-directional contact, or any BM4_NL/InputXML path.

## Configuration authority migration

Stage 2 introduces `caesar-configuration-authority/v2` with the issue-governed low-to-high order:

`OVERALL_GLOBAL_DEFAULT < INDIVIDUAL_FILE_SETTING < LOAD_CASE_SETTING < MODEL_INPUT`

The v1 resolver remains supported for frozen earlier profiles. Migration removes case-level `COEFFICIENT_OF_FRICTION_MU` overrides and instead records a distinct `FRICTION_MULTIPLIER`.

For BM4_L:

- model coefficient: `mu = 0.3` from model input;
- L2-L6 multiplier: `0`;
- L7, L13, L1 multiplier: `1`;
- L14/L15: derived, therefore no primitive friction multiplier;
- effective primitive coefficient: `mu_eff = mu_model * multiplier`;
- nominal `FRICT_STIF = 1.0E6 N/cm = 1.0E8 N/m`.

The checked-in `m047-bm4l-friction-authority.json` records the migrated authority without modifying the frozen Stage 1 BM4_L profile.

## Friction law

For support normal unit vector `n`, tangential projector and displacement are

`P_t = I - n n^T`

`u_t = P_t u`.

With signed normal reaction `N`, the bidirectional Coulomb cap is

`C = mu_eff |N|`.

No contact activation/lift-off rule is introduced.

### Stick

Trial friction is

`F_trial = -k_f u_t`.

The support remains sticking when `||F_trial|| <= C + boundary`. The tangential stiffness `k_f P_t` is inserted in the next global matrix. The constitutive residual is

`r_stick = F_t + k_f u_t`.

### Slide

After breakaway, the tangential spring is removed. With slip direction

`s = u_t / ||u_t||`,

the capped support force is

`F_t = -C s`.

That vector is inserted as a nodal load in the next active-set iteration. The slide checks include cap magnitude and anti-parallel direction.

## Integration boundary

The ACCDB adapter's private mechanics are deliberately not duplicated. `withSolverExecutionInterceptor()` provides a synchronous scoped boundary around the final linear equation solve. Ordinary linear calls delegate directly to the original `compileSolverExecution()`.

For L13/L7 the friction adapter:

1. asks the qualified ACCDB adapter to construct the physical case with a temporary zero-friction bootstrap used only to reach the solve boundary;
2. intercepts the compiled mechanical model, element contributions, physical load case and governed solver profile;
3. assembles the exact qualified base matrix/load;
4. adds only stick tangent blocks or slide capped-load vectors;
5. iterates deterministically;
6. returns the converged displacement/reaction state to the original ACCDB recovery path;
7. requires recovered physical nodal equilibrium to pass.

The bootstrap linear result is never accepted as friction qualification evidence.

## Execution order

The local production command first runs frozen non-friction controls L2-L6/L14. It then runs:

1. L13 — primitive nonlinear `W+P1`, paired with L6;
2. L7 — primitive nonlinear `W+T1+P1`, paired with L5;
3. L15 — algebraic `L7-L13`, no independent solve, paired with L14;
4. L1 — intended primitive nonlinear `WW+HP`.

Paired-delta evidence is emitted for:

- `L13-L6`;
- `L7-L5`;
- `L15-L14`;
- identity residual `(L15-L14)-((L7-L5)-(L13-L6))`.

## Convergence and evidence

The versioned nominal profile records all-stick initialization, no nominal load stepping, unit relaxation, maximum iterations, update tolerances, cap/stick/slide tolerances, direction tolerance, physical equilibrium caps, repeat count, and 0.5x/1x/2x stiffness sensitivity points.

Each friction iteration records restraint identity, normal direction, relative tangential displacement, signed/magnitude normal reaction, effective coefficient, stiffness, Coulomb cap, trial spring force, state, state change, applied friction vector, slip direction, residuals, and assembly mode.

A state is not accepted from displacement stationarity alone. The gates require active-set stability, displacement/reaction update closure, cap and constitutive closure, opposing slide direction, equation equilibrium, recovered physical equilibrium, and deterministic repeated-run evidence.

## Local production command

On Windows with the pinned `BM4_L.ACCDB` and Microsoft ACE OLE DB provider:

```powershell
node scripts/lfea-m047-bm4l-friction.mjs `
  --accdb <path-to-BM4_L.ACCDB> `
  --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json `
  --friction-profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-friction-solver.profile.json `
  --actual-out reports/m047-bm4l-friction-actual.json `
  --evidence-out reports/m047-bm4l-friction-evidence.json
```

The standard ACCDB comparison command can then consume the emitted actual-result package.

## Current qualification boundary

L13/L7/L15 mechanics are implemented. L1 is intentionally fail-closed with `CAESAR_ACCDB_HYDROTEST_LOAD_BASIS_NOT_QUALIFIED` because the frozen ACCDB solver implements W/T1/P1 but not `WW+HP`. This change does **not** infer hydrotest weight from operating `FLUID_DENSITY` or silently reuse P1 as HP.

Accordingly this PR must remain draft and must not claim full issue acceptance until:

1. WW and HP load construction are independently source-authorized and qualified;
2. the pinned Windows/ACE production run is executed;
3. L2-L6/L14 regression evidence remains passing;
4. L13/L7/L1 restraint components and all required result families are compared to the pinned ACCDB;
5. nominal repeat and stiffness-sensitivity artifacts are published.

## Tests available in this branch

- friction authority migration and precedence;
- `1.0E6 N/cm -> 1.0E8 N/m` conversion;
- stick and slide constitutive behavior;
- rejection of a stationary state with invalid friction direction;
- algebraic L15 construction;
- active-set load carry-forward;
- repeated-run state determinism;
- scoped solver-interceptor lifetime and exception cleanup.

The isolated friction-kernel test set was exercised during authoring and passed 9/9. Full repository and Windows/ACE production testing cannot be executed from the Linux/network-isolated authoring runtime and therefore are not claimed here.
