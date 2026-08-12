# M047 Stage 2 — BM4_L static-friction qualification

Issue: #1083

## Scope and base

This change is stacked on exact Stage 1 head `0855afb22b76c4b7657a81641c7fbaa890474cd7` and preserves the existing BM4_L W/T1/P1 element assembly, load construction, finite normal restraints, recovery, bend/tee handling, Bourdon handling, reducer/rigid mechanics, and benchmark comparison.

The nonlinear path changes only tangential support terms. It does not implement stress, lift-off, one-directional contact, or any BM4_NL/InputXML path.

## Pinned source custody

Issue #1083 is the production source authority. The production gate requires the exact embedded database identity declared by the issue:

- archive Git blob: `df119ae1b8272469b6204036ab1aff21e561dfb8`;
- archive SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`;
- member name: `BM4_L.ACCDB`;
- member byte length: `5,136,384`;
- member SHA-256: `e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c`.

A historical Windows/ACE extraction available in repository evidence came from a different ACCDB SHA (`64c05a50...`). Its 46 restraint rows are therefore retained only as a diagnostic/negative-control fixture. They are not production authority; its node list, restraint type, and direction pattern are never used by the production selector. `m047-bm4l-friction-restraint-authority.json` records this distinction explicitly.

Production friction-site membership remains row-driven from the pinned ACCDB itself.

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

## Friction-surface selection

Friction is not assigned by node list, historical restraint type, or historical direction. A physical friction surface is selected from the issue-pinned `INPUT_RESTRAINTS` rows when all Stage 2 source-domain rules hold:

1. `FRIC_COEF > 0` on that source row;
2. the row is not an anchor (`RES_TYPEID != 1`);
3. `Math.fround(FRIC_COEF) = Math.fround(model mu)`;
4. the source restraint direction is axis-aligned within `1e-9`, matching the already-qualified Stage 1 restraint representation;
5. only one positive-friction surface is present at a node; multi-plane friction at one node remains fail-closed in this stage.

The model-level `mu=0.3` remains the governed coefficient magnitude. `FRIC_COEF` identifies which physical restraint row carries friction and corroborates the database's single-precision storage; it does not override model authority.

A non-anchor type 3, 8, 9, or another directional restraint type is therefore not accepted or rejected merely because of its historical label. A positive `FRIC_COEF` row from the pinned ACCDB is the source declaration. Rows with nonpositive/sentinel `FRIC_COEF` remain ordinary qualified mechanical constraints and do not independently create a friction surface.

Each selected surface must bind exactly one qualified base `LINEAR_SPRING` on its aligned normal DOF before the active-set solve is allowed to proceed. The Coulomb cap uses only that source surface's normal reaction. Orthogonal co-located restraint reactions remain in the mechanical solution but cannot contaminate `mu|N|` for the selected surface.

The friction law still acts in the full plane tangent to that selected surface, `P_t = I - n n^T`. Orthogonal guide/limit restraints remain in the base stiffness and naturally suppress the corresponding tangential motion; their presence does not redefine the surface tangent plane.

The historical `64c05a50...` diagnostic fixture happens to contain 26 positive-friction type-3/+Y rows and three non-friction Y rows (`20300`, `20640`, `21640`). Those observations exercise negative controls only; they are not production type, direction, or node hardcodes and do not define the pinned `e21b...` topology.

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

A stable SLIDE classification is not enough to converge. The capped vector actually assembled in the solved right-hand side must match the vector implied by the newly recovered `N` and slip direction. The controller records

`r_assembly = ||F_t,assembled - F_t,recovered||`

and requires `r_assembly <= assemblyLoadResidualN`. If the cap or direction changes, another solve is mandatory even when displacement and state labels are stationary. This closes the CAESAR next-iteration constant-force rule explicitly.

## ACCDB extraction engine

Stage 2 no longer requires Microsoft ACE/OLE DB for its production command. `scripts/lfea-caesar-accdb-mdb-export.mjs` adapts the raw named-table extraction boundary from `reallaksh19/XML_Compare_Utilities`:

- source repository: `reallaksh19/XML_Compare_Utilities`;
- source commit: `d83c62214b7a6486c17698225ea4e11bc3121cb6`;
- source parser: `parser/accdb-mdb.js`;
- source parser blob: `2ea596b6e9fb65e386e5cbb256f4141ce7bb595b`;
- extraction engine: `mdb-reader@2.2.6`;
- browser Buffer shim: `buffer@6.0.3`.

The adapted boundary intentionally does only what Stage 2 needs: open the binary ACCDB, enumerate tables, resolve the exact requested table names case-insensitively, read their ordered columns and rows, normalize binary/date values for JSON transport, and emit the existing `caesar-accdb-raw-export/v1` contract.

It does **not** copy the XML utility's higher-level CAESAR interpretation or fallback heuristics. Advanced_Analysis remains the authority for required tables, units, identities, configuration resolution, assembly, recovery and qualification. Missing required tables, unsafe table names, unsupported cell types and extraction failures remain fatal.

### Current runtime limitation

The current adapter still loads pinned `mdb-reader@2.2.6` and `buffer@6.0.3` through an `esm.sh` browser import map and therefore requires a Playwright Chromium/Chrome runtime plus outbound module access. This is a known packaging limitation, not an engineering-result assumption. No silent ACE fallback is performed.

Upstream `mdb-reader@2.2.6` has a native Node entry point, so an offline/local Node cutover is technically available. That cutover will not be claimed complete until `mdb-reader` and all transitives are represented reproducibly in this repository's npm lock; this branch does not invent package-integrity metadata merely to remove the browser requirement.

## Integration boundary

The ACCDB adapter's private mechanics are deliberately not duplicated. `withSolverExecutionInterceptor()` provides a synchronous scoped boundary around the final linear equation solve. Ordinary linear calls delegate directly to the original `compileSolverExecution()`.

For L13/L7 the friction adapter:

1. asks the qualified ACCDB adapter to construct the physical case with a temporary zero-friction bootstrap used only to reach the solve boundary;
2. intercepts the compiled mechanical model, element contributions, physical load case and governed solver profile;
3. assembles the exact qualified base matrix/load;
4. adds only stick tangent blocks or slide capped-load vectors;
5. solves each linearization with the same dense direct scaling and compensated residual-refinement policy used by the qualified linear solver;
6. applies the same normalized-residual, energy-balance and conditioning thresholds to each final linearization;
7. iterates deterministically;
8. returns the converged displacement/reaction state to the original ACCDB recovery path;
9. requires recovered physical nodal equilibrium to pass.

A numerical `WARN` is retained in evidence but is not accepted as a nominal friction qualification PASS. The bootstrap linear result is never accepted as friction qualification evidence.

## Nonlinear stiffness-state identity

The base linear `stiffnessStateHash` is insufficient for friction because the converged tangent matrix depends on STICK/SLIDE state. Stage 2 therefore binds a nonlinear stiffness identity to:

- the frozen base stiffness-state hash;
- each friction restraint identity/node;
- its converged STICK/SLIDE state;
- its declared friction stiffness.

Changing STICK to SLIDE changes the nonlinear tangent-state hash. Changing only a capped slide-force magnitude does not redefine tangent stiffness; that force remains part of the nonlinear load/state ledger and execution identity.

L15 has no independent tangent state because it is an algebraic result combination, not a solve.

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

## FRICT_STIF sensitivity

The production run now executes the issue-governed stiffness sensitivity points explicitly:

- `0.5x` — diagnostic-only independent L13/L7 solves, then algebraic L15;
- `1x` — the governed nominal two-repeat qualification result is reused;
- `2x` — diagnostic-only independent L13/L7 solves, then algebraic L15.

Only the declared `FRICT_STIF` value is scaled. Model `mu`, load-case friction multipliers, source identity and all qualified non-friction mechanics remain unchanged. Diagnostic packages receive distinct recomputed package semantic hashes; they cannot retain nominal authority identity. The nominal package is not mutated.

Sensitivity is diagnostic only. A 0.5x/2x diagnostic failure is recorded but cannot be used to retune the nominal solver or replace the 1x qualification result. Conversely, a diagnostic PASS cannot rescue a failing nominal 1x run.

## Direct CAESAR comparison

The same production run compares every emitted actual case against the ACCDB reference rows using the governed benchmark tolerances. It records the full component comparison, restraint-component counts, restraint failures, and the maximum nonzero-reference percentage error per case.

The friction restraint acceptance set is L13, L7, L15 and L1. Missing cases are reported as `NOT_READY`; they are not silently omitted. Overall acceptance is separated into:

- `mechanicsStatus` — nonlinear convergence/equilibrium/determinism/numerical-qualification status;
- `frictionRestraintSourceCustodyStatus` — exact pinned ACCDB identity plus row-driven friction-source checks;
- `benchmarkRestraintAccuracyStatus` — direct CAESAR restraint comparison status;
- `overallStatus` — may be `PASS` only when the governed gates pass.

Thus a converged nonlinear solution cannot be reported overall PASS while its source custody or CAESAR restraint components fail.

## Convergence and evidence

The versioned nominal profile records all-stick initialization, no nominal load stepping, unit relaxation, maximum iterations, update tolerances, cap/stick/slide tolerances, assembled-load closure tolerance, direction tolerance, physical equilibrium caps, repeat count, and 0.5x/1x/2x stiffness sensitivity points.

Each friction iteration records restraint identity, normal direction, relative tangential displacement, signed/magnitude normal reaction, effective coefficient, stiffness, Coulomb cap, trial spring force, state, state change, applied friction vector, slip direction, residuals, assembly mode, and the maximum assembled-vs-recovered capped-load residual. Solver evidence also carries factorization kind, condition estimate and iterative-refinement history.

A state is not accepted from displacement stationarity alone. The gates require active-set stability, displacement/reaction update closure, cap and constitutive closure, assembled friction-load closure, opposing slide direction, equation equilibrium, recovered physical equilibrium, deterministic repeated-run evidence, base-solver residual qualification, energy balance and conditioning.

## Local production command

The command is cross-platform with the current browser-based extraction packaging. It requires Node, repository dependencies, a Chromium/Chrome runtime usable by Playwright, network access to the pinned `esm.sh` browser modules, and the exact pinned `BM4_L.ACCDB`. Set `LFEA_ACCDB_BROWSER_CHANNEL` only when an explicit installed Playwright browser channel must be selected.

```powershell
node scripts/lfea-m047-bm4l-friction.mjs `
  --accdb <path-to-BM4_L.ACCDB> `
  --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json `
  --friction-profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-friction-solver.profile.json `
  --actual-out reports/m047-bm4l-friction-actual.json `
  --evidence-out reports/m047-bm4l-friction-evidence.json
```

The emitted actual-result package remains compatible with the standard ACCDB benchmark comparison contract. The evidence file contains direct Stage 2 accuracy comparison, pinned-source custody, active-set/repeat evidence, paired-delta RCA and 0.5x/1x/2x sensitivity.

## Current qualification boundary

L13/L7/L15 mechanics are implemented. L1 is intentionally fail-closed with `CAESAR_ACCDB_HYDROTEST_LOAD_BASIS_NOT_QUALIFIED` because the frozen ACCDB solver implements W/T1/P1 but not `WW+HP`. This change does **not** infer hydrotest weight from operating `FLUID_DENSITY` or silently reuse P1 as HP.

Accordingly this PR must remain draft and must not claim full issue acceptance until:

1. WW and HP load construction are independently source-authorized and qualified;
2. the exact issue-pinned `e21b0862...` BM4_L production run is executed;
3. L2-L6/L14 regression evidence remains passing;
4. L13/L7/L1 restraint components and all required result families are compared to the pinned ACCDB, with the L15 literal combination report retained;
5. nominal repeat and stiffness-sensitivity artifacts are published.

The historical `64c05a50...` extraction cannot satisfy item 2.

## Tests available in this branch

- friction authority migration and precedence;
- `1.0E6 N/cm -> 1.0E8 N/m` conversion;
- stick and slide constitutive behavior;
- rejection of a stationary state with invalid friction direction;
- algebraic L15 construction;
- active-set load carry-forward;
- rejection of stable-SLIDE convergence until the capped load assembled in the solved RHS matches the newly recovered cap/direction;
- repeated-run state determinism;
- scoped solver-interceptor lifetime and exception cleanup;
- positive-`FRIC_COEF` non-anchor row selection without historical restraint-type/direction/node hardcodes;
- acceptance of valid non-historical directional restraint types declared by the pinned row;
- parser-normalized `0.3` versus expanded float32 coefficient equivalence;
- positive-friction anchor, skew, and multi-plane-at-one-node fail-closed controls;
- historical 46-row topology retained only as a non-authoritative negative-control fixture;
- exact issue-pinned ACCDB filename/length/SHA custody gates;
- dense iterative-refinement behavior and residual/energy/conditioning qualification;
- 0.5x/2x sensitivity isolation from nominal `FRICT_STIF` and model `mu`, including diagnostic package hash separation;
- nonlinear tangent-state identity changes on STICK/SLIDE and ignores capped-load magnitude.

The original isolated friction-kernel test set was exercised during authoring and passed 9/9. The assembled-load closure reproducer was also executed locally against the controller source and passed. The newer repository-integrated tests have been committed but a full repository test run is not claimed from this network-isolated authoring runtime.

The browser-based mdb-reader production extraction itself has not been executed in this authoring runtime because the pinned `e21b...` ACCDB is not materialized locally and outbound module loading/browser execution are unavailable. Fresh L13/L7/L15 CAESAR percentage agreement is therefore still not claimed here.
