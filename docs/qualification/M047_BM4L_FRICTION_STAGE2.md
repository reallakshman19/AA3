# M047 Stage 2 — BM4_L static-friction qualification

Issue: #1083

## Scope and base

This work is stacked on exact Stage 1 head `0855afb22b76c4b7657a81641c7fbaa890474cd7` and preserves the qualified BM4_L element/load/recovery mechanics. Stage 2 adds only the friction state solution plus an assembly-only L1 hydrotest compatibility mapping.

In scope:

- L13 `SUS / W+P1` nonlinear friction state;
- L7 `OPE / W+T1+P1` nonlinear friction state;
- L15 `EXP / L7-L13` algebraic result construction;
- L1 `HYD / WW+HP` nonlinear friction state;
- restraint reactions, translations/rotations, global element-end actions and nodal equilibrium;
- deterministic active-set evidence, direct CAESAR comparison and stiffness sensitivity.

Out of scope: stress, EXP/HYD stress, lift-off, one-directional contact/gaps, BM4_NL, InputXML and universal CAESAR parity.

## Pinned source custody

Issue #1083 is the production authority:

- Common commit `f4d49f2a47d970ae0abf913b537193e324556177`;
- BM4_L.zip Git blob `df119ae1b8272469b6204036ab1aff21e561dfb8`;
- ZIP SHA-256 `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`;
- member `BM4_L.ACCDB`;
- member byte length `5,136,384`;
- member SHA-256 `e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c`.

A historical ACCDB with SHA `64c05a50...` is retained only as diagnostic topology evidence. Its node list, restraint type and direction pattern are not production solver authority.

## Configuration authority

Stage 2 uses the issue-governed low-to-high precedence:

`OVERALL_GLOBAL_DEFAULT < INDIVIDUAL_FILE_SETTING < LOAD_CASE_SETTING < MODEL_INPUT`

The model coefficient and case multiplier remain separate:

- model `mu = 0.3`;
- L2-L6 multiplier `0`;
- L7/L13/L1 multiplier `1`;
- L14/L15 derived;
- effective primitive coefficient `mu_eff = mu_model * multiplier`.

Nominal `FRICT_STIF = 1.0E6 N/cm = 1.0E8 N/m`.

## Friction-surface selection

Production friction membership is row-driven from the pinned `INPUT_RESTRAINTS` table. A row is a friction surface when:

1. `FRIC_COEF > 0`;
2. it is not an anchor;
3. `Math.fround(FRIC_COEF) == Math.fround(model mu)`;
4. its normal is axis-aligned with the already-qualified Stage 1 directional-restraint representation;
5. only one positive-friction surface exists at the node.

The selector does not hard-code the historical type-3/+Y/26-node pattern. Positive-friction anchors, skew normals and multi-plane friction at one node fail closed.

Each selected surface must bind exactly one qualified base `LINEAR_SPRING` on its normal DOF. The Coulomb cap uses only that spring reaction; orthogonal co-located guide/limit reactions remain in the global system but cannot enter `mu|N|`.

The tangent plane remains `P_t = I - nn^T`. Orthogonal base constraints naturally suppress components of tangent motion without redefining the friction surface.

## Friction law

For a support normal `n`:

`u_t = (I - nn^T)u`

`C = mu_eff |N|`

### Stick

`F_trial = -k_f u_t`

Stick is retained while `||F_trial||` is within the declared cap boundary. The next matrix receives the tangential stiffness block `k_f P_t`.

### Slide

For slip direction `s = u_t / ||u_t||`:

`F_t = -C s`

The tangential spring is removed and the capped vector is applied in the next iteration.

A stable SLIDE label is not sufficient for convergence. The capped vector actually assembled into the solved RHS must equal the vector implied by the newly recovered normal force and slip direction within `assemblyLoadResidualN`. A changed cap or direction therefore forces another solve even when displacement and state labels appear stationary.

## Deterministic active set and numerical qualification

Primitive friction cases use:

- deterministic all-stick initialization;
- no nominal load stepping;
- unit relaxation;
- declared maximum iterations;
- projected tangential-translation update convergence;
- normal-reaction update convergence;
- cap, stick/slide constitutive and slide-direction residuals;
- assembled-load closure;
- physical force/moment equilibrium;
- repeated nominal-run determinism.

Each nonlinear linearization uses the qualified dense solver's diagonal scaling and compensated residual-refinement pattern. Normalized residual and conditioning are governing numerical gates. Numerical WARN is not accepted as nominal friction PASS.

The nonlinear stiffness-state identity binds the frozen base stiffness hash to each converged stick/slide tangent state. L15 has no independent stiffness state because it is algebraic.

## Governed execution order

The local production command runs frozen controls L2-L6/L14 first, then:

1. L13 — nonlinear primitive `W+P1`, paired with L6;
2. L7 — nonlinear primitive `W+T1+P1`, paired with L5;
3. L15 — algebraic `L7-L13`, no nonlinear solve, paired with L14;
4. L1 — nonlinear primitive `WW+HP`.

Paired evidence:

- `L13-L6`;
- `L7-L5`;
- `L15-L14`;
- expansion identity `(L15-L14)-((L7-L5)-(L13-L6))`.

## L15

L15 is constructed only from already-converged L7 and L13 result rows. It is never passed through the nonlinear kernel. Evidence records `independentSolvePerformed=false` and the exact algebraic identity.

## L1 hydrotest authority

L1 is no longer blocked on the governed public path. The source case must remain exactly:

`L1 / HYD / WW+HP`.

CAESAR II's documented load semantics are represented explicitly:

- `WW`: pipe plus water as the fluid;
- water basis: SG=1, represented as `1000 kg/m3 = 0.001 kg/cm3` in the BM4_L ACCDB density convention;
- the operating `FLUID_DENSITY` is not reused for WW;
- `HP`: hydrostatic test pressure from ACCDB `HYDRO_PRESSURE`;
- `Include Insulation in Hydrotest=False` is the documented default; an explicit True override fails closed because that branch has not been independently qualified.

The frozen adapter already owns `W` and `P1`. L1 therefore uses an assembly-only compatibility model:

- `FLUID_DENSITY = 0.001 kg/cm3`;
- `INSUL_THICK = 0`;
- `INSUL_DENSITY = 0`;
- `PRESSURE1 = HYDRO_PRESSURE`;
- frozen formula `W+P1`.

The raw #1085 friction adapter blocks case ID L1 before assembly, so the compatibility model is temporarily exposed through its L13 assembly slot. The alias is not reference authority: source L1 semantics are validated first, L1 load-case settings replace L13 settings, the hydro-transformed model is used, and the output/evidence are relabelled and re-hashed as L1.

Most importantly, the alias still uses #1085's row-driven positive-`FRIC_COEF` surface selection and exact normal-spring cap mechanics. It does not import the broader friction-site logic from any competing PR.

Stored pinned ACCDB L1 output remains the only benchmark reference.

Detailed authority and negative controls are documented in `M047_BM4L_L1_HYDROTEST_AUTHORITY.md`.

## FRICT_STIF sensitivity

The governed sensitivity set is `0.5x / 1x / 2x` for the primitive friction states L13, L7 and L1. L15 is rebuilt algebraically where needed.

Only `1x` governs qualification. `0.5x` and `2x` are diagnostic-only; they cannot tune, replace or rescue the nominal result. Diagnostic failures remain visible evidence.

## ACCDB extraction

`scripts/lfea-caesar-accdb-mdb-export.mjs` adapts the pure-JavaScript named-table boundary from `reallaksh19/XML_Compare_Utilities/parser/accdb-mdb.js` at commit `d83c62214b7a6486c17698225ea4e11bc3121cb6`, parser blob `2ea596b6e9fb65e386e5cbb256f4141ce7bb595b`.

The current adapter uses pinned browser modules `mdb-reader@2.2.6` and `buffer@6.0.3`, reads only the exact table allowlist and emits the existing `caesar-accdb-raw-export/v1` contract. Missing tables and unsupported values fail closed. No silent ACE fallback is used.

Current packaging still requires a Playwright Chromium/Chrome runtime plus outbound access to the pinned browser modules. That is a packaging limitation, not an engineering-result assumption.

## Direct CAESAR comparison

The production run compares all emitted cases against the pinned ACCDB reference rows using the governed benchmark tolerances. It retains complete component rows, restraint failure counts and maximum nonzero-reference errors.

The required friction comparison set is L13/L7/L15/L1. Missing cases are `NOT_READY`, never silently omitted.

The hardened qualification boundary additionally requires all frozen controls L2/L3/L4/L5/L6/L14 to be present and to retain zero restraint-component failures.

Final governed acceptance therefore requires:

- exact pinned source custody PASS;
- nonlinear mechanics PASS;
- zero restraint failures for every frozen control;
- zero restraint failures for L13/L7/L15/L1.

Missing required evidence blocks qualification.

## Independent exact-data corroboration

PR #1087 independently records a clean-current-head local production run against the exact pinned `e21b...` database. Its review receipt reports:

- L13: 0 literal failures; nonlinear state/equilibrium/repeatability PASS;
- L7: 0 literal failures; nonlinear state/equilibrium/repeatability PASS;
- L15: 0 literal failures; exact L7-L13; no independent nonlinear solve;
- L1: 0 literal failures; governed HYD WW+HP; nonlinear state/equilibrium/repeatability PASS;
- paired L13-L6, L7-L5, L15-L14: 0 failures;
- sensitivity 0.5x/1x/2x: zero diagnostic solve failures;
- frozen controls: exactly 46 retained external literal failures and 0 restraint failures.

This is recorded in `m047-bm4l-independent-production-corroboration.json` as independent corroboration only. PR #1087 uses a different friction implementation, so its clean exact-data run does not qualify PR #1085.

## Authoritative local command

Use the hardened qualification entry point, not the lower-level raw production script:

```powershell
node scripts/lfea-m047-bm4l-friction-qualification.mjs `
  --accdb "C:\path\to\BM4_L.ACCDB" `
  --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json `
  --friction-profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-friction-solver.profile.json `
  --actual-out reports/m047-bm4l-friction-actual.json `
  --evidence-out reports/m047-bm4l-friction-evidence.json
```

The hardened evidence schema is `m047-bm4l-friction-production-evidence/v2`.

## Current qualification boundary

The L1 source/mechanics blocker is closed in code. This branch must remain draft until **its own** hardened qualification command is executed against the exact pinned `e21b...` ACCDB and the resulting receipt is published/reviewed.

This authoring environment cannot materialize the 5 MB binary from the GitHub connector into the execution container. Therefore no numerical PASS for PR #1085 is claimed here.

## Tests committed

Coverage includes:

- configuration migration and effective-friction authority;
- friction stiffness conversion;
- row-driven positive-`FRIC_COEF` selection;
- float32 coefficient normalization;
- positive-friction anchor, skew and multi-plane negative controls;
- exact matching normal-spring cap binding;
- stick/slide constitutive behavior and direction checks;
- stale capped-slide-load closure;
- dense iterative refinement and numerical qualification;
- repeated-run determinism;
- nonlinear tangent-state identity;
- L15 algebraic construction;
- 0.5x/1x/2x sensitivity isolation;
- exact source-custody gates;
- frozen-control acceptance gates;
- L1 exact `HYD/WW+HP` authority;
- explicit hydro-insulation=True negative control;
- invalid `HYDRO_PRESSURE` negative control;
- proof that WW replaces operating fluid density with SG=1 water;
- proof that HP maps `HYDRO_PRESSURE -> PRESSURE1` and hydro insulation is removed;
- public API wiring to the governed L1-enabled solver and sensitivity path.

The newly added repository-integrated L1 and wiring tests are committed but are not claimed as executed in this network-isolated authoring environment.
