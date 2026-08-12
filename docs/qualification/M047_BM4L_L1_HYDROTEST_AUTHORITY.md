# M047 BM4_L Stage 2 — L1 hydrotest authority

Issue: #1083  
Production source: issue-pinned `BM4_L.ACCDB`, 5,136,384 bytes, SHA-256 `e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c`.

## Source semantics

L1 must remain exactly:

```text
case       L1
class      HYD
formula    WW+HP
friction   model mu 0.3 * case multiplier 1.0
```

The Stage-2 implementation fails closed if case number, class or formula drift.

CAESAR II v14 defines:

- `WW` as water weight: pipe plus water as the fluid. The load inventory identifies the water-filled weight separately from the operating-fluid `W` term.
- `HP` as hydrostatic test pressure, activated by the model's Hydro Pressure input.
- `Include Insulation in Hydrotest=False` as the default. With a HYD stress type and that setting False, insulation/cladding are excluded from WW/WNC hydrotest weight.
- Fluid density can be entered as specific gravity. The L1 compatibility assembly uses water SG=1, represented as `1000 kg/m3 = 0.001 kg/cm3` in the BM4_L ACCDB density convention. It never reuses the operating `FLUID_DENSITY` as hydrotest contents.

Source identifiers retained in the code authority record:

```text
CAESAR II v14 Loads Defined in Input                  1452260
CAESAR II v14 What is a Load Case?                    1451008
CAESAR II v14 Fluid Density                           334967
CAESAR II v14 Include Insulation in Hydrotest         1403380
CAESAR II Applications Guide fluid-SG conversion      839412
```

## Frozen-mechanics mapping

The qualified ACCDB adapter already owns the physical `W` and `P1` implementations, including pipe/rigid/reducer/bend/tee mechanics, pressure elongation/Bourdon behavior, finite restraints and result recovery. L1 therefore uses an assembly-only compatibility package:

```text
source authority                         frozen assembly input
WW water-filled contents                 W with FLUID_DENSITY = 0.001 kg/cm3
HYD insulation excluded                  INSUL_THICK = 0; INSUL_DENSITY = 0
HP                                       P1
INPUT_BASIC_ELEMENT_DATA.HYDRO_PRESSURE  PRESSURE1
```

The compatibility package is not benchmark-reference authority. The stored pinned ACCDB L1 output remains the only comparison reference.

The raw #1085 friction adapter currently blocks case ID `L1` before assembly. To avoid broadening that large adapter, the compatibility package temporarily exposes the transformed L1 state through its `L13` assembly slot. This alias is safe only because:

1. the source L1 semantics are validated before transformation;
2. L1 and L13 both have governed friction multiplier 1;
3. the alias's load-case settings are replaced by the source L1 settings;
4. the alias formula is `W+P1` with the hydro-transformed model;
5. the existing #1085 row-driven positive-`FRIC_COEF` friction-site selection and exact matching normal-spring cap remain unchanged;
6. output rows/evidence are relabeled and re-hashed as L1;
7. the alias is explicitly `ASSEMBLY_ONLY_NOT_REFERENCE_AUTHORITY`.

## Negative controls

`test/caesar-accdb-hydrotest-friction.test.js` requires:

- exact `L1 / HYD / WW+HP`;
- finite nonnegative `HYDRO_PRESSURE` on every input element row;
- explicit `Include Insulation in Hydrotest=True` to fail closed;
- water density to replace, not reuse, operating fluid density;
- hydro insulation fields to be zero in the compatibility package;
- `HYDRO_PRESSURE -> PRESSURE1`;
- L1 load-case settings to replace any old L13 settings inside the assembly alias;
- source ACCDB identity to remain unchanged while transformed-model identity changes.

## Sensitivity

L1 now participates in the same predeclared `0.5x / 1x / 2x` `FRICT_STIF` sensitivity as L13/L7. Only nominal `1x` governs qualification. Non-nominal failures remain diagnostic-only.

## Independent exact-data corroboration

PR #1087 independently reports a clean-current-head local production run against the exact issue-pinned `e21b...` ACCDB. Its review receipt records:

```text
L13  0 literal failures; nonlinear/equilibrium/determinism PASS
L7   0 literal failures; nonlinear/equilibrium/determinism PASS
L15  0 literal failures; exact L7-L13; no independent solve
L1   0 literal failures; HYD WW+HP nonlinear/equilibrium/determinism PASS
RCA  L13-L6, L7-L5, L15-L14: 0 failures
controls: 46 retained external literal failures, 0 restraint failures
sensitivity 0.5x/1x/2x: zero diagnostic solve failures
```

Receipt: PR #1087 review comment `4919929896`, created `2026-08-12T18:35:28Z`; current cited PR head `d8677297cc986b913ebdbb3bcbb3e4a11a103782`.

This is retained in `m047-bm4l-independent-production-corroboration.json` as **independent corroboration only**. It does not claim PR #1085 has itself executed the binary; #1085's own qualification must still be produced by `scripts/lfea-m047-bm4l-friction-qualification.mjs` against the pinned file.

## Governed local command

```powershell
node scripts/lfea-m047-bm4l-friction-qualification.mjs `
  --accdb "C:\path\to\BM4_L.ACCDB" `
  --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json `
  --friction-profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-friction-solver.profile.json `
  --actual-out reports/m047-bm4l-friction-actual.json `
  --evidence-out reports/m047-bm4l-friction-evidence.json
```

A governed PASS requires the pinned source-custody gate, zero frozen-control restraint failures, zero L13/L7/L15/L1 restraint failures, and PASS nonlinear mechanics. Stress, lift-off and one-directional contact remain outside #1083.
