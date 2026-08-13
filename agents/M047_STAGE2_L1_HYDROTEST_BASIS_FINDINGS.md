# M047 Stage 2 — L1 hydrotest basis findings and next measured batches

Status: **audit complete enough to measure; no production promotion in this note**.

Entering baseline: production friction solver `CAESAR-ACCDB-FRICTION-SOLVER-R2` (D1), real L1 converged under the governed 800-iteration ceiling, but only 8/23 friction-restraint normals were within ±10%. The nonlinear layer therefore stays frozen while the `WW+HP` linear basis is audited.

## Frozen rules for these batches

- Real pinned `BM4_L.ACCDB` is the only accuracy source.
- Run controls before any promotion.
- One mechanics change per batch.
- D1 direction, Coulomb cap, friction stiffness, convergence gates, tolerances and comparison rules do not move.
- An experiment script may synthesize one input mutation to discriminate a mechanism; that mutation is not source truth and cannot itself be promoted.
- Accuracy numbers are not published unless the corresponding real-file artifact is committed under `reports/`.

## H1 — HYD insulation exclusion

**Finding.** The current ordinary-span `physicalLineWeight()` always adds `INSUL_THICK × INSUL_DENSITY`, including when `WW` has selected the hydrotest contents-density override. Rigid and reducer gravity paths likewise receive the model insulation declaration.

CAESAR II v14 documents `Include Insulation in Hydrotest` as controlling insulation/cladding participation in HYD cases; `False` is the documented default, and with `False` a HYD `WW` case excludes insulation/cladding. The pinned load-case report proves L1 is `CASE 1 (HYD) WW+HP` but does not print this file-level setting, so the default is a **discriminator authority**, not yet a file-specific fact.

The pinned misc report shows the operating-model center-of-gravity inventory contains 15,948.7 N of insulation, so the term is materially nonzero and deserves direct measurement.

**Experiment:** `scripts/lfea-m047-stage2-l1-hydrotest-insulation-experiment.mjs`

The variant changes exactly one extracted field before package construction: every nonzero `INPUT_BASIC_ELEMENT_DATA.INSUL_THICK` becomes zero. HP, test-water density and all nonlinear mechanics remain unchanged. The record carries `promotionEligible: false`.

Run:

```bash
node scripts/lfea-m047-stage2-l1-hydrotest-insulation-experiment.mjs \
  --accdb <BM4_L.ACCDB> \
  --out reports/lfea-m047-stage2-l1-h1-hydrotest-insulation.json
```

Interpretation:

- If H1 materially repairs L1 normals without breaking convergence/equilibrium, add an explicit governed hydrotest-insulation authority to the production profile/solver and re-run the real file plus controls before promotion.
- If H1 is neutral or worse, reject it; do not combine it with H2 to rescue the number.

## H2 — WW contents-density routing is inconsistent by element type

**Finding.** The current L1 hydrotest water substitution is not routed through every gravity builder:

- ordinary frame spans call `physicalLineWeight(..., caseMode.contentsDensityKgPerM3)` and therefore use the declared 1000 kg/m³ hydrotest density;
- `buildRigidElement()` passes `density(row.FLUID_DENSITY)` to the CAESAR rigid-element gravity authority;
- `buildReducerElement()` passes `density(row.FLUID_DENSITY)` to the condensed-reducer gravity authority.

Therefore one `WW` case can currently use hydrotest water on ordinary spans while retaining operating-fluid density on rigid/reducer source elements. The rigid-element authority explicitly adds fluid weight to entered rigid weight when physical rigid weight is active, so this routing difference can enter equilibrium directly.

**Experiment:** `scripts/lfea-m047-stage2-l1-hydrotest-fluid-routing-experiment.mjs`

The variant changes exactly one extracted field and only on rigid/reducer source rows: `FLUID_DENSITY` is set to the profile's declared hydrotest water density in the ACCDB storage basis. `HYDRO_PRESSURE`, `INSUL_THICK`, D1 and all solver gates stay invariant. The record carries `promotionEligible: false`.

Run:

```bash
node scripts/lfea-m047-stage2-l1-hydrotest-fluid-routing-experiment.mjs \
  --accdb <BM4_L.ACCDB> \
  --out reports/lfea-m047-stage2-l1-h2-hydrotest-fluid-routing.json
```

Interpretation:

- If H2 materially repairs normals, production should route `caseMode.contentsDensityKgPerM3` into the rigid/reducer gravity requests directly rather than mutating source rows.
- H2 must be judged separately against the unchanged baseline. It must not inherit H1 unless H1 has already been independently promoted.

## Pressure-path audit — rejected as the L1 basis defect

The HP side is already routed consistently in the current solver:

- L1 resolves `pressureField = HYDRO_PRESSURE`;
- straight-pipe closed-end pressure strain reads `caseMode.pressureField`;
- rigid Bourdon pressure reads `caseMode.pressureField`;
- reducer pressure free elongation reads `caseMode.pressureField`;
- bend pressure stiffening explicitly overrides the profile's ordinary `P1` source when the active case pressure field is `HYDRO_PRESSURE`.

So the earlier possibility that L1 bends were accidentally stiffened with operating P1 is rejected by code inspection and should not consume a measurement batch.

## Required batch order

1. Run frozen controls.
2. Run H1 baseline/variant and commit the real-file artifact.
3. Return to the same frozen baseline; run H2 baseline/variant and commit the real-file artifact.
4. Promote at most one supported mechanic at a time, re-run controls and L1 after each promotion.
5. Only after the L1 normal basis is qualified resume L1 friction/regime attribution.
6. Keep R7 (case-history dependence) separate for the L13/L7 tangential gap; do not use L1 to tune R7 while its linear basis remains unresolved.

## Sources retained by the branch

- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`
- `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`
- `src/core/linear-fea-rigid-element/rigid-element.js`
- pinned `Common/LFEA/BM4/Loadcasereport_BM4_L.txt`
- pinned `Common/LFEA/BM4/Miscdata_BM4_L.txt`
- Hexagon CAESAR II v14 help: `Include Insulation in Hydrotest`, `Loads Defined in Input`
