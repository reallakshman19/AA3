# M047 Stage 2 — BM4_L nonlinear friction qualification layer

Issue: [#1083](https://github.com/reallaksh19/Advanced_Analysis/issues/1083)

## Mission

Qualify BM4_L static friction against CAESAR II 14.000 without disturbing the
already-qualified non-friction mechanics:

1. correct the configuration-authority representation before solving;
2. implement CAESAR's governed friction law as a separate nonlinear ACCDB solver
   path that reuses the qualified assembly, loads, constraints and recovery;
3. rebuild the derived expansion combination algebraically from two converged
   primitive states;
4. publish reviewable evidence through the local production harness, because
   repository CI was retired by owner direction.

## Five prequalification answers

### 1. Stick and slide residuals for a bidirectional restraint

For one support node, let the restrained translation set be `N` and the free
translation set be `T` (two components for a single-direction support). All
quantities below are global, and every force is expressed as a force applied to
the structure, the same convention the grounded restraint springs already use.

Per iteration `i`:

- relative tangential displacement `u_t^i` — the support node's `T` components.
  There is no CNODE in BM4_L, so the relative displacement is the node
  displacement minus ground;
- signed normal reactions `R_N^i` at the `N` components, and `|N^i| = ||R_N^i||`;
- Coulomb capacity `C^i = mu * |N^i|`;
- trial tangential spring force `F_trial^i = -k_f * u_t^i`, resultant
  `||F_trial^i||`;
- state: `SLIDE` if `||F_trial^i|| > C^i + b`, otherwise `STICK`, where `b` is the
  declared numerical boundary `max(1e-6 N, 1e-9 * max(C^i, ||F_trial^i||))`;
- slip direction `s^i = u_t^i / ||u_t^i||` when the tangential motion exceeds the
  declared zero-motion floor, otherwise `-F_trial^i / ||F_trial^i||`.

What changes between iterations:

- a `STICK` support inserts grounded springs `k_f` on every `T` component, and its
  friction force is the spring reaction `F_t^i = -k_f * u_t^i`, recovered from the
  solver rather than recomputed. Stick residual
  `r_stick = || F_t^i + k_f * u_t^i ||` must vanish; it is a genuine check because
  the two terms come from independent paths (solver reaction versus recovered
  displacement). Complementarity additionally requires
  `||F_t^i|| <= C^i` within tolerance;
- a `SLIDE` support inserts no spring on `T`; it carries a constant nodal load
  `F_t^i = -C^{i-1} * s^{i-1}` built from the previous iteration's capacity and
  slip direction. Slide residual `r_slide = | ||F_t^i|| - C^i |` measures the
  fixed-point convergence of the capacity, since `C^i` is recomputed from the
  current normal reaction. Direction is checked as
  `cos(F_t^i, u_t^i) <= -0.999999`;
- a state change removes the springs of a newly sliding support and adds the
  capped load, or the reverse, so both the stiffness matrix partition and the load
  vector change on the same iteration. That is why the active set, not only the
  displacement, has to be stable before convergence is declared.

For a bidirectional support the capacity uses `|N|`, the magnitude of the resolved
normal reaction. No active/inactive contact and no lift-off logic is introduced.

### 2. Setting resolution for L13, L7, L15 and L1

Declared authority order, lowest first:

`overall/global default < individual-file setting < load-case setting < model input`

Resolution starts at the global default and lets each higher layer replace it, so
the model input is final. The resolver walks the declared array itself, so the
executed order cannot drift from the published declaration.

| Setting | L13 | L7 | L15 | L1 |
|---|---|---|---|---|
| `COEFFICIENT_OF_FRICTION_MU` | 0.3 — MODEL_INPUT | 0.3 — MODEL_INPUT | 0.3 — MODEL_INPUT | 0.3 — MODEL_INPUT |
| `FRICTION_MULTIPLIER` | 1.0 — LOAD_CASE | 1.0 — LOAD_CASE | not applicable | 1.0 — LOAD_CASE |
| effective friction | 0.3 | 0.3 | 0.3 inherited | 0.3 |
| `FLEXIBILITY_ELASTIC_MODULUS` | EC — global default | EC — LOAD_CASE | EC inherited | EC — global default |
| `RESTRAINT_DIRECTIONAL_BEHAVIOR` | BIDIRECTIONAL — file | BIDIRECTIONAL — file | inherited | BIDIRECTIONAL — file |
| `BOURDON_PRESSURE` | TRANSLATION_AND_ROTATION — file | same | inherited | same |
| `FRICT_STIF` | 1.0E6 displayed — global default | same | not applicable | same |
| `Z_AXIS_UP` | NO — global default | same | inherited | same |

`FRICT_STIF` conversion: BM4_L `INPUT_UNITS.TRANS = 'N./cm.'`, so
`1.0E6 N/cm x 100 cm/m = 1.0E8 N/m`. The conversion factor, rule and both values
are recorded per case; an unrecognised displayed unit fails closed.

Model `mu` and the load-case friction multiplier stay distinct governed
quantities. Effective friction is their product, so L2–L6 are non-friction cases
even though the model still declares `mu = 0.3`, and no case is represented by
overriding the coefficient.

Primitive-case settings: friction multiplier, friction stiffness, flexibility
modulus, Bourdon mode, restraint directional behaviour, and every mechanics
authority that enters assembly. Meaningless for the derived L15 combination:
`FRICTION_MULTIPLIER` and `FRICT_STIF` — L15 performs no nonlinear solve, so
nothing scales and nothing is inserted. Its friction state is inherited from both
constituents, and a multiplier declared against it is accepted only if it agrees
with that inherited state; a contradicting declaration stops the run.

### 3. Why L15 must come from two converged states

`L15 = L7 - L13` is an algebraic difference of results, not a load combination.
Each primitive case is nonlinear: its converged active set depends on its own
load level, because whether a support sticks depends on `k_f * u_t` versus
`mu * |N|`, and both sides are load dependent. Decomposing L7 into `W + P1` plus
`T1` would require the friction state to be an invariant of the load path, which
it is not — thermal growth alone can move a support from stick to slide and change
the normal reaction that sets the capacity. Superposition inside L7 or L13 would
therefore assume away the very nonlinearity being qualified.

Building L15 from two independently converged states is valid because each
operand is the true equilibrium of its own case; their difference is only the
expansion range CAESAR reports. The implementation refuses to iterate L15,
records the constituent iteration counts, converged states and execution hashes,
and proves every derived row equals minuend minus subtrahend at the same row
identity with zero deviation.

### 4. Convergence gates that reject a stationary but invalid state

A numerically stationary iteration is not accepted. All of the following must
pass in the same iteration:

- **active-set stability** — zero stick/slide state changes;
- **displacement update norm** below the declared limit;
- **reaction update norm** below the declared limit;
- **Coulomb complementarity/cap** — no applied friction force above
  `mu |N|` beyond tolerance, for sticking and sliding supports alike;
- **stick residual** — `|| F_t + k_f u_t || <= 1e-6 N` at sticking supports;
- **slide residual** — `| ||F_t|| - mu|N| |` within tolerance at sliding supports,
  which also proves the capacity fixed point converged;
- **direction** — friction opposes slip, `cos <= -0.999999`;
- **recovered physical equilibrium** — incident global element-end actions equal
  support reaction plus declared applied nodal load at every analysis node,
  inside the existing engineering caps. The friction load enters the balance
  explicitly rather than widening the tolerance;
- **solver execution qualified** — the linear solve inside the iteration is not
  BLOCKED or CONDITIONAL;
- **determinism** — repeated nominal runs reproduce identical result rows.

Each gate is reported separately, so a failure names the physics that failed.

### 5. Paired-delta RCA

- sustained friction: `L13 - L6` (both `W+P1`, multiplier 1.0 versus 0);
- operating friction: `L7 - L5` (both `W+T1+P1`);
- friction contribution to the expansion range:
  `L15 - L14 = (L7 - L13) - (L5 - L6)`.

Each delta is formed on the CAESAR reference rows and on the solved rows and then
compared, restraint by restraint and node by node. Because the two cases in a
pair differ only in friction state, any disagreement in the delta is attributable
to the friction law, the active set or the friction reporting — not to W, T1, P1,
bend, tee, restraint or recovery mechanics, whose contributions cancel out of the
difference. That removes the incentive to "fix" a friction error by retuning a
qualified mechanic: such a change would move the already-passing control case and
would leave the delta wrong.

The command boundary enforces the same rule structurally: a single-term derived
comparison is now formed only between cases with equal effective friction, so a
friction case can never be differenced against a non-friction case and have the
friction change mislabelled as a thermal or pressure term.

L1 has no supplied non-friction hydrotest twin; a `mu = 0` L1 run may only be
recorded as a labelled counterfactual and is not benchmark authority.

## Implementation

### Configuration authority migration

- `src/core/fea-benchmarks/caesar-configuration-authority.js` declares the
  precedence lowest-to-highest, resolves by walking that declaration, and adds
  `resolveCaesarConfigurationLedger` which retains every layer candidate for the
  resolved-configuration report.
- `src/core/fea-benchmarks/caesar-friction-authority.js` resolves model `mu`, the
  load-case friction multiplier, the effective product, the case kind
  (primitive or derived combination) and the `FRICT_STIF` displayed-to-SI
  conversion. Undeclared multipliers, unknown stiffness units, formula cycles and
  combinations of two different friction states all fail closed.
- `bm4l-validation.profile.json` and `bm4nl-l19-l20-linear-solve.profile.json`
  drop the superseded load-case `COEFFICIENT_OF_FRICTION_MU` overrides and declare
  `FRICTION_MULTIPLIER` per case: L2–L6 = 0, L1/L7/L13 = 1.0, L14/L15 none.
  `profile.schema.json` pins the new precedence declaration.

### Nonlinear friction solver

- `caesar-accdb-linear-solve.js` now exposes an explicit, documented case
  boundary: `prepareCaesarAccdbCaseState` (iteration-invariant assembly, gated by
  an explicit `CAESAR_ACCDB_CASE_GATES` value) and `executeCaesarAccdbCaseState`
  (compile, solve, recover, rows) with a declared constraint/load overlay. An
  empty overlay reproduces the qualified linear result exactly. The linear entry
  point still refuses any case whose effective friction is nonzero.
- `caesar-accdb-friction-solve.js` owns only the nonlinear layer: the friction
  restraint plan, the active-set iteration, the per-iteration ledger, the
  convergence gates, the derived-combination algebra, determinism and the
  diagnostic stiffness sensitivity. `CAESAR_FRICTION_SOLVER_PROFILE` is versioned
  and visible.
- Friction applies to non-anchor translational restraints; anchors and fully
  restrained nodes are excluded explicitly and recorded. Skewed supports fail
  closed, because a rotated tangent plane is not implemented. A per-restraint
  coefficient column in the ACCDB may corroborate the resolved model coefficient
  but never silently disagree with it.
- The thermal numerical shift is zeroed at friction DOFs as well as restraint
  DOFs, because a grounded spring contributes `-k u_total` while only element
  stiffness is subtracted from the shifted load vector.
- A sliding support reports its friction force as the restraint load component,
  matching the way a sticking spring already reports its reaction.

### Evidence

| Deliverable | Artifact |
|---|---|
| Source-custody manifest | `scripts/lfea-m047-stage2-source-custody-manifest.mjs` → `reports/lfea-m047-stage2-source-custody-manifest.json` |
| Per-case resolved configuration | `scripts/lfea-m047-stage2-resolved-configuration-report.mjs` → `reports/lfea-m047-stage2-resolved-configuration.json` |
| Friction solver profile and implementation | `src/core/fea-benchmarks/caesar-accdb-friction-solve.js` |
| Per-iteration friction ledger | `mechanics.friction.cases.<case>.iterations[].supports[]` |
| L15 combination proof | `mechanics.friction.cases.L15.identityProof` and `.combination` |
| Four-layer comparison and paired-delta RCA | `scripts/lfea-m047-stage2-friction-rca.mjs` |
| Nominal, repeated-run and sensitivity evidence | `--friction-evidence-out` from the ACCDB command boundary |
| Local production command and receipt | `scripts/lfea-m047-bm4l-local-production.ps1` → `bm4l-local-production-receipt.json` |
| Configuration-migration stability proof | `benchmarks/LFEA/CAESAR_ACCDB/m047-friction-migration-baseline.json` |

The manifest retains both declared ACCDB member hashes — the issue's
`e21b0862…` and the harness-recorded `64c05a50…` — states the contradiction, and
leaves arbitration to the production run that recomputes the member bytes.

### Local production command

```text
pwsh -File scripts/lfea-m047-bm4l-local-production.ps1 -ExpectedHead <40-hex head>
```

The harness runs the frozen six-case non-friction control solve first, then the
Stage 2 friction qualification:

```text
node scripts/lfea-caesar-accdb-benchmark.mjs
  --accdb <pinned BM4_L.ACCDB> --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json
  --solve-linear true --solve-cases L2,L3,L4,L5,L6,L14 --solve-friction-cases L13,L7,L15
  --actual-out ... --friction-evidence-out ... --out ... --summary-out ...
```

It fails closed if a friction case does not converge, if a friction equilibrium
gate fails, if L15 was iterated instead of derived, or if repeated nominal runs
disagree. It contains no expected failure count and no tolerance override.

## Validation

- PASS — `npm run check:lfea-m047-stage2` (configuration authority, Stage 2
  friction contract, local production harness contract).
- PASS — `node scripts/lfea-m047-stage2-friction-check.mjs`: 18 sections covering
  the precedence migration, the effective-friction table, the `FRICT_STIF`
  conversion, row-identical non-friction regression against the frozen baseline,
  linear refusal of friction cases, converged stick and slide branches with all
  gates, friction restraint-load reporting, the exact L15 identity, determinism,
  the sensitivity study, the four comparison layers, the paired-delta RCA, and
  negative controls that reject a physically invalid state.
- PASS — `npm run check:core-fea`, `npm run check:imports`,
  `npm run check:doc-drift`.
- NOT_RUN — Windows/ACE production solve against the pinned `BM4_L.ACCDB`. This
  environment is Linux and the ACCDB is an ACE-only binary source, so no CAESAR
  benchmark percentage is claimed here. The deterministic fixture proves the
  mechanics and the plumbing; benchmark parity is the harness run.
- NOT_RUN — `pwsh` parser check of the harness, unavailable on this platform. The
  harness contract is checked by the platform-independent Node contract check.

The non-friction regression proof is exact on the fixture: `L5`, `L6` and `L14`
row values, execution semantic hashes and stiffness-state hashes are identical
before and after the migration. The same invariance argument applies to BM4_L:
with effective friction zero the friction overlay is empty, so the assembled
stiffness, load vector and constraint set are unchanged. The Windows run records
that directly through the existing baseline-parity comparison.

## Out of scope and unresolved

- **L1 (`WW+HP`) is implemented up to its load authority and then stops.** The
  friction law is case-type independent, but the hydrotest weight basis — the test
  fluid density used for `WW` — is not declared by any resolved authority in the
  pinned source, and `HP` must be bound to an explicit ACCDB pressure field. The
  solver raises `CAESAR_ACCDB_HYDROTEST_AUTHORITY_UNRESOLVED` naming exactly what
  must be declared rather than assuming a water density. L13, L7 and L15 are
  complete; L1 needs one owner declaration before it can be qualified, and no
  value was invented to close it.
- Stress, EXP stress, HYD stress, lift-off, one-directional contact and gaps stay
  out of scope. Supports remain bidirectional.
- Sensitivity runs are diagnostic. Nominal 1x remains the governed result and no
  stiffness, tolerance or convergence parameter was selected against a failure
  count.
- No new hard-coded benchmark values, node exceptions, case-specific force
  corrections or tolerance widening.
- The retired GitHub Actions qualification workflow is not reintroduced; the
  harness contract check now asserts its absence.
